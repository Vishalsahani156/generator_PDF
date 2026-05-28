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

export async function downloadEventsPdf(): Promise<void> {
  const response = await api.get('/events/pdf', { responseType: 'blob' });
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
