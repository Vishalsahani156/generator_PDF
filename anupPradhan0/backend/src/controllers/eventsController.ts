import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { buildEventsPdf } from '../lib/pdf';

function toEventApi(e: { _id: unknown; name: string; datetime: Date; number: number; location: string }) {
  return {
    id: String(e._id),
    name: e.name,
    datetime: e.datetime,
    number: e.number,
    location: e.location,
  };
}

export async function listEvents(req: Request, res: Response): Promise<void> {
  const events = await Event.find({ user: req.auth!.sub }).sort({ datetime: 1 }).lean();
  res.json({ events: events.map(toEventApi) });
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const { name, datetime, number, location } = req.body ?? {};

  if (
    typeof name !== 'string' ||
    typeof location !== 'string' ||
    !datetime ||
    number === undefined ||
    number === null
  ) {
    res.status(400).json({ error: 'name, datetime, number, and location are required' });
    return;
  }

  const trimmedName = name.trim();
  const trimmedLocation = location.trim();
  if (!trimmedName || !trimmedLocation) {
    res.status(400).json({ error: 'name and location must not be blank' });
    return;
  }

  const when = new Date(datetime);
  if (isNaN(when.getTime())) {
    res.status(400).json({ error: 'datetime is invalid' });
    return;
  }

  const num = Number(number);
  if (!Number.isFinite(num)) {
    res.status(400).json({ error: 'number must be numeric' });
    return;
  }

  const event = await Event.create({
    user: req.auth!.sub,
    name: trimmedName,
    datetime: when,
    number: num,
    location: trimmedLocation,
  });

  res.status(201).json({ event: toEventApi(event) });
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const result = await Event.deleteOne({ _id: id, user: req.auth!.sub });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json({ ok: true });
}

function parseDateParam(raw: unknown): Date | undefined | null {
  if (raw === undefined || raw === '') return undefined;
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function downloadEventsPdf(req: Request, res: Response): Promise<void> {
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  if (from === null || to === null) {
    res.status(400).json({ error: 'from/to must be valid dates' });
    return;
  }

  // If `to` is a bare date (no time), include the whole day by snapping to end-of-day.
  let toBound = to;
  if (toBound && typeof req.query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) {
    toBound = new Date(toBound);
    toBound.setHours(23, 59, 59, 999);
  }

  if (from && toBound && from.getTime() > toBound.getTime()) {
    res.status(400).json({ error: '`from` must be on or before `to`' });
    return;
  }

  const datetimeFilter: Record<string, Date> = {};
  if (from) datetimeFilter.$gte = from;
  if (toBound) datetimeFilter.$lte = toBound;

  const eventsFilter: Record<string, unknown> = { user: req.auth!.sub };
  if (Object.keys(datetimeFilter).length > 0) eventsFilter.datetime = datetimeFilter;

  const [user, events] = await Promise.all([
    User.findById(req.auth!.sub).select('email name').lean(),
    Event.find(eventsFilter).sort({ datetime: 1 }).lean(),
  ]);

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="events.pdf"');
  res.setHeader('Cache-Control', 'no-store');

  await buildEventsPdf({
    ownerEmail: user.email,
    ownerName: user.name || undefined,
    events: events.map((e) => ({
      name: e.name,
      datetime: e.datetime,
      number: e.number,
      location: e.location,
    })),
    range: from || toBound ? { from, to: toBound } : undefined,
    sink: res,
  });
}
