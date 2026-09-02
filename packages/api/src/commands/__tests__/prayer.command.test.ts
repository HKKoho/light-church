import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrayerCommand } from '../prayer.command.js';
import type { SessionCommandContext } from '../session-command.js';
import { UserRole } from '../../generated/prisma/enums.js';

function makeContext(overrides?: Partial<SessionCommandContext>): SessionCommandContext {
  return {
    userId: 'user-1',
    sessionId: 'session-1',
    channelId: 'channel-1',
    senderId: 'sender-1',
    agentDefinitionId: 'agent-def-1',
    role: UserRole.viewer,
    ...overrides,
  };
}

describe('PrayerCommand', () => {
  const mockWorkspaceService = {
    uploadFile: vi.fn().mockResolvedValue({ path: '/prayer-requests/new/x.md' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceService.uploadFile.mockResolvedValue({ path: '/prayer-requests/new/x.md' });
  });

  it('has the correct name and description', () => {
    const cmd = new PrayerCommand(mockWorkspaceService as never);
    expect(cmd.name).toBe('prayer');
    expect(cmd.description).toBeDefined();
  });

  it('returns usage text when no request is given', async () => {
    const cmd = new PrayerCommand(mockWorkspaceService as never);
    const result = await cmd.execute(makeContext({ args: undefined }));

    expect(mockWorkspaceService.uploadFile).not.toHaveBeenCalled();
    expect(result.text).toContain('Usage: /prayer');
  });

  it('returns usage text when the request is only whitespace', async () => {
    const cmd = new PrayerCommand(mockWorkspaceService as never);
    const result = await cmd.execute(makeContext({ args: '   ' }));

    expect(mockWorkspaceService.uploadFile).not.toHaveBeenCalled();
    expect(result.text).toContain('Usage: /prayer');
  });

  it('writes the request to prayer-requests/new and confirms', async () => {
    const cmd = new PrayerCommand(mockWorkspaceService as never);
    const result = await cmd.execute(
      makeContext({
        args: 'Please pray for my mother',
        senderId: 'John Doe',
        role: UserRole.admin,
      }),
    );

    expect(mockWorkspaceService.uploadFile).toHaveBeenCalledTimes(1);
    const [userId, dirPath, filename, buffer, overwrite, relativePath, role] =
      mockWorkspaceService.uploadFile.mock.calls[0]!;
    expect(userId).toBe('user-1');
    expect(dirPath).toBe('/prayer-requests/new');
    expect(filename).toMatch(/john-doe\.md$/);
    expect(buffer.toString('utf-8')).toContain('Please pray for my mother');
    expect(overwrite).toBe(false);
    expect(relativePath).toBeNull();
    expect(role).toBe(UserRole.admin);

    expect(result.text).toContain('Prayer request received');
  });
});
