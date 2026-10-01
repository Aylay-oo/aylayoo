'use client';

import { useCallback } from 'react';
import { getMessages, type ContactMessage } from '../../lib/admin-api';
import { useResource } from '../../lib/use-resource';

/* The inbox: enquiries about guides and bookings for trips, newest first.
 *
 * The API already orders by created_at descending, so no sorting happens here — but the
 * ordering is part of the contract, and it is what makes the screen useful at a glance.
 */

/** Whichever way this person asked to be reached. */
function reachOf(message: ContactMessage) {
  if (message.phone) return { href: `tel:${message.phone}`, text: message.phone };
  if (message.email) return { href: `mailto:${message.email}`, text: message.email };
  // The API requires one of the two, so this only happens for rows predating that rule.
  return null;
}

/* createdAt arrives as an ISO 8601 string. The column is a unix timestamp, but drizzle's
 * `mode: 'timestamp'` hands back a Date and JSON serialises it — a detail worth stating,
 * because treating it as seconds silently renders "Invalid Date" for every row.
 *
 * Also tolerates a number, so a raw timestamp from a future endpoint does not break the
 * screen, and falls back to the original value if it is neither. */
function parse(value: string | number): Date | null {
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function when(value: string | number): string {
  const date = parse(value);
  if (!date) return String(value);
  return new Intl.DateTimeFormat('mn-MN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function Messages({ token }: { token: string }) {
  const fetcher = useCallback(() => getMessages(token), [token]);
  const messages = useResource(fetcher);

  if (messages.loading) return <p className="admin-muted">Ачаалж байна…</p>;

  if (messages.error) {
    return (
      <div className="notice">
        <span>{messages.error}</span>
        <button type="button" onClick={messages.reload}>Дахин оролдох</button>
      </div>
    );
  }

  const rows = messages.data ?? [];

  return (
    <>
      <div className="admin-bar">
        <span className="found">{rows.length} мессеж</span>
        <button className="btn btn-soft admin-refresh" type="button" onClick={messages.reload}>
          Шинэчлэх
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="empty">Мессеж одоохондоо алга.</div>
      ) : (
        <ul className="admin-messages">
          {rows.map((message) => {
            const reach = reachOf(message);
            const booking = message.kind === 'booking';

            return (
              <li className="admin-message" key={message.id}>
                <div className="admin-message-top">
                  <span className={booking ? 'badge driver' : 'badge guide'}>
                    {booking ? 'Захиалга' : 'Холбогдох'}
                  </span>
                  <b>{message.name}</b>
                  {reach && <a href={reach.href}>{reach.text}</a>}
                  <time dateTime={parse(message.createdAt)?.toISOString()}>
                    {when(message.createdAt)}
                  </time>
                </div>

                {message.subject && (
                  <p className="admin-subject">
                    {booking ? 'Аялал: ' : 'Хөтөч: '}
                    <b>{message.subject}</b>
                  </p>
                )}

                {/* Whitespace preserved: people write these in lines, and collapsing them
                    turns a list of dates and numbers into one run-on sentence. */}
                <p className="admin-body">{message.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
