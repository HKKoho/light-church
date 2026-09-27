'use client';

import { useState } from 'react';
import { ExternalLink, Eye, Loader2, Pencil, Plus } from 'lucide-react';
import {
  CHURCH_SITE_BASE,
  saveSitePageSchema,
  SITE_VISIBILITIES,
  type SaveSitePageInput,
  type SitePageDetail,
  type SitePageSummary,
  type SiteVisibility,
} from '@clawix/shared';
import { SiteMarkdown } from '@/components/church-site/site-markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useChurchWebT } from './messages';
import { DeleteButton, ErrorBanner, errorMessage, Field } from './shared';

const API = '/api/v1/church-site/pages';
const EMPTY: SaveSitePageInput = {
  slug: '',
  title: '',
  markdown: '',
  visibility: 'public',
  sortOrder: 100,
};

const pageHref = (slug: string, visibility: SiteVisibility) =>
  slug === 'home'
    ? CHURCH_SITE_BASE
    : `${CHURCH_SITE_BASE}${visibility === 'members' ? '/members' : ''}/${slug}`;

interface Props {
  readonly pages: readonly SitePageSummary[];
  readonly onChanged: () => Promise<unknown>;
}

export function PagesTab({ pages, onChanged }: Props) {
  const t = useChurchWebT();
  const [editing, setEditing] = useState<{ id: string | null; form: SaveSitePageInput } | null>(
    null,
  );
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (page: SitePageSummary | null) => {
    setError(null);
    setPreview(false);
    if (!page) {
      setEditing({ id: null, form: EMPTY });
      return;
    }
    try {
      const res = await authFetch<{ data: SitePageDetail }>(`${API}/${page.id}`);
      const { slug, title, markdown, visibility, sortOrder } = res.data;
      setEditing({ id: page.id, form: { slug, title, markdown, visibility, sortOrder } });
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  };

  const save = async () => {
    if (!editing) return;
    const parsed = saveSitePageSchema.safeParse(editing.form);
    if (!parsed.success) {
      setError(`${t.invalid} (${parsed.error.issues[0]?.path.join('.') ?? ''})`);
      return;
    }
    setBusy(true);
    try {
      await authFetch(editing.id ? `${API}/${editing.id}` : API, {
        method: editing.id ? 'PUT' : 'POST',
        body: JSON.stringify(parsed.data),
      });
      setEditing(null);
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await authFetch(`${API}/${id}`, { method: 'DELETE' });
      await onChanged();
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  };

  const set = (patch: Partial<SaveSitePageInput>) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <div className="flex flex-col gap-4">
      <Button className="self-start" onClick={() => void open(null)}>
        <Plus className="size-4" />
        {t.newPage}
      </Button>
      {!editing && <ErrorBanner message={error} />}

      {pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noPages}</p>
      ) : (
        <Card className="py-2">
          <CardContent className="divide-y px-2">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
                </div>
                <Badge variant={p.visibility === 'public' ? 'secondary' : 'outline'}>
                  {t.visibilities[p.visibility]}
                </Badge>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {p.edited ? t.edited : t.imported}
                </Badge>
                {p.visibility !== 'hidden' && (
                  <Button size="icon" variant="ghost" asChild aria-label={t.viewSite}>
                    <a
                      href={pageHref(p.slug, p.visibility)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t.editPage}
                  onClick={() => void open(p)}
                >
                  <Pencil className="size-4" />
                </Button>
                <DeleteButton name={p.title} onConfirm={() => void remove(p.id)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t.editPage : t.newPage}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="page-title" label={t.pageTitle}>
                  <Input
                    id="page-title"
                    value={editing.form.title}
                    onChange={(e) => set({ title: e.target.value })}
                  />
                </Field>
                <Field id="page-slug" label={t.slug}>
                  <Input
                    id="page-slug"
                    value={editing.form.slug}
                    placeholder="about/faith"
                    onChange={(e) => set({ slug: e.target.value })}
                  />
                </Field>
                <Field id="page-visibility" label={t.visibility}>
                  <Select
                    value={editing.form.visibility}
                    onValueChange={(v) => set({ visibility: v as SiteVisibility })}
                  >
                    <SelectTrigger id="page-visibility" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SITE_VISIBILITIES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {t.visibilities[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="page-order" label={t.order}>
                  <Input
                    id="page-order"
                    type="number"
                    min={0}
                    value={editing.form.sortOrder}
                    onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t.content}</span>
                <Button size="sm" variant="ghost" onClick={() => setPreview(!preview)}>
                  {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
                  {preview ? t.editPage : t.preview}
                </Button>
              </div>
              {preview ? (
                <div className="rounded-md border p-4">
                  <SiteMarkdown markdown={editing.form.markdown} />
                </div>
              ) : (
                <Textarea
                  aria-label={t.content}
                  rows={16}
                  className="font-mono text-xs"
                  value={editing.form.markdown}
                  onChange={(e) => set({ markdown: e.target.value })}
                />
              )}
              <ErrorBanner message={error} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t.cancel}
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
