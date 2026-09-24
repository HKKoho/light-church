// packages/api/src/connectors/__tests__/google-forms.client.test.ts
import { createVerify, generateKeyPairSync } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { GoogleFormsClient, signJwt, toFormItem } from '../google-forms.client.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const account = {
  clientEmail: 'forms@church.iam.gserviceaccount.com',
  privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('signJwt', () => {
  it('produces a verifiable RS256 assertion for the service account', () => {
    const jwt = signJwt(account, 1_000);
    const [header = '', claims = '', sig = ''] = jwt.split('.');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, sig, 'base64url')).toBe(true);
    const payload = JSON.parse(Buffer.from(claims, 'base64url').toString()) as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({ iss: account.clientEmail, iat: 1_000, exp: 4_600 });
    expect(payload['scope']).toContain('forms.body');
  });
});

describe('toFormItem', () => {
  it('maps each question type to the Forms API shape', () => {
    const q = (type: 'short' | 'paragraph' | 'scale' | 'single' | 'multiple') =>
      toFormItem({ title: 'Q', type, required: true, options: ['A', 'B'] }, 2);
    const question = (item: Record<string, unknown>) =>
      (item['createItem'] as { item: { questionItem: { question: Record<string, unknown> } } }).item
        .questionItem.question;
    expect(question(q('short'))['textQuestion']).toEqual({ paragraph: false });
    expect(question(q('paragraph'))['textQuestion']).toEqual({ paragraph: true });
    expect(question(q('scale'))['scaleQuestion']).toEqual({ low: 1, high: 5 });
    expect(question(q('single'))['choiceQuestion']).toEqual({
      type: 'RADIO',
      options: [{ value: 'A' }, { value: 'B' }],
    });
    expect((question(q('multiple'))['choiceQuestion'] as { type: string }).type).toBe('CHECKBOX');
    expect((q('short')['createItem'] as { location: unknown }).location).toEqual({ index: 2 });
  });
});

describe('GoogleFormsClient', () => {
  const draft = {
    title: 'Retreat feedback',
    description: 'Tell us how it went',
    questions: [{ title: 'Rate it', type: 'scale' as const, required: true, options: [] }],
  };

  it('creates the form, adds questions and shares it with the publisher', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(ok({ access_token: 'tok' }))
      .mockResolvedValueOnce(ok({ formId: 'f1', responderUri: 'https://forms.gle/x' }))
      .mockResolvedValueOnce(ok({}))
      .mockResolvedValueOnce(ok({ id: 'perm' }));
    const result = await new GoogleFormsClient(account, fetchFn).createForm(draft, 'me@church.org');
    expect(result).toEqual({
      formId: 'f1',
      responderUrl: 'https://forms.gle/x',
      editUrl: 'https://docs.google.com/forms/d/f1/edit',
      sharedWith: 'me@church.org',
    });
    const [, updateInit] = fetchFn.mock.calls[2] as [string, RequestInit];
    const update = JSON.parse(updateInit.body as string) as { requests: unknown[] };
    expect(update.requests).toHaveLength(2);
    expect(fetchFn.mock.calls[3]?.[0]).toContain('/files/f1/permissions');
  });

  it('skips sharing without an email and surfaces Google errors', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(ok({ access_token: 'tok' }))
      .mockResolvedValueOnce(ok({ formId: 'f2', responderUri: 'https://forms.gle/y' }))
      .mockResolvedValueOnce(ok({}));
    const result = await new GoogleFormsClient(account, fetchFn).createForm(draft, null);
    expect(result.sharedWith).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(3);

    const failing = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'API disabled' } }), { status: 403 }),
      );
    await expect(new GoogleFormsClient(account, failing).createForm(draft, null)).rejects.toThrow(
      'Google sign-in failed: API disabled',
    );
  });
});
