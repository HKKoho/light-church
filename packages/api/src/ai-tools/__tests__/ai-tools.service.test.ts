// packages/api/src/ai-tools/__tests__/ai-tools.service.test.ts
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'crypto';

import { AiToolsService } from '../ai-tools.service.js';

describe('AiToolsService', () => {
  let base: string;
  let toolsDir: string;
  let service: AiToolsService;
  const originalBase = process.env['WORKSPACE_BASE_PATH'];

  beforeEach(async () => {
    base = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-tools-'));
    toolsDir = path.join(base, 'AITools');
    process.env['WORKSPACE_BASE_PATH'] = base;
    service = new AiToolsService();
  });

  afterEach(async () => {
    if (originalBase === undefined) delete process.env['WORKSPACE_BASE_PATH'];
    else process.env['WORKSPACE_BASE_PATH'] = originalBase;
    await fs.rm(base, { recursive: true, force: true });
  });

  const writeTool = async (name: string, files: Record<string, string>) => {
    await fs.mkdir(path.join(toolsDir, name), { recursive: true });
    for (const [file, content] of Object.entries(files)) {
      await fs.writeFile(path.join(toolsDir, name, file), content);
    }
  };

  it('returns an empty list and creates the AITools directory when missing', async () => {
    await expect(service.list('guest')).resolves.toEqual([]);
    await expect(fs.stat(toolsDir)).resolves.toBeDefined();
  });

  it('lists html and link tools sorted by name, skipping invalid folders', async () => {
    await writeTool('Sermon Helper', {
      'index.html': '<h1>hi</h1>',
      'tool.json': JSON.stringify({ description: 'Outlines' }),
    });
    await writeTool('Bible Chat', {
      'tool.json': JSON.stringify({ url: 'https://example.org' }),
    });
    await writeTool('empty', {});
    await writeTool('.hidden', { 'index.html': 'x' });
    await writeTool('bad-link', { 'tool.json': JSON.stringify({ url: 'javascript:alert(1)' }) });

    await expect(service.list('guest')).resolves.toEqual([
      {
        name: 'Bible Chat',
        displayName: null,
        kind: 'link',
        description: null,
        descriptions: null,
        url: 'https://example.org',
        sso: false,
      },
      {
        name: 'Sermon Helper',
        displayName: null,
        kind: 'html',
        description: 'Outlines',
        descriptions: null,
        url: null,
        sso: false,
      },
    ]);
  });

  it('keeps an html tool visible when its tool.json is malformed', async () => {
    await writeTool('講道助手', { 'index.html': '<p/>', 'tool.json': '{not json' });
    await expect(service.list('guest')).resolves.toEqual([
      {
        name: '講道助手',
        displayName: null,
        kind: 'html',
        description: null,
        descriptions: null,
        url: null,
        sso: false,
      },
    ]);
  });

  it('reads per-language display names from tool.json', async () => {
    await writeTool('roll-call', {
      'index.html': '<p/>',
      'tool.json': JSON.stringify({ displayName: { en: 'Roll Call', 'zh-TW': '點名' } }),
    });
    await writeTool('en-only', {
      'index.html': '<p/>',
      'tool.json': JSON.stringify({ displayName: { en: 'English Only' } }),
    });
    const [enOnly, rollCall] = await service.list('guest');
    expect(rollCall?.displayName).toEqual({ en: 'Roll Call', 'zh-TW': '點名' });
    expect(enOnly?.displayName).toEqual({ en: 'English Only', 'zh-TW': null });
  });

  it('reads per-language descriptions, using English as the plain fallback', async () => {
    await writeTool('bulletin', {
      'index.html': '<p/>',
      'tool.json': JSON.stringify({
        description: { en: 'Edit the bulletin', 'zh-TW': '編輯週刊' },
      }),
    });
    const [tool] = await service.list('guest');
    expect(tool?.description).toBe('Edit the bulletin');
    expect(tool?.descriptions).toEqual({ en: 'Edit the bulletin', 'zh-TW': '編輯週刊' });
  });

  it('returns the html for a tool', async () => {
    await writeTool('Quiz', { 'index.html': '<p>quiz</p>' });
    await expect(service.get('Quiz', 'guest')).resolves.toMatchObject({
      kind: 'html',
      html: '<p>quiz</p>',
    });
  });

  it('throws NotFound for an unknown tool and BadRequest for a traversal name', async () => {
    await expect(service.get('Nope', 'guest')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get('../secrets', 'guest')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads an html file as <name>/index.html', async () => {
    const tool = await service.upload('Prayer Board', 'board.html', Buffer.from('<p>x</p>'));
    expect(tool).toEqual({
      name: 'Prayer Board',
      displayName: null,
      kind: 'html',
      description: null,
      descriptions: null,
      url: null,
      sso: false,
    });
    await expect(
      fs.readFile(path.join(toolsDir, 'Prayer Board', 'index.html'), 'utf-8'),
    ).resolves.toBe('<p>x</p>');
  });

  it('rejects non-html uploads, oversize files and invalid names', async () => {
    await expect(service.upload('Tool', 'x.exe', Buffer.from('x'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.upload('Tool', 'x.html', Buffer.alloc(2 * 1024 * 1024 + 1)),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload('a/b', 'x.html', Buffer.from('x'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  describe('per-user storage', () => {
    const userId = 'cku1abc2def3';

    it('returns an empty store, then round-trips saved data per user', async () => {
      await writeTool('RollCall', { 'index.html': '<p/>' });
      await expect(service.getStorage('RollCall', userId, 'guest')).resolves.toEqual({});

      await service.putStorage('RollCall', userId, 'guest', {
        rollCallSystemTemp: '{"members":[]}',
      });
      await expect(service.getStorage('RollCall', userId, 'guest')).resolves.toEqual({
        rollCallSystemTemp: '{"members":[]}',
      });
      await expect(service.getStorage('RollCall', 'otheruser1', 'guest')).resolves.toEqual({});
    });

    it('keeps storage outside the shared AITools directory', async () => {
      await writeTool('RollCall', { 'index.html': '<p/>' });
      await service.putStorage('RollCall', userId, 'guest', { k: 'v' });
      await expect(
        fs.readFile(path.join(base, 'AITools-data', userId, 'RollCall.json'), 'utf-8'),
      ).resolves.toBe('{"k":"v"}');
      await expect(service.list('guest')).resolves.toHaveLength(1);
    });

    it('404s for unknown tools and rejects unsafe user ids', async () => {
      await expect(service.getStorage('Nope', userId, 'guest')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await writeTool('RollCall', { 'index.html': '<p/>' });
      await expect(service.putStorage('RollCall', '../x', 'guest', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('treats a corrupt storage file as empty', async () => {
      await writeTool('RollCall', { 'index.html': '<p/>' });
      await fs.mkdir(path.join(base, 'AITools-data', userId), { recursive: true });
      await fs.writeFile(path.join(base, 'AITools-data', userId, 'RollCall.json'), '{oops');
      await expect(service.getStorage('RollCall', userId, 'guest')).resolves.toEqual({});
    });
  });

  describe('roles and single sign-on', () => {
    const finance = {
      url: 'http://localhost:3030',
      roles: ['finadmin', 'super_admin'],
      sso: {
        secretEnv: 'TEST_TOOL_SSO_SECRET',
        path: '/api/auth/sso',
        audience: 'finance-pipeline',
      },
    };
    const finadmin = { sub: 'u1', email: 'fin@church.test', role: 'finadmin' };
    const originalSecret = process.env['TEST_TOOL_SSO_SECRET'];
    afterEach(() => {
      if (originalSecret === undefined) delete process.env['TEST_TOOL_SSO_SECRET'];
      else process.env['TEST_TOOL_SSO_SECRET'] = originalSecret;
    });

    it('shows a role-restricted tool only to the listed roles', async () => {
      await writeTool('finance-pipeline', { 'tool.json': JSON.stringify(finance) });
      await writeTool('open-tool', { 'index.html': '<p/>' });
      expect((await service.list('finadmin')).map((t) => t.name)).toEqual([
        'finance-pipeline',
        'open-tool',
      ]);
      expect((await service.list('volunteer')).map((t) => t.name)).toEqual(['open-tool']);
      await expect(service.get('finance-pipeline', 'volunteer')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.get('finance-pipeline', 'finadmin')).resolves.toMatchObject({
        kind: 'link',
        sso: true,
      });
    });

    it('signs a 60-second hand-off the receiving app can verify', async () => {
      const secret = 'x'.repeat(40);
      process.env['TEST_TOOL_SSO_SECRET'] = secret;
      await writeTool('finance-pipeline', { 'tool.json': JSON.stringify(finance) });

      const { action, token } = await service.ssoLaunch('finance-pipeline', finadmin);
      expect(action).toBe('http://localhost:3030/api/auth/sso');
      const [payload, signature] = token.split('.');
      const expected = createHmac('sha256', secret)
        .update(payload ?? '')
        .digest('base64url');
      expect(signature).toBe(expected);
      const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as Record<
        string,
        unknown
      >;
      expect(claims).toMatchObject({
        email: 'fin@church.test',
        role: 'finadmin',
        aud: 'finance-pipeline',
      });
      expect((claims['exp'] as number) - (claims['iat'] as number)).toBe(60_000);
      expect(typeof claims['jti']).toBe('string');
    });

    it('refuses other roles, and reports an unset secret instead of signing', async () => {
      await writeTool('finance-pipeline', { 'tool.json': JSON.stringify(finance) });
      await expect(
        service.ssoLaunch('finance-pipeline', { ...finadmin, role: 'volunteer' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      delete process.env['TEST_TOOL_SSO_SECRET'];
      await expect(service.ssoLaunch('finance-pipeline', finadmin)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('ignores an sso block that points at a non-SSO secret', async () => {
      await writeTool('sneaky', {
        'tool.json': JSON.stringify({
          url: 'https://evil.example',
          sso: { secretEnv: 'JWT_SECRET', path: '/x', audience: 'x' },
        }),
      });
      await expect(service.ssoLaunch('sneaky', finadmin)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('removes a tool folder, and 404s when it does not exist', async () => {
    await writeTool('Old', { 'index.html': 'x' });
    await service.remove('Old');
    await expect(service.list('guest')).resolves.toEqual([]);
    await expect(service.remove('Old')).rejects.toBeInstanceOf(NotFoundException);
  });
});
