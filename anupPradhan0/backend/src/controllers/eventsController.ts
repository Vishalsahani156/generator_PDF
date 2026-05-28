import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { buildEventsPdf } from '../lib/pdf';
import {
  extractEvents,
  NoSpeechError,
  transcribeAudio,
  VoiceConfigError,
  VoiceUpstreamError,
} from '../lib/voiceExtract';

interface NormalizedEventInput {
  name: string;
  datetime: Date;
  number: number;
  location: string;
}

function validateEventInput(raw: unknown): NormalizedEventInput | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'event payload required' };
  const o = raw as Record<string, unknown>;

  if (
    typeof o.name !== 'string' ||
    typeof o.location !== 'string' ||
    !o.datetime ||
    o.number === undefined ||
    o.number === null
  ) {
    return { error: 'name, datetime, number, and location are required' };
  }

  const trimmedName = o.name.trim();
  const trimmedLocation = o.location.trim();
  if (!trimmedName || !trimmedLocation) {
    return { error: 'name and location must not be blank' };
  }

  const when = new Date(o.datetime as string | number);
  if (isNaN(when.getTime())) return { error: 'datetime is invalid' };

  const num = Number(o.number);
  if (!Number.isFinite(num)) return { error: 'number must be numeric' };

  return { name: trimmedName, datetime: when, number: num, location: trimmedLocation };
}

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
  const result = validateEventInput(req.body);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  const event = await Event.create({
    user: req.auth!.sub,
    ...result,
  });

  res.status(201).json({ event: toEventApi(event) });
}

export async function bulkCreateEvents(req: Request, res: Response): Promise<void> {
  const body = req.body as { events?: unknown };
  if (!body || !Array.isArray(body.events)) {
    res.status(400).json({ error: 'events array is required' });
    return;
  }
  if (body.events.length === 0) {
    res.json({ events: [] });
    return;
  }
  if (body.events.length > 50) {
    res.status(400).json({ error: 'at most 50 events per request' });
    return;
  }

  const validated: NormalizedEventInput[] = [];
  for (let i = 0; i < body.events.length; i++) {
    const result = validateEventInput(body.events[i]);
    if ('error' in result) {
      res.status(400).json({ error: `events[${i}]: ${result.error}` });
      return;
    }
    validated.push(result);
  }

  const docs = await Event.insertMany(
    validated.map((v) => ({ user: req.auth!.sub, ...v }))
  );

  res.status(201).json({ events: docs.map(toEventApi) });
}

export async function voiceExtract(req: Request, res: Response): Promise<void> {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ error: 'audio file is required (multipart field "audio")' });
    return;
  }

  try {
    const transcript = await transcribeAudio(file.buffer, file.mimetype);
    const events = await extractEvents(transcript, new Date());
    res.json({ transcript, events });
  } catch (err) {
    if (err instanceof VoiceConfigError) {
      res.status(501).json({ error: 'Voice features are not configured on this server' });
      return;
    }
    if (err instanceof NoSpeechError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof VoiceUpstreamError) {
      res.status(502).json({ error: err.message });
      return;
    }
    throw err;
  }
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
