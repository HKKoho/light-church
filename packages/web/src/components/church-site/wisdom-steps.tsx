'use client';

import { ExternalLink, Volume2 } from 'lucide-react';
import {
  WISDOM_PERSPECTIVES,
  wisdomReadingName,
  WISDOM_SUMMARY_KEY,
  wisdomDiscussionKey,
  type WisdomLifeQuestion,
  type WisdomModuleDetail,
  type WisdomQuestionInsight,
} from '@clawix/shared';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useWisdomSiteT } from './wisdom-messages';

type Answers = Record<string, string>;
type OnAnswer = (key: string, value: string) => void;

/** A YouTube link as an embeddable address, or null for any other link. */
export function youTubeEmbed(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i.exec(
    url,
  );
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

function Media({ url, title }: { url: string; title: string }) {
  const t = useWisdomSiteT();
  if (!url) return null;
  const embed = youTubeEmbed(url);
  return embed ? (
    <iframe
      src={embed}
      title={title}
      className="aspect-video w-full rounded-md border"
      allow="encrypted-media; picture-in-picture"
      allowFullScreen
    />
  ) : (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      {t.resource}
      <ExternalLink className="size-3.5" />
    </a>
  );
}

function Picture({ url, alt }: { url: string; alt: string }) {
  if (!url) return null;
  return <img src={url} alt={alt} className="max-h-80 w-auto rounded-md border object-contain" />;
}

function Audio({ url }: { url: string }) {
  const t = useWisdomSiteT();
  if (!url) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Volume2 className="size-4" aria-label={t.listen} />
      <audio controls preload="none" src={url} className="h-9 w-full max-w-md" />
    </div>
  );
}

const Prose = ({ text, className }: { text: string; className?: string }) =>
  text ? <p className={cn('whitespace-pre-line leading-relaxed', className)}>{text}</p> : null;

function Insight({
  question,
  insight,
}: {
  question: WisdomLifeQuestion;
  insight?: WisdomQuestionInsight;
}) {
  const t = useWisdomSiteT();
  if (!insight) return null;
  const total = Math.max(1, insight.respondents);
  return (
    <div className="rounded-md bg-muted/50 p-4 text-sm">
      <p className="mb-2 font-medium">
        {t.othersSaid} · {t.respondents(insight.respondents)}
      </p>
      {insight.respondents === 0 ? (
        <p className="text-muted-foreground">{t.noOthers}</p>
      ) : question.type === 'multi_choice' ? (
        <ul className="flex flex-col gap-1.5">
          {Object.entries(insight.counts).map(([option, n]) => (
            <li key={option}>
              <div className="flex justify-between">
                <span>{option}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round((n / total) * 100)}%
                </span>
              </div>
              <div className="mt-0.5 h-1.5 rounded bg-muted">
                <div
                  className="h-full rounded bg-primary"
                  style={{ width: `${(n / total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {insight.samples.map((s, i) => (
            <li key={i} className="whitespace-pre-line border-l-2 pl-3 text-muted-foreground">
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function QuestionsStep({
  module,
  answers,
  saved,
  insights,
  onAnswer,
}: {
  module: WisdomModuleDetail;
  answers: Answers;
  /** Answers as last saved: others' answers show once the member has saved their own. */
  saved: Answers;
  insights: readonly WisdomQuestionInsight[];
  onAnswer: OnAnswer;
}) {
  const t = useWisdomSiteT();
  return (
    <div className="flex flex-col gap-8">
      {module.lifeQuestions.map((q, i) => (
        <div key={q.id} className="flex flex-col gap-3">
          <Prose text={`${i + 1}. ${q.text}`} className="text-lg font-medium" />
          <Media url={q.mediaUrl} title={q.text} />
          <Picture url={q.imageUrl} alt={q.imageAlt} />
          {q.type === 'multi_choice' ? (
            <div role="radiogroup" aria-label={q.text} className="flex flex-wrap gap-2">
              {q.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={answers[q.id] === option}
                  onClick={() => onAnswer(q.id, option)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm transition',
                    answers[q.id] === option
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-primary',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <Textarea
              aria-label={t.yourAnswer}
              placeholder={t.yourAnswer}
              rows={4}
              value={answers[q.id] ?? ''}
              onChange={(e) => onAnswer(q.id, e.target.value)}
            />
          )}
          {saved[q.id] && (
            <Insight question={q} insight={insights.find((x) => x.questionId === q.id)} />
          )}
        </div>
      ))}
    </div>
  );
}

export function PerspectivesStep({ module }: { module: WisdomModuleDetail }) {
  const t = useWisdomSiteT();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {WISDOM_PERSPECTIVES.map((type) => {
        const p = module.perspectives[type];
        return (
          <article key={type} className="flex flex-col gap-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {wisdomReadingName(module.readingLabels, type, t.perspectiveNames)}
            </h3>
            {p.book && <p className="font-semibold">{p.book}</p>}
            {p.theme && <p className="text-sm font-medium text-primary">{p.theme}</p>}
            <Picture url={p.imageUrl} alt={p.imageAlt} />
            <Audio url={p.audioUrl} />
            <Prose text={p.description} className="text-sm" />
          </article>
        );
      })}
    </div>
  );
}

export function TensionStep({ module }: { module: WisdomModuleDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <Audio url={module.tensionGuideAudioUrl} />
      <Prose text={module.tensionGuide} />
    </div>
  );
}

export function DiscussionStep({
  module,
  answers,
  onAnswer,
}: {
  module: WisdomModuleDetail;
  answers: Answers;
  onAnswer: OnAnswer;
}) {
  const t = useWisdomSiteT();
  if (module.discussionPrompts.length === 0) {
    return <p className="text-muted-foreground">{t.noPrompts}</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {module.discussionPrompts.map((prompt, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Prose text={prompt} className="font-medium" />
          <Textarea
            aria-label={t.yourAnswer}
            placeholder={t.yourAnswer}
            rows={4}
            value={answers[wisdomDiscussionKey(i)] ?? ''}
            onChange={(e) => onAnswer(wisdomDiscussionKey(i), e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export function SummaryStep({
  module,
  answers,
  onAnswer,
}: {
  module: WisdomModuleDetail;
  answers: Answers;
  onAnswer: OnAnswer;
}) {
  const t = useWisdomSiteT();
  return (
    <div className="flex flex-col gap-4">
      <Prose text={module.summary} />
      <Textarea
        aria-label={t.yourReflection}
        placeholder={t.yourReflection}
        rows={5}
        value={answers[WISDOM_SUMMARY_KEY] ?? ''}
        onChange={(e) => onAnswer(WISDOM_SUMMARY_KEY, e.target.value)}
      />
    </div>
  );
}
