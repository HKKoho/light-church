cd# Porting "Provider API Account Settings" to another Clawix app

Source: this repo (`clawix`, branch `feat/mcp-catalog`), the admin **Settings → Providers**
feature — an encrypted, DB-backed store of LLM provider API keys (Anthropic, OpenAI,
Gemini, Z.AI, Kimi, or any custom OpenAI-compatible endpoint) with env-var fallback and a
60s in-memory resolve cache.

This assumes the target app is also a NestJS(Fastify) + Prisma/Postgres API paired with a
Next.js dashboard, and already has: JWT auth, a `UserRole` enum with an `admin` role, a
global `RolesGuard` + `@Roles()` decorator, a Zod validation pipe, and an `authFetch` helper
on the web side. If any of those are missing, build the equivalent first — everything below
assumes they exist.

## 1. Prisma schema

Add the model (org-level, one row per provider):

```prisma
model ProviderConfig {
  id          String   @id @default(cuid())
  provider    String   @unique // "anthropic", "openai", "zai-coding", "custom-xxx"
  displayName String
  apiKey      String   // encrypted at rest (AES-256-GCM)
  apiBaseUrl  String?  // override endpoint
  isEnabled   Boolean  @default(true)
  isDefault   Boolean  @default(false)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Run the migration:

```bash
pnpm db:migrate   # or: prisma migrate dev --name add_provider_config
```

## 2. Shared package — schemas + provider registry

`packages/shared/src/schemas/provider-config.schema.ts`:

```ts
import { z } from 'zod';

export const createProviderConfigSchema = z.object({
  provider: z
    .string()
    .min(1, 'provider is required')
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'provider must be lowercase alphanumeric with hyphens'),
  displayName: z.string().min(1, 'displayName is required').max(128),
  apiKey: z.string().min(1, 'apiKey is required'),
  apiBaseUrl: z.string().url('apiBaseUrl must be a valid URL').optional(),
  isEnabled: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional().default(0),
});
export type CreateProviderConfigInput = z.infer<typeof createProviderConfigSchema>;

export const updateProviderConfigSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  apiKey: z.string().min(1).optional(),
  apiBaseUrl: z.string().url('apiBaseUrl must be a valid URL').nullable().optional(),
  isEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateProviderConfigInput = z.infer<typeof updateProviderConfigSchema>;
```

Export both from `packages/shared/src/schemas/index.ts`.

If the target app doesn't already have a provider registry (a lookup table of known LLM
providers with default base URLs / env var names / pricing), port
`packages/shared/src/providers/provider-registry.ts` too — `ProviderConfigService` calls
`findProviderByName()` for the env-var fallback and default base URL lookups. At minimum it
needs a `findProviderByName(name)` that returns `{ envKey, defaultBaseUrl? }` for the
providers you support; trim the pricing tables if the target app doesn't do cost estimation.

## 3. Encryption utility

`packages/api/src/common/crypto.ts` (copy verbatim — it's self-contained, only depends on
Node's `crypto`):

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env['PROVIDER_ENCRYPTION_KEY'];
  if (!keyHex || keyHex.length === 0) {
    throw new Error(
      'PROVIDER_ENCRYPTION_KEY is required. Set a 64-character hex string (32 bytes).',
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `PROVIDER_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes); got ${keyHex.length}.`,
    );
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivB64, encB64, tagB64] = ciphertext.split(':');
  if (!ivB64 || !encB64 || !tagB64) {
    throw new Error('Invalid ciphertext format — expected iv:ciphertext:authTag');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// Provider-agnostic masking: keep first/last 4 chars so distinct keys stay distinguishable.
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
```

If the target app already has an AES-256-GCM helper for other secrets (channel tokens,
etc.), reuse its `encrypt`/`decrypt` instead of duplicating this file — just make sure it
uses its own env var name (don't silently reuse a key meant for something else).

## 4. Env var

Add to `.env.example` and `.env`:

```bash
# Required: encryption key for stored provider keys (AES-256-GCM)
# Generate with: openssl rand -hex 32
PROVIDER_ENCRYPTION_KEY=<64-char-hex-string>
```

Make prod startup fail fast if it's unset (mirror however the target app already fails fast
on `JWT_SECRET`/`DATABASE_URL`, if it does).

Optionally port `scripts/encrypt-secret.mjs` — a standalone CLI (no deps beyond
`node:crypto`) that reads `PROVIDER_ENCRYPTION_KEY` from `.env` and encrypts a value for
manual DB inserts:

```bash
node scripts/encrypt-secret.mjs "sk-your-api-key"
echo "sk-your-api-key" | node scripts/encrypt-secret.mjs
```

## 5. API module

`packages/api/src/provider-config/provider-config.service.ts` — resolve priority is
**DB (enabled) → env var fallback → throw**, plus a 60s in-process cache keyed by provider
name so hot paths don't decrypt on every call:

```ts
import { Injectable } from '@nestjs/common';
import { createLogger, findProviderByName } from '@clawix/shared';
import type { CreateProviderConfigInput, UpdateProviderConfigInput } from '@clawix/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { encrypt, decrypt, maskApiKey } from '../common/crypto.js';

const logger = createLogger('provider-config');
const CACHE_TTL_MS = 60_000;

interface CachedEntry {
  apiKey: string;
  apiBaseUrl: string | null;
  expiresAt: number;
}
export interface MaskedProviderConfig {
  id: string;
  provider: string;
  displayName: string;
  apiKey: string;
  apiBaseUrl: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProviderConfigService {
  private readonly cache = new Map<string, CachedEntry>();
  constructor(private readonly prisma: PrismaService) {}

  async resolveProvider(providerName: string) {
    const cached = this.cache.get(providerName);
    if (cached && cached.expiresAt > Date.now()) {
      return { apiKey: cached.apiKey, apiBaseUrl: cached.apiBaseUrl };
    }
    const config = await this.prisma.providerConfig.findUnique({
      where: { provider: providerName },
    });
    if (config && config.isEnabled) {
      const decryptedKey = decrypt(config.apiKey);
      this.cache.set(providerName, {
        apiKey: decryptedKey,
        apiBaseUrl: config.apiBaseUrl,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return { apiKey: decryptedKey, apiBaseUrl: config.apiBaseUrl };
    }
    const spec = findProviderByName(providerName);
    const envKey = spec?.envKey ?? `${providerName.toUpperCase().replace(/-/g, '_')}_API_KEY`;
    const envValue = process.env[envKey];
    if (envValue) return { apiKey: envValue, apiBaseUrl: null };
    throw new Error(
      `No provider config found for "${providerName}". Add it via the admin API or set ${envKey}.`,
    );
  }

  async getDefaultProviderName() {
    const config = await this.prisma.providerConfig.findMany({
      where: { isDefault: true, isEnabled: true },
      take: 1,
    });
    return config[0]?.provider ?? null;
  }

  async findAll(): Promise<readonly MaskedProviderConfig[]> {
    const configs = await this.prisma.providerConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    });
    return configs.map((c) => {
      let maskedKey: string;
      try {
        maskedKey = maskApiKey(decrypt(c.apiKey));
      } catch {
        maskedKey = '****';
      }
      return { ...c, apiKey: maskedKey };
    });
  }

  async findByProvider(providerName: string) {
    const config = await this.prisma.providerConfig.findUnique({
      where: { provider: providerName },
    });
    if (!config) return null;
    let maskedKey: string;
    try {
      maskedKey = maskApiKey(decrypt(config.apiKey));
    } catch {
      maskedKey = '****';
    }
    return { ...config, apiKey: maskedKey };
  }

  async create(input: CreateProviderConfigInput) {
    if (input.isDefault) {
      const existingDefaults = await this.prisma.providerConfig.count({
        where: { isDefault: true },
      });
      if (existingDefaults > 0) {
        await this.prisma.providerConfig.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
    }
    const config = await this.prisma.providerConfig.create({
      data: {
        provider: input.provider,
        displayName: input.displayName,
        apiKey: encrypt(input.apiKey),
        apiBaseUrl: input.apiBaseUrl ?? null,
        isEnabled: input.isEnabled ?? true,
        isDefault: input.isDefault ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    this.invalidateCache(config.provider);
    return { ...config, apiKey: maskApiKey(input.apiKey) };
  }

  async update(providerName: string, input: UpdateProviderConfigInput) {
    if (input.isDefault === true) {
      await this.prisma.providerConfig.updateMany({
        where: { isDefault: true, provider: { not: providerName } },
        data: { isDefault: false },
      });
    }
    const data: Record<string, unknown> = { ...input };
    if (input.apiKey) data['apiKey'] = encrypt(input.apiKey);
    const config = await this.prisma.providerConfig.update({
      where: { provider: providerName },
      data,
    });
    this.invalidateCache(providerName);
    const maskedKey = input.apiKey ? maskApiKey(input.apiKey) : maskApiKey(decrypt(config.apiKey));
    return { ...config, apiKey: maskedKey };
  }

  async remove(providerName: string) {
    await this.prisma.providerConfig.delete({ where: { provider: providerName } });
    this.invalidateCache(providerName);
  }

  // Auto-seed DB from env vars on first boot — only when the table is empty.
  async seedFromEnv() {
    const count = await this.prisma.providerConfig.count();
    if (count > 0) return;
    const seedMap = [
      { provider: 'anthropic', displayName: 'Anthropic', envKey: 'ANTHROPIC_API_KEY' },
      { provider: 'openai', displayName: 'OpenAI', envKey: 'OPENAI_API_KEY' },
      // add/remove entries to match the providers YOUR app supports
    ];
    let isFirst = true;
    for (const { provider, displayName, envKey } of seedMap) {
      const apiKey = process.env[envKey];
      if (apiKey) {
        const spec = findProviderByName(provider);
        await this.prisma.providerConfig.create({
          data: {
            provider,
            displayName,
            apiKey: encrypt(apiKey),
            apiBaseUrl: spec?.defaultBaseUrl ?? null,
            isEnabled: true,
            isDefault: isFirst,
            sortOrder: 0,
          },
        });
        isFirst = false;
      }
    }
  }

  private invalidateCache(providerName: string) {
    this.cache.delete(providerName);
  }
}
```

`packages/api/src/provider-config/provider-config.controller.ts` — admin CRUD, `Roles(admin)`
gated:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { createProviderConfigSchema, updateProviderConfigSchema } from '@clawix/shared';
import type { CreateProviderConfigInput, UpdateProviderConfigInput } from '@clawix/shared';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ProviderConfigService } from './provider-config.service.js';

@Controller('admin/providers')
@Roles(UserRole.admin)
export class ProviderConfigController {
  constructor(private readonly providerConfigService: ProviderConfigService) {}

  @Get() findAll() {
    return this.providerConfigService.findAll();
  }
  @Get(':provider') findOne(@Param('provider') provider: string) {
    return this.providerConfigService.findByProvider(provider);
  }
  @Post() create(
    @Body(new ZodValidationPipe(createProviderConfigSchema)) body: CreateProviderConfigInput,
  ) {
    return this.providerConfigService.create(body);
  }
  @Patch(':provider') update(
    @Param('provider') provider: string,
    @Body(new ZodValidationPipe(updateProviderConfigSchema)) body: UpdateProviderConfigInput,
  ) {
    return this.providerConfigService.update(provider, body);
  }
  @Delete(':provider') remove(@Param('provider') provider: string) {
    return this.providerConfigService.remove(provider);
  }
}
```

`packages/api/src/provider-config/providers.controller.ts` — **public**, unauthenticated,
non-secret listing (used by other authenticated screens, e.g. a policy editor's provider
picker, and by any login-time "which providers are available" UI):

```ts
import { Controller, Get } from '@nestjs/common';
import { listProviders } from '@clawix/shared';
import { ProviderConfigService } from './provider-config.service.js';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providerConfigService: ProviderConfigService) {}

  @Get()
  async listEnabled() {
    const configs = await this.providerConfigService.findAll();
    const enabledConfigs = configs.filter((c) => c.isEnabled);
    const registrySpecs = listProviders();
    return enabledConfigs.map((c) => {
      const spec = registrySpecs.find((s) => s.name === c.provider);
      return {
        provider: c.provider,
        displayName: c.displayName,
        isDefault: c.isDefault,
        supportsTools: spec?.supportsTools ?? false,
        supportsThinking: spec?.supportsThinking ?? false,
        defaultModel: spec?.defaultModel ?? null,
      };
    });
  }
}
```

> If your target app's global auth guard denies-by-default on missing `@Roles()`, this
> controller needs an explicit `@Public()`/skip-auth decorator instead of just omitting
> `@Roles()` — check how the app's `RolesGuard`/`JwtAuthGuard` decide unguarded routes.

`packages/api/src/provider-config/provider-config.module.ts` — seeds from env on boot:

```ts
import { Module, type OnModuleInit } from '@nestjs/common';
import { ProviderConfigController } from './provider-config.controller.js';
import { ProvidersController } from './providers.controller.js';
import { ProviderConfigService } from './provider-config.service.js';

@Module({
  controllers: [ProviderConfigController, ProvidersController],
  providers: [ProviderConfigService],
  exports: [ProviderConfigService],
})
export class ProviderConfigModule implements OnModuleInit {
  constructor(private readonly providerConfigService: ProviderConfigService) {}
  async onModuleInit() {
    await this.providerConfigService.seedFromEnv();
  }
}
```

Register it in `app.module.ts`'s `imports: [...]`.

## 6. Wire it into the LLM call path

Wherever the target app currently instantiates an LLM client from an env var, insert a call
to `ProviderConfigService.resolveProvider(providerName)` first, e.g.:

```ts
const { apiKey, apiBaseUrl } = await providerConfigService.resolveProvider(providerName);
const client = createProvider(providerName, apiKey, apiBaseUrl ?? undefined, model);
```

This repo's version lives in `packages/api/src/engine/providers/provider-factory.ts`
(`createProvider(providerName, apiKey, baseURL?, model?)`) — the factory itself stays
provider-key-agnostic; only the _caller_ resolves the key via `ProviderConfigService` before
invoking it. If the target app has its own equivalent factory, keep that pattern:
`ProviderConfigService` never leaks into the provider SDK wrapper classes.

## 7. Admin web UI

Dashboard route `settings/providers/page.tsx`:

```tsx
'use client';
import { ProvidersTab } from '../providers-tab';

export default function ProvidersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
        <p className="text-sm text-muted-foreground">
          Manage AI provider API keys and configurations.
        </p>
      </div>
      <ProvidersTab />
    </div>
  );
}
```

Port `settings/providers-tab.tsx` (table: provider/displayName, masked key, base URL,
default star toggle, enabled switch, edit/remove dropdown; calls `/admin/providers` via
`authFetch`) and `settings/providers-dialogs.tsx` (Create/Edit dialogs with a
show/hide-password `Input`) from this repo — both are self-contained aside from the shared
`ui/*` components (`Table`, `Badge`, `Switch`, `DropdownMenu`, `AlertDialog`, `Dialog`,
`Input`, `Label`, `Button`) and the `authFetch` fetch wrapper. If the target app's UI kit
differs, keep the component's state machine (fetch → create → toggle-enabled →
set-default → update → delete, each hitting the matching `/admin/providers` route) and
re-skin the JSX.

Add a sidebar entry (this repo: `packages/web/src/components/dashboard/app-sidebar.tsx`):

```ts
{ labelKey: 'nav.providers', href: '/settings/providers', icon: Bot },
```

Add the i18n key `nav.providers` → `"Providers"` (or your app's message-file location) if
the target app is localized; otherwise hardcode the label.

## 8. Verify

1. `pnpm db:migrate` succeeds, `ProviderConfig` table exists.
2. Boot the API with an `ANTHROPIC_API_KEY` (or whichever) set in `.env` and an empty
   table — confirm `seedFromEnv()` creates one row (`isDefault: true`), logged as
   `"Seeded provider config from env var"`.
3. `GET /providers` (no auth) returns the enabled list with masked-out fields only
   (no `apiKey`).
4. `GET /admin/providers` as a non-admin → 403 (RolesGuard); as admin → 200 with `apiKey`
   masked (`AQ.A…wxyz` style, not plaintext).
5. `POST /admin/providers` with a new key → row created, `SELECT apiKey FROM
"ProviderConfig"` in psql shows `iv:ciphertext:authTag`, not plaintext.
6. Toggle `isEnabled` off → confirm `resolveProvider()` falls through to the env var (or
   throws if none) rather than serving the disabled DB key — restart or wait out the 60s
   cache to see the effect if you just wrote it, since `update()` invalidates the cache
   for that provider immediately but a concurrent request mid-flight may already hold
   the old cached value.
7. In the web dashboard, Settings → Providers: add/edit/delete/set-default/toggle round
   trips and the list refreshes.

## Notes / things that don't port 1:1

- **Cache is per-process, in-memory.** If the target app runs multiple API replicas,
  an `update()`/`remove()` on one instance won't invalidate the 60s cache on the others —
  acceptable staleness for a key rotation, but document it (or swap the `Map` for a
  Redis-backed cache with pub/sub invalidation if that matters more there).
- **`PROVIDER_ENCRYPTION_KEY` is not rotatable as-is.** Rotating it requires
  decrypting every `ProviderConfig.apiKey` with the old key and re-encrypting with the
  new one in a migration script — there's no key-versioning in the ciphertext format
  (`iv:ciphertext:authTag`, no key-id prefix).
- **`findProviderByName`/`listProviders`** come from the shared provider registry
  (§2) — only port the subset of `ProviderSpec` entries for providers the target app
  actually supports; the pricing tables are optional and only needed for cost estimation
  elsewhere in that codebase.
