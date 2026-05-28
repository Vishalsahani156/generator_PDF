import { EventItem } from '../lib/api';

interface Props {
  events: EventItem[];
  onDelete: (id: string) => void;
  deletingId?: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventList({ events, onDelete, deletingId }: Props) {
  return (
    <ul className="space-y-4">
      {events.map((event, idx) => (
        <li
          key={event.id}
          className="relative overflow-hidden rounded-lg border border-blue-200 bg-blue-50"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" aria-hidden />
          <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-lg border border-blue-600 px-2 py-1 text-xs font-medium text-blue-600">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <h3 className="truncate text-base font-semibold text-ink">{event.name}</h3>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-blue-300">When</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">
                    {formatDate(event.datetime)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-blue-300">Number</dt>
                  <dd className="mt-1 text-sm font-medium text-ink">{event.number}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-blue-300">Location</dt>
                  <dd className="mt-1 truncate text-sm font-medium text-ink">
                    {event.location}
                  </dd>
                </div>
              </dl>
            </div>
            <button
              type="button"
              onClick={() => onDelete(event.id)}
              disabled={deletingId === event.id}
              className="self-end rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 sm:self-auto"
            >
              {deletingId === event.id ? 'Removing…' : 'Delete'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
