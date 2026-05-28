import { createClient } from '@deepgram/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

const GEMMA_MODEL = 'gemma-4-26b-a4b-it';

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

function tryParseArray(s: string): unknown[] | null {
  try {
    const v = JSON.parse(s);
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const inner = (v as { events?: unknown }).events;
      if (Array.isArray(inner)) return inner;
    }
  } catch {
    /* not parseable */
  }
  return null;
}

function extractJsonArray(raw: string): unknown[] | null {
  // Strip ``` or ```json fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  const whole = tryParseArray(cleaned);
  if (whole) return whole;

  // Scan for balanced top-level [...] arrays, return the last one that parses.
  // Respects string boundaries and escapes so brackets inside quoted strings
  // don't throw off the depth counter.
  let lastValid: unknown[] | null = null;
  let depth = 0;
  let arrStart = -1;
  let inString = false;
  let escaping = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (ch === '\\') {
        escaping = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '[') {
      if (depth === 0) arrStart = i;
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0 && arrStart >= 0) {
        const parsed = tryParseArray(cleaned.slice(arrStart, i + 1));
        if (parsed) lastValid = parsed;
        arrStart = -1;
      } else if (depth < 0) {
        depth = 0;
      }
    }
  }
  return lastValid;
}

export async function extractEvents(transcript: string, now: Date): Promise<ParsedEvent[]> {
  if (!env.geminiApiKey) {
    throw new VoiceConfigError('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: GEMMA_MODEL,
    generationConfig: {
      temperature: 0.1,
    },
  });

  const prompt = `You are a structured-data extractor. From the transcript below, extract every event the speaker mentions and return ONLY a JSON array — no prose, no markdown fences.

The current date and time is ${now.toISOString()}. Use it to resolve relative phrases like "tomorrow", "next Friday", or "this evening".

Each array element must be an object with exactly these keys:
- "name": short event title as a string (e.g. "Quarterly review")
- "datetime": ISO 8601 datetime string (e.g. "2026-06-15T14:30:00")
- "number": a numeric value the speaker associated with the event (attendee count, room number, phone digits, etc). If none was mentioned, use 0.
- "location": where the event happens as a string. If not mentioned, use "TBD".

If the speaker mentions multiple events, return one element per event. If there are none, return [].

Output rules:
- Output MUST start with "[" and end with "]".
- No prose, no markdown, no \`\`\`json fences, no explanation.

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
      `Gemma request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const arr = extractJsonArray(raw);
  if (!arr) {
    throw new VoiceUpstreamError('Model did not return a JSON array');
  }

  const events: ParsedEvent[] = [];
  for (const candidate of arr) {
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
