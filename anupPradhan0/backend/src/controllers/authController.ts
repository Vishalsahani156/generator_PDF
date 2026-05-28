import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { signToken } from '../middleware/auth';

const COOKIE_NAME = 'token';
const COOKIE_BASE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...COOKIE_BASE_OPTS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, COOKIE_BASE_OPTS);
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'password must be at least 6 characters' });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(409).json({ error: 'email is already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    name: typeof name === 'string' ? name.trim() : '',
  });

  const token = signToken({ sub: String(user._id), email: user.email });
  setAuthCookie(res, token);

  res.status(201).json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ sub: String(user._id), email: user.email });
  setAuthCookie(res, token);

  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.auth!.sub).select('email name');
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user: { id: user._id, email: user.email, name: user.name } });
}
