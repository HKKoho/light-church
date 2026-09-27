import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import type { SiteContact, SiteServiceTime } from '@clawix/shared';
import { L } from './site-label';

interface Props {
  readonly churchName: string;
  readonly contact: SiteContact;
  readonly serviceTimes: readonly SiteServiceTime[];
}

export function SiteFooter({ churchName, contact, serviceTimes }: Props) {
  return (
    <footer className="mt-16 border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-semibold">{churchName}</p>
          {serviceTimes.length > 0 && (
            <>
              <p className="mt-4 text-sm font-medium">
                <L k="serviceTimes" />
              </p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {serviceTimes.map((s) => (
                  <li key={s.label + s.time}>
                    {s.label}：{s.time}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-4 text-sm md:col-span-2">
          <p className="font-medium">
            <L k="contact" />
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {contact.locations.map((loc, i) => (
              <div key={i} className="space-y-1 text-muted-foreground">
                {loc.name && <p className="font-medium text-foreground">{loc.name}</p>}
                {loc.address && (
                  <p className="flex gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    {loc.address}
                  </p>
                )}
                {loc.phone && (
                  <p className="flex gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0" />
                    <a href={`tel:${loc.phone.replace(/[^\d+]/g, '')}`}>{loc.phone}</a>
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            {contact.phone && (
              <a
                className="flex items-center gap-2"
                href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
              >
                <Phone className="size-4" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a className="flex items-center gap-2" href={`mailto:${contact.email}`}>
                <Mail className="size-4" />
                {contact.email}
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {churchName} · <L k="poweredBy" />
          </span>
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
            <L k="staffLogin" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
