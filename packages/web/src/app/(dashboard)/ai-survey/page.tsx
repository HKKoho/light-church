'use client';

import { useState } from 'react';
import { ClipboardList, Loader2, Plus, Send, Sparkles } from 'lucide-react';
import {
  AI_PUBLISH_ROLES,
  type GenerateSurveyInput,
  type PublishedSurvey,
  type SurveyDraft,
  type SurveyQuestion,
} from '@clawix/shared';
import { useAuth } from '@/components/auth-provider';
import { PublishedLink } from '@/components/dashboard/published-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { useSurveyT } from './messages';
import { QuestionEditor, cleanQuestion } from './question-editor';

const API = '/api/v1/ai-survey';

const post = <T,>(path: string, body: unknown) =>
  authFetch<{ data: T }>(`${API}/${path}`, { method: 'POST', body: JSON.stringify(body) }).then(
    (res) => res.data,
  );

export default function AiSurveyPage() {
  const t = useSurveyT();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const canUse = !!user && AI_PUBLISH_ROLES.includes(user.role);

  const [input, setInput] = useState<GenerateSurveyInput>({
    topic: '',
    audience: '',
    questionCount: 8,
    language: lang,
  });
  const [draft, setDraft] = useState<SurveyDraft | null>(null);
  const [published, setPublished] = useState<PublishedSurvey | null>(null);
  const [busy, setBusy] = useState<'generate' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'generate' | 'publish', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(null);
    }
  };

  const generate = () =>
    run('generate', async () => {
      setDraft(await post<SurveyDraft>('generate', input));
      setPublished(null);
    });

  const publish = () => {
    if (!draft) return;
    const clean = { ...draft, questions: draft.questions.map(cleanQuestion) };
    void run('publish', async () => {
      setPublished(await post<PublishedSurvey>('publish', clean));
    });
  };

  const updateQuestion = (index: number, q: SurveyQuestion | null) => {
    if (!draft) return;
    const questions = [...draft.questions];
    if (q) questions[index] = q;
    else questions.splice(index, 1);
    setDraft({ ...draft, questions });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase tracking-wider">
          {t.phase}
        </Badge>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ClipboardList className="size-6 text-violet-500" />
          {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {!canUse ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="topic">{t.topic}</Label>
                <Textarea
                  id="topic"
                  rows={2}
                  maxLength={500}
                  placeholder={t.topicPlaceholder}
                  value={input.topic}
                  onChange={(e) => {
                    setInput({ ...input, topic: e.target.value });
                  }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="audience">{t.audience}</Label>
                  <Input
                    id="audience"
                    maxLength={200}
                    placeholder={t.audiencePlaceholder}
                    value={input.audience}
                    onChange={(e) => {
                      setInput({ ...input, audience: e.target.value });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="count">{t.questionCount}</Label>
                  <Input
                    id="count"
                    type="number"
                    min={3}
                    max={20}
                    value={input.questionCount}
                    onChange={(e) => {
                      const n = Math.min(20, Math.max(3, Number(e.target.value) || 3));
                      setInput({ ...input, questionCount: n });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="language">{t.language}</Label>
                  <select
                    id="language"
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={input.language}
                    onChange={(e) => {
                      setInput({ ...input, language: e.target.value as 'en' | 'zh-TW' });
                    }}
                  >
                    <option value="en">{t.languages.en}</option>
                    <option value="zh-TW">{t.languages['zh-TW']}</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => void generate()}
                  disabled={busy !== null || input.topic.trim().length < 3}
                >
                  {busy === 'generate' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {busy === 'generate' ? t.generating : draft ? t.regenerate : t.generate}
                </Button>
                <span className="text-xs text-muted-foreground">{t.privacy}</span>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {published && (
            <Card className="border-emerald-500/50">
              <CardHeader>
                <CardTitle>{t.publishedTitle}</CardTitle>
                {published.sharedWith && (
                  <CardDescription>{t.sharedWith(published.sharedWith)}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <PublishedLink
                  label={t.responderLink}
                  url={published.responderUrl}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                  openLabel={t.open}
                />
                <PublishedLink
                  label={t.editLink}
                  url={published.editUrl}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                  openLabel={t.open}
                />
                <div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft(null);
                      setPublished(null);
                      setInput({ ...input, topic: '', audience: '' });
                    }}
                  >
                    {t.startOver}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {draft && !published && (
            <Card>
              <CardHeader>
                <CardTitle>{t.draftTitle}</CardTitle>
                <CardDescription>{t.draftHint}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-title">{t.formTitle}</Label>
                  <Input
                    id="form-title"
                    maxLength={200}
                    value={draft.title}
                    onChange={(e) => {
                      setDraft({ ...draft, title: e.target.value });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-description">{t.formDescription}</Label>
                  <Textarea
                    id="form-description"
                    rows={2}
                    maxLength={1000}
                    value={draft.description}
                    onChange={(e) => {
                      setDraft({ ...draft, description: e.target.value });
                    }}
                  />
                </div>
                {draft.questions.map((q, i) => (
                  <QuestionEditor
                    key={i}
                    index={i}
                    question={q}
                    t={t}
                    onChange={(next) => {
                      updateQuestion(i, next);
                    }}
                    onRemove={() => {
                      updateQuestion(i, null);
                    }}
                  />
                ))}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    disabled={draft.questions.length >= 30}
                    onClick={() => {
                      setDraft({
                        ...draft,
                        questions: [
                          ...draft.questions,
                          { title: '', type: 'short', required: false, options: [] },
                        ],
                      });
                    }}
                  >
                    <Plus className="size-4" />
                    {t.addQuestion}
                  </Button>
                  <Button
                    onClick={publish}
                    disabled={busy !== null || draft.questions.length === 0 || !draft.title.trim()}
                  >
                    {busy === 'publish' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {busy === 'publish' ? t.publishing : t.publish}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
