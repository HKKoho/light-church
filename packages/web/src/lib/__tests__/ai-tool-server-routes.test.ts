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

  it('imports past-bulletin PDFs for the Sunday Service Bulletin tool', async () => {
    const result = { archived: 1, duplicates: 1, importing: 2 };
    mockAuthFetch.mockResolvedValue({ success: true, data: result });
    const body = JSON.stringify({ churchName: 'LC', files: [] });

    const res = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/import-bulletins',
      method: 'POST',
      body,
    });

    expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/sunday-bulletins/import', {
      method: 'POST',
      body,
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual(result);
    expect(res.notice).toEqual({ kind: 'bulletinsImported', ...result });
  });

  it('lists and saves the shared bulletins', async () => {
    const list = { bulletins: [{ id: 'b1', title: 't', date: 'd' }], pendingImports: 0 };
    mockAuthFetch.mockResolvedValueOnce({ success: true, data: list });
    const got = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/bulletins',
      method: 'GET',
      body: null,
    });
    expect(mockAuthFetch).toHaveBeenLastCalledWith('/api/v1/sunday-bulletins');
    expect(JSON.parse(got.body)).toEqual(list);

    mockAuthFetch.mockResolvedValueOnce({ success: true, data: { saved: 1, skippedArchived: [] } });
    const body = JSON.stringify({ bulletins: list.bulletins });
    const put = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/bulletins',
      method: 'PUT',
      body,
    });
    expect(mockAuthFetch).toHaveBeenLastCalledWith('/api/v1/sunday-bulletins', {
      method: 'PUT',
      body,
    });
    expect(put.status).toBe(200);
  });

  it('archives a bulletin by id and rejects ids that could change the path', async () => {
    mockAuthFetch.mockResolvedValue({ success: true });
    const res = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/bulletins/archive',
      method: 'POST',
      body: JSON.stringify({ id: 'service-abc_1' }),
    });
    expect(res.status).toBe(200);
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/sunday-bulletins/service-abc_1/archive', {
      method: 'POST',
    });

    mockAuthFetch.mockClear();
    const bad = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/bulletins/archive',
      method: 'POST',
      body: JSON.stringify({ id: '../users' }),
    });
    expect(bad.status).toBe(400);
    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  it('resets the shared bulletins', async () => {
    mockAuthFetch.mockResolvedValue({ success: true, data: { archived: 3 } });
    const res = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/bulletins/reset',
      method: 'POST',
      body: null,
    });
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/sunday-bulletins/reset', { method: 'POST' });
    expect(JSON.parse(res.body)).toEqual({ archived: 3 });
  });

  it('reads a duty roster PDF for the tool', async () => {
    const result = {
      entries: [
        { date: '2026-10-04', section: '主日崇拜事奉芳名表', role: '主席', name: '郭永健弟兄' },
      ],
      notes: ['10月4日：主餐 崇拜'],
    };
    mockAuthFetch.mockResolvedValue({ success: true, data: result });
    const body = JSON.stringify({ fileName: 'roster.pdf', base64: 'JVBERi0=', examples: [] });

    const res = await handleToolServerRequest('sunday-service-bulletin', {
      url: '/api/import-roster',
      method: 'POST',
      body,
    });

    expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/sunday-bulletins/roster-import', {
      method: 'POST',
      body,
    });
    expect(JSON.parse(res.body)).toEqual(result);
  });

  it('refuses routes a tool is not allowed to call', async () => {
    for (const [tool, method, url] of [
      ['roll-call', 'GET', '/api/bulletins'],
      ['sunday-service-bulletin', 'POST', '/api/analyze-bulletins'],
      ['sunday-service-bulletin', 'GET', '/api/import-bulletins'],
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
      url: '/api/import-bulletins',
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(502);
    expect(res.notice).toBeUndefined();
  });
});
