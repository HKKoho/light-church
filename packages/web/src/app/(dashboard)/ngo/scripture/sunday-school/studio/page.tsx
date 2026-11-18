'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, ChevronRight, Loader2, Plus } from 'lucide-react';
import type { SundaySchoolCourseSummary, SundaySchoolProfileInfo } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authFetch } from '@/lib/auth';
import { DraftCourseDialog } from './draft-course-dialog';
import { useStudioT } from './messages';
import { ProfileList } from './profile-list';
import { API, ErrorBanner, courseHref, errorMessage, useIsStudioEditor } from './shared';

const cardClass =
  'group relative h-full gap-2 py-4 transition-colors hover:border-foreground/40 hover:bg-accent/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring';

/** Staff: Sunday School Studio home — courses and class profiles. */
export default function SundaySchoolStudioPage() {
  const t = useStudioT();
  const router = useRouter();
  const isEditor = useIsStudioEditor();
  const [courses, setCourses] = useState<SundaySchoolCourseSummary[] | null>(null);
  const [profiles, setProfiles] = useState<SundaySchoolProfileInfo[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        authFetch<{ data: SundaySchoolCourseSummary[] }>(`${API}/courses`),
        authFetch<{ data: SundaySchoolProfileInfo[] }>(`${API}/profiles`),
      ]);
      setCourses(c.data);
      setProfiles(p.data);
    } catch (err) {
      setError(errorMessage(err, t.failed));
    }
  }, [t.failed]);

  useEffect(() => {
    if (isEditor) void load();
  }, [isEditor, load]);

  return (
    <div className="flex min-w-0 flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 border-b border-border/60 pb-4">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" asChild>
          <Link href="/ngo/scripture/sunday-school">
            <ArrowLeft className="mr-1 size-4" />
            {t.back}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p>
      </header>

      {!isEditor ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <Tabs defaultValue="courses" className="flex flex-col gap-4">
          <TabsList>
            <TabsTrigger value="courses">{t.coursesTab}</TabsTrigger>
            <TabsTrigger value="profiles">{t.profilesTab}</TabsTrigger>
          </TabsList>
          <ErrorBanner message={error} />
          <TabsContent value="courses" className="flex flex-col gap-3">
            {!courses && !error ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Button
                  className="w-fit"
                  onClick={() => setDrafting(true)}
                  disabled={profiles.length === 0}
                >
                  <Plus className="size-4" />
                  {t.newCourse}
                </Button>
                {profiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.needProfile}</p>
                )}
                {courses?.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.noCourses}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {courses?.map((c) => (
                    <Card key={c.id} className={cardClass}>
                      <CardHeader className="px-4">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <BookOpenCheck className="size-4 shrink-0 text-muted-foreground" />
                          <Link
                            href={courseHref(c.id)}
                            className="min-w-0 truncate after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
                          >
                            {c.title}
                          </Link>
                          <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {t.modes[c.mode]} · {c.subject} · {c.profileName}
                        </CardDescription>
                        <p className="text-xs text-muted-foreground">
                          {c.syllabusApproved
                            ? t.lessonsProgress(c.approvedCount, c.lessonCount)
                            : t.awaitingApproval}
                        </p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="profiles">
            <ProfileList profiles={profiles} onChange={setProfiles} onError={setError} />
          </TabsContent>
        </Tabs>
      )}

      <DraftCourseDialog
        open={drafting}
        profiles={profiles}
        onClose={() => setDrafting(false)}
        onDrafted={(course) => {
          setDrafting(false);
          router.push(courseHref(course.id));
        }}
      />
    </div>
  );
}
