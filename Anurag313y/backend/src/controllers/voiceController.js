import { validateEventPayload } from '../utils/invoiceHelpers.js';

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';
const DEFAULT_DEEPGRAM_PARAMS = {
  model: 'nova-2',
  language: 'en',
  punctuate: 'true',
  smart_format: 'true',
  numerals: 'true',
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const getEnvOrThrow = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    const err = new Error(`${name} is not configured`);
    err.statusCode = 500;
    throw err;
  }
  return value;
};

const buildQuery = (params) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const inMemoryRate = new Map();
const checkRateLimit = (key, { limit, windowMs }) => {
  const now = Date.now();
  const current = inMemoryRate.get(key);
  if (!current || current.resetAt <= now) {
    inMemoryRate.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { ok: true, remaining: limit - current.count, resetAt: current.resetAt };
};

const safeJsonParse = (text) => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
};

const extractRetryAfterSeconds = (text) => {
  if (!text) return null;
  const m = String(text).match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (!m) return null;
  const seconds = Number(m[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.ceil(seconds);
};

const extractFirstJsonObject = (text) => {
  if (!text) return null;
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth === 0) {
      const candidate = text.slice(start, i + 1);
      const parsed = safeJsonParse(candidate);
      if (parsed.ok) return parsed.value;
      return null;
    }
  }
  return null;
};

const stripPlaceholderValue = (value) => {
  const v = String(value || '').trim();
  if (!v) return '';
  const lowered = v.toLowerCase();
  if (lowered === 'string') return '';
  if (lowered.startsWith('string(') && lowered.endsWith(')')) return '';
  if (lowered === 'undefined' || lowered === 'null' || lowered === 'n/a') return '';
  return v;
};

const toDigits = (value) => String(value || '').replace(/\D/g, '');

const pad2 = (n) => String(n).padStart(2, '0');
const toYmd = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseEventDateToYmd = (raw, { today = new Date() } = {}) => {
  const s = String(raw || '').trim();
  if (!s) return { ymd: '', warning: null };

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return { ymd: s, warning: null };
  }

  // Common slash formats: DD/MM/YYYY or MM/DD/YYYY
  const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!m) return { ymd: '', warning: 'Could not understand event date from transcript' };
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);

  const candidates = [];
  // Treat as DD/MM/YYYY
  candidates.push(new Date(`${y}-${pad2(b)}-${pad2(a)}`));
  // Treat as MM/DD/YYYY
  candidates.push(new Date(`${y}-${pad2(a)}-${pad2(b)}`));

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const valid = candidates.filter((d) => !Number.isNaN(d.getTime()));
  const futureOrToday = valid.filter((d) => {
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return dd >= startOfToday;
  });

  if (futureOrToday.length === 1) return { ymd: toYmd(futureOrToday[0]), warning: null };
  if (futureOrToday.length > 1) {
    // Choose the earliest future date
    futureOrToday.sort((x, y2) => x.getTime() - y2.getTime());
    return { ymd: toYmd(futureOrToday[0]), warning: 'Ambiguous date format; picked the nearest future date' };
  }

  // No future date possible -> return empty, let UI ask user
  return { ymd: '', warning: 'Event date seems in the past or ambiguous; please select it manually' };
};

const heuristicExtractFromTranscript = (transcript) => {
  const t = String(transcript || '').trim();
  if (!t) {
    return {
      customerName: '',
      mobileNo: '',
      eventName: '',
      eventDate: '',
      warnings: ['Transcript was empty; cannot extract details'],
    };
  }

  const warnings = [];

  // Customer name: "my name is X" or "I am X"
  let customerName = '';
  const nameMatch =
    t.match(/\bmy name is\s+([a-z][a-z\s.'-]{1,60})/i) ||
    t.match(/\bi am\s+([a-z][a-z\s.'-]{1,60})/i);
  if (nameMatch?.[1]) {
    customerName = nameMatch[1].trim().replace(/\s+/g, ' ');
    // stop at common separators
    customerName = customerName.split(/\b(and|i want|i'd like|i would|to book|book)\b/i)[0].trim();
  }

  // Mobile number: capture any 10+ digit sequence and take last 10 digits
  let mobileNo = '';
  const digits = toDigits(t);
  if (digits.length >= 10) {
    mobileNo = digits.slice(-10);
  }

  // Event name: "event for/of <something>" or "book <something>"
  let eventName = '';
  const eventMatch =
    t.match(/\bevent\s+(?:for|of)\s+(?:a\s+|an\s+)?([a-z][a-z\s]{1,40})/i) ||
    t.match(/\bbook\s+(?:an?\s+)?([a-z][a-z\s]{1,40})\s+event/i);
  if (eventMatch?.[1]) {
    eventName = eventMatch[1].trim().replace(/\s+/g, ' ');
    eventName = eventName.split(/\b(on|for)\b/i)[0].trim();
  }

  // Date: first date-like token found
  let eventDate = '';
  const dateToken =
    t.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\b/)?.[1] ||
    t.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] ||
    '';
  if (dateToken) {
    const parsed = parseEventDateToYmd(dateToken, { today: new Date() });
    eventDate = parsed.ymd;
    if (parsed.warning) warnings.push(parsed.warning);
  } else {
    warnings.push('Could not find an event date in transcript');
  }

  return { customerName, mobileNo, eventName, eventDate, warnings };
};

export const transcribeVoice = async (req, res) => {
  try {
    const key = `voice:transcribe:${req.user.id}`;
    const rate = checkRateLimit(key, { limit: 20, windowMs: 60_000 });
    if (!rate.ok) {
      return res.status(429).json({
        success: false,
        message: 'Too many transcription requests. Please wait a minute and try again.',
      });
    }

    const deepgramKey = getEnvOrThrow('DEEPGRAM_API_KEY');
    const file = req.file;

    if (!file?.buffer?.length) {
      return res.status(400).json({
        success: false,
        message: 'audio file is required',
      });
    }

    const mimetype = file.mimetype || 'application/octet-stream';
    const qs = buildQuery(DEFAULT_DEEPGRAM_PARAMS);
    const url = `${DEEPGRAM_URL}?${qs}`;

    const dgRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        Accept: 'application/json',
        'Content-Type': mimetype,
      },
      body: file.buffer,
    });

    const dgText = await dgRes.text();
    if (!dgRes.ok) {
      return res.status(502).json({
        success: false,
        message: 'Deepgram transcription failed',
        details: dgText?.slice(0, 1000),
      });
    }

    const dgJson = safeJsonParse(dgText).value;
    const alt = dgJson?.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alt?.transcript || '';
    const confidence = alt?.confidence ?? null;
    const words = Array.isArray(alt?.words)
      ? alt.words.map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        }))
      : undefined;

    if (!transcript.trim()) {
      const duration = dgJson?.metadata?.duration ?? null;
      console.warn('Deepgram empty transcript', {
        userId: req.user.id,
        bytes: file.size,
        mimetype,
        duration,
      });
      return res.status(422).json({
        success: false,
        message:
          'No speech detected. Please record again and speak clearly (try 2–5 seconds). If you still see this error, your browser may be producing an unsupported audio format — try again after reload.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { transcript, confidence, words },
    });
  } catch (error) {
    console.error('Voice transcribe error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

export const extractEventFields = async (req, res) => {
  try {
    const key = `voice:extract:${req.user.id}`;
    const rate = checkRateLimit(key, { limit: 30, windowMs: 60_000 });
    if (!rate.ok) {
      return res.status(429).json({
        success: false,
        message: 'Too many extraction requests. Please wait a minute and try again.',
      });
    }

    const geminiKey = getEnvOrThrow('GEMINI_API_KEY');
    const transcript = String(req.body?.transcript || '').trim();

    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'transcript is required',
      });
    }

    const schemaHint = {
      customerName: 'string (required)',
      mobileNo: 'string (required, 10 digits India)',
      eventName: 'string (required)',
      eventDate: 'string (required, YYYY-MM-DD)',
      warnings: 'string[] (optional)',
    };

    const prompt = [
      'You extract event fields from a transcript.',
      'Return ONLY valid JSON (no markdown, no explanations).',
      'Do NOT output placeholder words like "string" or schema descriptions as values.',
      'If a field is unknown, return an empty string and add a warning explaining what is missing/ambiguous.',
      'Mobile must be digits only (no spaces, no +, no hyphens). Prefer Indian 10-digit numbers.',
      'Dates: output YYYY-MM-DD. If transcript uses 06/01/2026-style dates and it is ambiguous, still output the best guess but include a warning about ambiguity.',
      '',
      'Example output:',
      '{"customerName":"Anurag Yadav","mobileNo":"9876543210","eventName":"Birthday","eventDate":"2026-06-01","warnings":[]}',
      '',
      `JSON schema: ${JSON.stringify(schemaHint)}`,
      '',
      `Transcript: ${transcript}`,
    ].join('\n');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL,
    )}:generateContent?key=${encodeURIComponent(geminiKey)}`;

    const gmRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 400,
        },
      }),
    });

    const gmText = await gmRes.text();
    if (!gmRes.ok) {
      if (gmRes.status === 429) {
        const retryAfterSeconds = extractRetryAfterSeconds(gmText);
        return res.status(429).json({
          success: false,
          message:
            'Gemini quota exceeded. Enable billing / increase quota, or wait and retry.',
          retryAfterSeconds,
          details: gmText?.slice(0, 1000),
        });
      }
      return res.status(502).json({
        success: false,
        message: 'Gemini extraction failed',
        details: gmText?.slice(0, 1000),
      });
    }

    const gmJson = safeJsonParse(gmText).value;
    const rawText =
      gmJson?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || '';

    const parsed =
      safeJsonParse(rawText).value ||
      extractFirstJsonObject(rawText) ||
      extractFirstJsonObject(gmText);

    if (!parsed || typeof parsed !== 'object') {
      return res.status(502).json({
        success: false,
        message: 'Failed to parse extraction JSON',
      });
    }

    const dateParsed = parseEventDateToYmd(parsed.eventDate, { today: new Date() });
    const fields = {
      customerName: stripPlaceholderValue(parsed.customerName),
      mobileNo: toDigits(stripPlaceholderValue(parsed.mobileNo)),
      eventName: stripPlaceholderValue(parsed.eventName),
      eventDate: dateParsed.ymd,
    };

    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.map((w) => String(w)).filter(Boolean)
      : [];
    if (dateParsed.warning) warnings.push(dateParsed.warning);

    // Heuristic fallback (Gemini/Gemma can be inconsistent with strict JSON extraction).
    // Fill only missing fields so model output stays preferred.
    const heuristic = heuristicExtractFromTranscript(transcript);
    const mergedFields = {
      customerName: fields.customerName || heuristic.customerName,
      mobileNo: fields.mobileNo || heuristic.mobileNo,
      eventName: fields.eventName || heuristic.eventName,
      eventDate: fields.eventDate || heuristic.eventDate,
    };
    const mergedWarnings = [
      ...warnings,
      ...(heuristic.warnings?.length ? heuristic.warnings : []),
      ...(fields.customerName || fields.mobileNo || fields.eventName || fields.eventDate
        ? []
        : ['Used transcript fallback extraction because model returned empty fields']),
    ];

    // Validate using existing server-side rules (also normalizes mobile and date)
    const validation = validateEventPayload(mergedFields);
    const validationWarnings = Object.values(validation.errors || {});

    return res.status(200).json({
      success: true,
      data: {
        fields: {
          customerName: validation.normalized.customerName,
          mobileNo: validation.normalized.mobileNo,
          eventName: validation.normalized.eventName,
          eventDate: mergedFields.eventDate, // keep as YYYY-MM-DD for the form input
        },
        warnings: [...mergedWarnings, ...validationWarnings],
        transcript,
      },
    });
  } catch (error) {
    console.error('Voice extract error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

