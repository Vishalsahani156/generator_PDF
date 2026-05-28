import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
    email,
    password,
  });
  localStorage.setItem('token', data.token);
  return data.user;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthUser> {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
    email,
    password,
    name,
  });
  localStorage.setItem('token', data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
  }
}

export interface EventItem {
  id: string;
  name: string;
  datetime: string;
  number: number;
  location: string;
}

export interface EventInput {
  name: string;
  datetime: string;
  number: number;
  location: string;
}

export async function listEvents(): Promise<EventItem[]> {
  const { data } = await api.get<{ events: EventItem[] }>('/events');
  return data.events;
}

export async function createEvent(input: EventInput): Promise<EventItem> {
  const { data } = await api.post<{ event: EventItem }>('/events', input);
  return data.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}`);
}

export interface PdfRange {
  from?: string;
  to?: string;
}

export interface ParsedEvent {
  name: string;
  datetime: string;
  number: number;
  location: string;
}

export async function voiceExtract(audio: Blob): Promise<{
  transcript: string;
  events: ParsedEvent[];
}> {
  const form = new FormData();
  const ext = audio.type.includes('webm') ? 'webm' : audio.type.includes('wav') ? 'wav' : 'audio';
  form.append('audio', audio, `recording.${ext}`);
  const { data } = await api.post<{ transcript: string; events: ParsedEvent[] }>(
    '/events/voice',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function bulkCreateEvents(events: EventInput[]): Promise<EventItem[]> {
  const { data } = await api.post<{ events: EventItem[] }>('/events/bulk', { events });
  return data.events;
}

export async function downloadEventsPdf(range?: PdfRange): Promise<void> {
  const params: Record<string, string> = {};
  if (range?.from) params.from = range.from;
  if (range?.to) params.to = range.to;
  const response = await api.get('/events/pdf', { responseType: 'blob', params });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'events.pdf';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Defer revoke so async download dispatchers (Safari, older Firefox) finish reading.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
