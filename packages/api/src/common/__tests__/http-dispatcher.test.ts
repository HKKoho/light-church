import { describe, it, expect, vi, beforeEach } from 'vitest';

const setGlobalDispatcher = vi.fn();
const AgentMock = vi.fn();

vi.mock('undici', () => ({
  setGlobalDispatcher: (...args: unknown[]) => setGlobalDispatcher(...args),
  Agent: vi.fn().mockImplementation(function (opts: unknown) {
    AgentMock(opts);
    return { __mockAgent: true, opts };
  }),
}));

import { configureGlobalHttpDispatcher } from '../http-dispatcher.js';

describe('configureGlobalHttpDispatcher', () => {
  beforeEach(() => {
    setGlobalDispatcher.mockReset();
    AgentMock.mockReset();
    delete process.env['HTTP_CONNECT_TIMEOUT_MS'];
  });

  it('uses 5000 ms connect timeout by default', () => {
    configureGlobalHttpDispatcher();
    expect(AgentMock).toHaveBeenCalledOnce();
    const opts = AgentMock.mock.calls[0]![0] as { connect?: { timeout?: number } };
    expect(opts.connect?.timeout).toBe(5000);
  });

  it('reads HTTP_CONNECT_TIMEOUT_MS from env when set', () => {
    process.env['HTTP_CONNECT_TIMEOUT_MS'] = '8000';
    configureGlobalHttpDispatcher();
    const opts = AgentMock.mock.calls[0]![0] as { connect?: { timeout?: number } };
    expect(opts.connect?.timeout).toBe(8000);
  });

  it('ignores non-numeric env values and falls back to default', () => {
    process.env['HTTP_CONNECT_TIMEOUT_MS'] = 'not-a-number';
    configureGlobalHttpDispatcher();
    const opts = AgentMock.mock.calls[0]![0] as { connect?: { timeout?: number } };
    expect(opts.connect?.timeout).toBe(5000);
  });

  it('rejects non-positive values and falls back to default', () => {
    process.env['HTTP_CONNECT_TIMEOUT_MS'] = '0';
    configureGlobalHttpDispatcher();
    const opts = AgentMock.mock.calls[0]![0] as { connect?: { timeout?: number } };
    expect(opts.connect?.timeout).toBe(5000);
  });

  it('installs the agent globally', () => {
    configureGlobalHttpDispatcher();
    expect(setGlobalDispatcher).toHaveBeenCalledOnce();
    const dispatcher = setGlobalDispatcher.mock.calls[0]![0] as { __mockAgent?: boolean };
    expect(dispatcher.__mockAgent).toBe(true);
  });

  it('returns the configured timeout for callers/logging', () => {
    process.env['HTTP_CONNECT_TIMEOUT_MS'] = '7000';
    const result = configureGlobalHttpDispatcher();
    expect(result.connectTimeoutMs).toBe(7000);
  });
});
