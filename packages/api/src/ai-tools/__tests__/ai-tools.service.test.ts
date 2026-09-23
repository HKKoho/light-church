// packages/api/src/ai-tools/__tests__/ai-tools.service.test.ts
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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
    await expect(service.list()).resolves.toEqual([]);
    await expect(fs.stat(toolsDir)).resolves.toBeDefined();
  });

  it('lists html and link tools sorted by name, skipping invalid folders', async () => {
    await writeTool('Sermon Helper', {
      'index.html': '<h1>hi</h1>',
      'tool.json': JSON.stringify({ description: 'Outlines' }),
    });
    await writeTool('Bible Chat', { 'tool.json': JSON.stringify({ url: 'https://example.org' }) });
    await writeTool('empty', {});
    await writeTool('.hidden', { 'index.html': 'x' });
    await writeTool('bad-link', { 'tool.json': JSON.stringify({ url: 'javascript:alert(1)' }) });

    await expect(service.list()).resolves.toEqual([
      { name: 'Bible Chat', kind: 'link', description: null, url: 'https://example.org' },
      { name: 'Sermon Helper', kind: 'html', description: 'Outlines', url: null },
    ]);
  });

  it('keeps an html tool visible when its tool.json is malformed', async () => {
    await writeTool('講道助手', { 'index.html': '<p/>', 'tool.json': '{not json' });
    await expect(service.list()).resolves.toEqual([
      { name: '講道助手', kind: 'html', description: null, url: null },
    ]);
  });

  it('returns the html for a tool', async () => {
    await writeTool('Quiz', { 'index.html': '<p>quiz</p>' });
    await expect(service.get('Quiz')).resolves.toMatchObject({ kind: 'html', html: '<p>quiz</p>' });
  });

  it('throws NotFound for an unknown tool and BadRequest for a traversal name', async () => {
    await expect(service.get('Nope')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get('../secrets')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads an html file as <name>/index.html', async () => {
    const tool = await service.upload('Prayer Board', 'board.html', Buffer.from('<p>x</p>'));
    expect(tool).toEqual({ name: 'Prayer Board', kind: 'html', description: null, url: null });
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

  it('removes a tool folder, and 404s when it does not exist', async () => {
    await writeTool('Old', { 'index.html': 'x' });
    await service.remove('Old');
    await expect(service.list()).resolves.toEqual([]);
    await expect(service.remove('Old')).rejects.toBeInstanceOf(NotFoundException);
  });
});
