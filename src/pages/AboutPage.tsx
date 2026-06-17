import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/lib/pwa';
import { ko } from '@/i18n/ko';
import { REFERENCES, type CitationId } from '@/data/references';
import { cn } from '@/lib/utils';

/**
 * SPEC-PQC-001 §3.7 (About Page).
 * 핵심 한 줄 (keystone) + 강의 컨텍스트 + 정직성 고지 + 인용 논문 목록 + 기술 스택.
 * OQ-009: install 프롬프트는 About 페이지에서 항상 재노출.
 */
export function AboutPage(): React.JSX.Element {
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <article
      aria-labelledby="about-title"
      className="container mx-auto max-w-3xl space-y-10 px-4 py-10 leading-relaxed"
    >
      <header className="space-y-3">
        <h1 id="about-title" className="text-3xl font-bold tracking-tight">
          {ko.pages.about.title}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {ko.pages.about.subtitle}
        </p>
      </header>

      <Keystone />

      <Section title="강의 컨텍스트">
        <p>{ko.about.context}</p>
      </Section>

      <Section title="정직성 고지">
        <p>{ko.about.honesty}</p>
      </Section>

      <Section title={ko.about.rolesHeader}>
        <ol className="list-decimal space-y-4 pl-6 text-sm">
          {(
            [
              'Kim-Ahn-2025',
              'Beauregard-2003',
              'Gidney-Ekera-2019',
              'Gidney-2025',
              'Roetteler-2017',
              'Willsch-2023',
            ] as CitationId[]
          ).map(
            (id) => {
              const c = REFERENCES[id];
              return (
                <li key={id} className="space-y-1">
                  <div>
                    <span className="font-medium">{c.authors}</span> ({c.year}).{' '}
                    <span className="italic">{c.title}</span>.{' '}
                    {c.identifier ? (
                      <span>
                        {c.venue} (
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-dotted underline-offset-2"
                          >
                            {c.identifier}
                          </a>
                        ) : (
                          c.identifier
                        )}
                        ).
                      </span>
                    ) : (
                      <span>{c.venue}.</span>
                    )}
                  </div>
                  <p className="text-[hsl(var(--muted-foreground))]">{c.role}</p>
                  {c.highlights && c.highlights.length > 0 ? (
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-[hsl(var(--muted-foreground))]">
                      {c.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            },
          )}
        </ol>
      </Section>

      <Section title={ko.about.techHeader}>
        <p className="text-sm">{ko.about.techList}</p>
      </Section>

      {canInstall ? (
        <section className="border-t border-[hsl(var(--border))] pt-6">
          <button
            type="button"
            onClick={() => void promptInstall()}
            className={cn(
              'inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-medium',
              'hover:bg-[hsl(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
            )}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            <span>{ko.pwa.install}</span>
          </button>
        </section>
      ) : null}
    </article>
  );
}

function Keystone(): React.JSX.Element {
  return (
    <blockquote
      className="rounded-md border-l-4 border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 p-5 text-sm leading-relaxed sm:text-base"
      aria-label="프로젝트 핵심 한 줄"
    >
      <p>{ko.about.keystone}</p>
    </blockquote>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm sm:text-[0.95rem]">{children}</div>
    </section>
  );
}
