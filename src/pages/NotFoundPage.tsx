import { Link } from 'react-router-dom';
import { ko } from '@/i18n/ko';

/**
 * SPEC-PQC-001 REQ-APP-004: 404 fallback with link back to /
 */
export function NotFoundPage(): React.JSX.Element {
  return (
    <section
      aria-labelledby="notfound-title"
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center"
    >
      <p className="font-mono text-5xl font-bold text-[hsl(var(--muted-foreground))]">
        {ko.pages.notFound.code}
      </p>
      <h1 id="notfound-title" className="text-xl font-semibold">
        {ko.pages.notFound.title}
      </h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {ko.pages.notFound.body}
      </p>
      <Link
        to="/"
        className="rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
      >
        {ko.pages.notFound.cta}
      </Link>
    </section>
  );
}
