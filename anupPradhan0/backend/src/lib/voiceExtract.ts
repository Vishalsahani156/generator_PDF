import { createClient } from '@deepgram/sdk';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { env } from '../config/env';

export interface ParsedEvent {
  name: string;
  datetime: string; // ISO 8601
  number: number;
  location: string;
}

export class VoiceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceConfigError';
  }
}

export class VoiceUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceUpstreamError';
  }
}

export class NoSpeechError extends Error {
  constructor() {
    super('No speech detected in the audio');
    this.name = 'NoSpeechError';
  }
}

export async function transcribeAudio(buffer: Buffer, mimetype: string): Promise<string> {
  if (!env.deepgramApiKey) {
    throw new VoiceConfigError('DEEPGRAM_API_KEY is not configured');
  }

  const deepgram = createClient(env.deepgramApiKey);

  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(buffer, {
      model: 'nova-2',
      smart_format: true,
      punctuate: true,
      language: 'en',
      mimetype,
    });

    if (error) {
      throw new VoiceUpstreamError(`Deepgram: ${error.message ?? String(error)}`);
    }

    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';

    if (!transcript) throw new NoSpeechError();
    return transcript;
  } catch (err) {
    if (err instanceof VoiceConfigError) throw err;
    if (err instanceof VoiceUpstreamError) throw err;
    if (err instanceof NoSpeechError) throw err;
    throw new VoiceUpstreamError(
      `Deepgram request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

const eventResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    events: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: 'Short event title' },
          datetime: {
            type: SchemaType.STRING,
            description: 'ISO 8601 datetime in the user’s local time, e.g. 2026-06-15T14:30:00',
          },
          number: {
            type: SchemaType.NUMBER,
            description:
              'Any numeric value associated with the event (e.g. attendee count, room number).',
          },
          location: { type: SchemaType.STRING, description: 'Where the event happens' },
        },
        required: ['name', 'datetime', 'number', 'location'],
      },
    },
  },
  required: ['events'],
} as const;

export async function extractEvents(transcript: string, now: Date): Promise<ParsedEvent[]> {
  if (!env.geminiApiKey) {
    throw new VoiceConfigError('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: eventResponseSchema as any,
      temperature: 0.1,
    },
  });

  const prompt = `Extract one or more events from this transcript. The current date and time is ${now.toISOString()} (use this to resolve relative dates like "tomorrow", "next Friday", "this evening").

For each event, return:
- name: the short title (e.g. "Quarterly review")
- datetime: ISO 8601 datetime
- number: the numeric value the speaker mentioned (attendee count, room number, phone digits, etc). If the speaker did not mention a number, use 0.
- location: where it happens. If not mentioned, use "TBD".

A single transcript may describe multiple events. Always return an array, even if there is only one event. Do not invent events that are not mentioned.

Transcript:
"""
${transcript}
"""`;

  let raw: string;
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text();
  } catch (err) {
    throw new VoiceUpstreamError(
      `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let parsed: { events?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new VoiceUpstreamError('Gemini returned non-JSON output');
  }

  if (!parsed || !Array.isArray(parsed.events)) return [];

  const events: ParsedEvent[] = [];
  for (const candidate of parsed.events) {
    if (!candidate || typeof candidate !== 'object') continue;
    const c = candidate as Record<string, unknown>;

    const name = typeof c.name === 'string' ? c.name.trim() : '';
    const location = typeof c.location === 'string' ? c.location.trim() : '';
    const datetimeRaw = typeof c.datetime === 'string' ? c.datetime : '';
    const numberRaw = typeof c.number === 'number' ? c.number : Number(c.number);

    if (!name) continue;
    const when = new Date(datetimeRaw);
    if (isNaN(when.getTime())) continue;
    if (!Number.isFinite(numberRaw)) continue;

    events.push({
      name,
      datetime: when.toISOString(),
      number: numberRaw,
      location: location || 'TBD',
    });
  }

  return events;
}
