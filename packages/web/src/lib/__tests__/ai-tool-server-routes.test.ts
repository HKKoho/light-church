import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/lib/auth', () => ({ authFetch: vi.fn() }));

import { authFetch } from '@/lib/auth';
import { handleToolServerRequest } from '../ai-tool-server-routes';
import { TOOL_SERVER_UNAVAILABLE } from '../ai-tool-storage-bridge';

const mockAuthFetch = authFetch as Mock;

describe('handleToolServerRequest', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('archives past bulletins for the Sunday Service Bulletin tool', async () => {
    mockAuthFetch.mockResolvedValue({ success: true, data: { archived: 2, duplicates: 1 } });
    const body = JSON.stringify({ churchName: 'LC', files: [] });

    const res = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/analyze-bulletins',
      method: 'POST',
      body,
    });

    expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/bulletin-archive', {
      method: 'POST',
      body,
    });
    expect(res.notice).toEqual({ kind: 'bulletinsArchived', archived: 2, duplicates: 1 });
    expect(res.status).toBe(503); // analysis itself is not enabled yet
  });

  it('refuses routes a tool is not allowed to call', async () => {
    for (const [tool, method, url] of [
      ['roll-call', 'POST', '/api/analyze-bulletins'],
      ['sunday-service-bulletin', 'GET', '/api/analyze-bulletins'],
      ['sunday-service-bulletin', 'POST', '/api/v1/users'],
    ] as const) {
      const res = await handleToolServerRequest(tool, { url, method, body: '{}' });
      expect(res.status).toBe(503);
      expect((JSON.parse(res.body) as { error: string }).error).toBe(TOOL_SERVER_UNAVAILABLE);
    }
    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  it('reports API failures back to the tool as a 502', async () => {
    mockAuthFetch.mockRejectedValue(new Error('"a.pdf" is not a PDF'));
    const res = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/analyze-bulletins',
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(502);
    expect(res.notice).toBeUndefined();
  });
});
