import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteMarkdown } from '@/components/church-site/site-markdown';
import { getPublicPage } from '@/lib/church-site';
import { slugFromParams } from '@/lib/site-slug';

type Params = Promise<{ slug: string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await getPublicPage(slugFromParams((await params).slug));
  return page ? { title: page.title } : {};
}

/** An imported (or staff-written) content page. */
export default async function ChurchContentPage({ params }: { params: Params }) {
  const slug = slugFromParams((await params).slug);
  if (slug === 'home') notFound();
  const page = await getPublicPage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{page.title}</h1>
      <SiteMarkdown markdown={page.markdown} />
    </article>
  );
}
