// packages/api/src/connectors/google-forms.client.ts
//
// Creates a Google Form as the church's service account, then shares it with
// the publisher's email so they own the editing. Uses the Forms and Drive REST
// APIs with a self-signed JWT grant — no Google SDK dependency.
import { createSign } from 'node:crypto';

import { BadGatewayException } from '@nestjs/common';
import type { PublishedSurvey, SurveyDraft, SurveyQuestion } from '@clawix/shared';

import type { GoogleServiceAccount } from './connector-settings.service.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FORMS_URL = 'https://forms.googleapis.com/v1/forms';
const DRIVE_URL = 'https://www.googleapis.com/drive/v3/files';
const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

type Fetch = typeof fetch;

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

/** RS256-signed JWT assertion for the OAuth 2.0 service-account flow. */
export function signJwt(account: GoogleServiceAccount, nowSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: SCOPES,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${signer.sign(account.privateKey, 'base64url')}`;
}

/** One Forms API `createItem` request for a question. */
export function toFormItem(q: SurveyQuestion, index: number): Record<string, unknown> {
  let question: Record<string, unknown>;
  switch (q.type) {
    case 'short':
      question = { textQuestion: { paragraph: false } };
      break;
    case 'paragraph':
      question = { textQuestion: { paragraph: true } };
      break;
    case 'scale':
      question = { scaleQuestion: { low: 1, high: 5 } };
      break;
    case 'single':
    case 'multiple':
      question = {
        choiceQuestion: {
          type: q.type === 'single' ? 'RADIO' : 'CHECKBOX',
          options: q.options.map((value) => ({ value })),
        },
      };
      break;
  }
  return {
    createItem: {
      item: { title: q.title, questionItem: { question: { required: q.required, ...question } } },
      location: { index },
    },
  };
}

async function call<T>(fetchFn: Fetch, url: string, init: RequestInit, what: string): Promise<T> {
  const res = await fetchFn(url, init);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = body['error'] as { message?: string } | string | undefined;
    const message = typeof err === 'string' ? err : (err?.message ?? res.statusText);
    throw new BadGatewayException(`Google ${what} failed: ${message}`);
  }
  return body as T;
}

export class GoogleFormsClient {
  constructor(
    private readonly account: GoogleServiceAccount,
    private readonly fetchFn: Fetch = fetch,
  ) {}

  private async accessToken(): Promise<string> {
    const assertion = signJwt(this.account, Math.floor(Date.now() / 1000));
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    });
    const res = await call<{ access_token: string }>(
      this.fetchFn,
      TOKEN_URL,
      { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      'sign-in',
    );
    return res.access_token;
  }

  async createForm(draft: SurveyDraft, shareWith: string | null): Promise<PublishedSurvey> {
    const token = await this.accessToken();
    const json = (payload: unknown): RequestInit => ({
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    // The Forms API only accepts a title on create; everything else is a batchUpdate.
    const form = await call<{ formId: string; responderUri: string }>(
      this.fetchFn,
      FORMS_URL,
      json({ info: { title: draft.title, documentTitle: draft.title } }),
      'Forms create',
    );
    await call(
      this.fetchFn,
      `${FORMS_URL}/${form.formId}:batchUpdate`,
      json({
        requests: [
          {
            updateFormInfo: { info: { description: draft.description }, updateMask: 'description' },
          },
          ...draft.questions.map(toFormItem),
        ],
      }),
      'Forms update',
    );

    let sharedWith: string | null = null;
    if (shareWith) {
      await call(
        this.fetchFn,
        `${DRIVE_URL}/${form.formId}/permissions?sendNotificationEmail=true`,
        json({ role: 'writer', type: 'user', emailAddress: shareWith }),
        'Drive share',
      );
      sharedWith = shareWith;
    }

    return {
      formId: form.formId,
      responderUrl: form.responderUri,
      editUrl: `https://docs.google.com/forms/d/${form.formId}/edit`,
      sharedWith,
    };
  }
}
