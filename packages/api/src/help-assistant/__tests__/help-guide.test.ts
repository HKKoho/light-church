// packages/api/src/help-assistant/__tests__/help-guide.test.ts
import { describe, expect, it } from 'vitest';

import { isNavKeyHidden, renderHelpGuide } from '../help-guide.js';

describe('isNavKeyHidden', () => {
  it('matches the key itself or any parent', () => {
    const hidden = new Set(['sidebar:phase2']);
    expect(isNavKeyHidden('sidebar:phase2', hidden)).toBe(true);
    expect(isNavKeyHidden('sidebar:phase2:tasks', hidden)).toBe(true);
    expect(isNavKeyHidden('topbar:careGovernance:prayer', hidden)).toBe(false);
  });

  it('does not treat a bare prefix like "ai-tool" as a parent', () => {
    expect(isNavKeyHidden('ai-tool:builtin:rollCall', new Set(['ai-tool']))).toBe(false);
  });
});

describe('renderHelpGuide', () => {
  it('describes every feature when nothing is hidden', () => {
    const guide = renderHelpGuide();
    expect(guide).toContain('Roll Call (/roll-call)');
    expect(guide).toContain('## AI Volunteers');
    expect(guide).toContain('Prayer Requests (/ngo/prayer)');
  });

  it('leaves out a hidden AI tool, built-in or uploaded', () => {
    const guide = renderHelpGuide(
      new Set(['ai-tool:builtin:rollCall', 'ai-tool:sunday-service-bulletin']),
    );
    expect(guide).not.toContain('Roll Call');
    expect(guide).not.toContain('Sunday Service Bulletin');
    expect(guide).toContain('AI Survey (/ai-survey)');
  });

  it('drops a whole sidebar group, or just one of its items', () => {
    expect(renderHelpGuide(new Set(['sidebar:phase2']))).not.toContain('AI Volunteers');
    const oneItem = renderHelpGuide(new Set(['sidebar:phase2:workspace']));
    expect(oneItem).toContain('## AI Volunteers');
    expect(oneItem).not.toContain('Workspace (/workspace)');
  });

  it('drops a hidden top-bar menu and its items', () => {
    const guide = renderHelpGuide(new Set(['topbar:financeStewardship']));
    expect(guide).not.toContain('Finance & Stewardship');
    expect(guide).not.toContain('/governance/tokens');
    expect(guide).toContain('Care & Governance → Prayer Requests');
  });

  it('drops a section once every entry in it is hidden', () => {
    const items = ['conversations', 'agents', 'talkingFace', 'skills', 'tasks', 'workspace'];
    const guide = renderHelpGuide(new Set(items.map((k) => `sidebar:phase2:${k}`)));
    expect(guide).not.toContain('## AI Volunteers');
  });

  it('hides the Sunday School Studio with Scripture & Learning', () => {
    expect(renderHelpGuide()).toContain('Sunday School Studio');
    const guide = renderHelpGuide(new Set(['topbar:bibleMinistries:scripture']));
    expect(guide).not.toContain('Sunday School Studio');
  });
});
