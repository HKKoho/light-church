// packages/api/src/church-site/church-site.roles.ts
import { ForbiddenException } from '@nestjs/common';
import { SITE_ADMIN_ROLES, SITE_EDITOR_ROLES } from '@clawix/shared';

export interface Actor {
  readonly id: string;
  readonly role: string;
}

const ADMINS: ReadonlySet<string> = new Set(SITE_ADMIN_ROLES);
const EDITORS: ReadonlySet<string> = new Set(SITE_EDITOR_ROLES);

/** Import the site, edit its settings and pages. */
export function assertSiteAdmin(actor: Actor): void {
  if (!ADMINS.has(actor.role)) {
    throw new ForbiddenException('Only super admins, senior pastors and admin staff can do this');
  }
}

/** Publish events and media. */
export function assertSiteEditor(actor: Actor): void {
  if (!EDITORS.has(actor.role)) {
    throw new ForbiddenException('Only pastors, ministry leaders and admin staff can do this');
  }
}
