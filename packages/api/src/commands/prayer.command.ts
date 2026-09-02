import { Injectable } from '@nestjs/common';
import type {
  SessionCommand,
  SessionCommandContext,
  SessionCommandResult,
} from './session-command.js';
import { WorkspaceService } from '../workspace/workspace.service.js';

const USAGE = "Usage: /prayer <your request> — e.g. /prayer Please pray for my mother's surgery.";

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'anonymous';
}

@Injectable()
export class PrayerCommand implements SessionCommand {
  readonly name = 'prayer';
  readonly description = 'Submit a prayer request for the intercessory team to review';

  constructor(private readonly workspaceService: WorkspaceService) {}

  async execute(ctx: SessionCommandContext): Promise<SessionCommandResult> {
    const request = ctx.args?.trim();
    if (!request) {
      return { text: USAGE };
    }

    const submittedAt = new Date().toISOString();
    const slug = slugify(ctx.senderId);
    const filename = `${submittedAt.replace(/[:.]/g, '-')}-${slug}.md`;

    const content = `---
submittedBy: ${ctx.senderId}
channel: ${ctx.channelId}
submittedAt: ${submittedAt}
status: new
---

${request}
`;

    await this.workspaceService.uploadFile(
      ctx.userId,
      '/prayer-requests/new',
      filename,
      Buffer.from(content, 'utf-8'),
      false,
      null,
      ctx.role,
      ctx.department,
    );

    return {
      text: 'Prayer request received. Thank you for sharing — the team will be praying.',
    };
  }
}
