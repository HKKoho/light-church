import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import userEvent from '@testing-library/user-event';

import { render, screen, waitFor, fireEvent } from '@/test-utils';
import { HelpAssistant } from '../help-assistant';
import { HELP_ASSISTANT_STORAGE_KEY } from '../use-help-assistant';

vi.mock('next/navigation', () => ({ usePathname: () => '/roll-call' }));
vi.mock('@/lib/auth', () => ({
  authFetch: vi.fn(),
  ensureAccessToken: vi.fn(async () => 'token'),
}));

import { authFetch } from '@/lib/auth';

const mockAuthFetch = authFetch as Mock;
const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  mockAuthFetch.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function openPanel() {
  const user = userEvent.setup();
  render(<HelpAssistant />);
  await user.click(screen.getByRole('button', { name: 'Open Help Assistant' }));
  return user;
}

function lastChatBody(): {
  messages: { role: string; content: string }[];
  attachments: { name: string }[];
  currentPage: string;
  lang: string;
} {
  const init = mockAuthFetch.mock.calls.at(-1)?.[1] as { body: string };
  return JSON.parse(init.body) as ReturnType<typeof lastChatBody>;
}

describe('HelpAssistant', () => {
  it('opens and closes from the launcher, the X and Escape', async () => {
    const user = await openPanel();
    expect(screen.getByRole('dialog', { name: 'Help Assistant' })).toBeInTheDocument();
    expect(screen.getByText(/show you how to use any part/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Close Help Assistant' })[0]!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('help-assistant:open')).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Open Help Assistant' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends a question with the page and language, and shows the reply with sources', async () => {
    mockAuthFetch.mockResolvedValue({
      data: {
        reply: 'Open **Roll Call** and pick a group.',
        sources: [
          { title: 'Guide', url: 'https://example.org', kind: 'web' },
          { title: 'plan.md', url: '/comms/plan.md', kind: 'workspace' },
        ],
      },
    });
    const user = await openPanel();
    await user.type(
      screen.getByPlaceholderText(/Ask a question/),
      'How do I take attendance?{Enter}',
    );

    expect(await screen.findByText('Roll Call')).toBeInTheDocument();
    expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/help-assistant/chat', expect.anything());
    expect(lastChatBody()).toMatchObject({
      messages: [{ role: 'user', content: 'How do I take attendance?' }],
      currentPage: '/roll-call',
      lang: 'en',
    });
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'href',
      'https://example.org',
    );
    expect(screen.getByText('plan.md')).toBeInTheDocument();

    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('Open **Roll Call** and pick a group.');
    expect(await screen.findByText('Copied')).toBeInTheDocument();

    const stored = JSON.parse(sessionStorage.getItem(HELP_ASSISTANT_STORAGE_KEY) ?? '{}') as {
      entries: unknown[];
    };
    expect(stored.entries).toHaveLength(2);
  });

  it('sends a suggestion when clicked', async () => {
    mockAuthFetch.mockResolvedValue({ data: { reply: 'Here is what you can do.', sources: [] } });
    const user = await openPanel();
    await user.click(screen.getByRole('button', { name: 'What can I do on this page?' }));
    expect(await screen.findByText('Here is what you can do.')).toBeInTheDocument();
  });

  it('shows the error and puts the question back in the box when sending fails', async () => {
    mockAuthFetch.mockRejectedValue(new Error('No AI provider is configured'));
    const user = await openPanel();
    const box = screen.getByPlaceholderText(/Ask a question/);
    await user.type(box, 'Hello{Enter}');
    expect(await screen.findByText('No AI provider is configured')).toBeInTheDocument();
    expect(box).toHaveValue('Hello');
    expect(screen.queryByText('Hello', { selector: 'div' })).not.toBeInTheDocument();
  });

  it('attaches a document, sends it with the question, and can remove it', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { name: 'minutes.pdf', text: 'Minutes text', truncated: true } }),
    });
    mockAuthFetch.mockResolvedValue({ data: { reply: 'Summary here', sources: [] } });
    const user = await openPanel();

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(['%PDF'], 'minutes.pdf', { type: 'application/pdf' }));

    expect(await screen.findByText('minutes.pdf')).toBeInTheDocument();
    expect(screen.getByText(/only the first part was read/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/help-assistant/extract');
    expect(init.headers).toEqual({ Authorization: 'Bearer token' });

    await user.type(screen.getByPlaceholderText(/Ask a question/), 'Summarize{Enter}');
    await screen.findByText('Summary here');
    expect(lastChatBody().attachments).toEqual([{ name: 'minutes.pdf', text: 'Minutes text' }]);

    await user.click(screen.getByRole('button', { name: 'Remove minutes.pdf' }));
    expect(screen.queryByRole('button', { name: 'Remove minutes.pdf' })).not.toBeInTheDocument();
  });

  it('reports a document that cannot be read', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      statusText: 'Unprocessable',
      json: async () => ({ message: 'Unsupported file type' }),
    });
    const user = await openPanel();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(['x'], 'notes.txt'));
    expect(await screen.findByText('Unsupported file type')).toBeInTheDocument();
  });

  it('restores the conversation for the tab and clears it with New chat', async () => {
    sessionStorage.setItem(
      HELP_ASSISTANT_STORAGE_KEY,
      JSON.stringify({
        entries: [{ id: '1', role: 'assistant', content: 'Earlier answer' }],
        attachments: [],
      }),
    );
    sessionStorage.setItem('help-assistant:open', 'true');
    const user = userEvent.setup();
    render(<HelpAssistant />);

    expect(await screen.findByText('Earlier answer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New chat' }));
    await waitFor(() => {
      expect(screen.queryByText('Earlier answer')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/show you how to use any part/)).toBeInTheDocument();
  });
});
