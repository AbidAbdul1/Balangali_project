/**
 * User Authentication & Profile Routes
 *
 * Implements registration, login, logout, session tokens, scrypt password hashing,
 * profile updates, and password reset flow.
 */
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/database.ts';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  preferences: Record<string, any>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  authToken?: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)tm_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  try {
    const row = db
      .prepare(
        `SELECT s.token, s.expires_at, u.id, u.name, u.email, u.preferences_json
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.token = ?`
      )
      .get(token) as any;

    if (row && new Date(row.expires_at).getTime() > Date.now()) {
      req.authToken = row.token;
      req.user = {
        id: row.id,
        name: row.name,
        email: row.email,
        preferences: JSON.parse(row.preferences_json || '{}'),
      };
    }
  } catch {
    // Ignore invalid session lookup
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' },
      });
      return;
    }
    next();
  });
}

function createSession(userId: string): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(token, userId, expires.toISOString(), now.toISOString());
  return { token, expiresAt: expires.toISOString() };
}

export const authRouter = Router();

authRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_NAME', message: 'Name must be at least 2 characters.' } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' } });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters.' } });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' } });
    }

    const id = `usr_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, preferences_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, email, passwordHash, '{}', createdAt);

    const session = createSession(id);
    res.setHeader('Set-Cookie', `tm_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

    return res.status(201).json({
      success: true,
      token: session.token,
      user: { id, name, email, preferences: {} },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: { code: 'REGISTER_FAILED', message: 'Failed to create account.' } });
  }
});

authRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_CREDENTIALS', message: 'Email and password are required.' } });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const session = createSession(user.id);
    res.setHeader('Set-Cookie', `tm_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

    return res.json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferences: JSON.parse(user.preferences_json || '{}'),
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: { code: 'LOGIN_FAILED', message: 'Login failed.' } });
  }
});

authRouter.post('/auth/logout', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.authToken) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.authToken);
  }
  res.setHeader('Set-Cookie', 'tm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return res.json({ success: true });
});

authRouter.get('/auth/me', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json({ success: true, authenticated: false, user: null });
  }
  return res.json({ success: true, authenticated: true, user: req.user });
});

authRouter.patch('/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const name = req.body?.name ? String(req.body.name).trim() : user.name;
  const preferences = req.body?.preferences && typeof req.body.preferences === 'object'
    ? { ...user.preferences, ...req.body.preferences }
    : user.preferences;

  db.prepare('UPDATE users SET name = ?, preferences_json = ? WHERE id = ?').run(
    name,
    JSON.stringify(preferences),
    user.id
  );

  return res.json({
    success: true,
    user: { id: user.id, name, email: user.email, preferences },
  });
});

authRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    // Always return success message to prevent email enumeration
    return res.json({
      success: true,
      message: 'If an account exists for that email, a password reset token has been generated.',
    });
  }

  const resetToken = crypto.randomBytes(16).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO password_resets (token, user_id, expires_at, used) VALUES (?, ?, ?, 0)').run(
    resetToken,
    user.id,
    expires
  );

  return res.json({
    success: true,
    message: 'Password reset token generated (valid for 30 minutes).',
    // Returned in dev/local mode when no SMTP server is configured
    resetToken: process.env.NODE_ENV === 'production' ? undefined : resetToken,
  });
});

authRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.newPassword || '');

  if (!token || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_RESET', message: 'Valid reset token and password (min 8 chars) required.' },
    });
  }

  const row = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token) as any;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({
      success: false,
      error: { code: 'EXPIRED_TOKEN', message: 'Reset token is invalid or expired.' },
    });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), row.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);

  return res.json({ success: true, message: 'Password updated successfully. Please sign in.' });
});

// Google OAuth 2.0 Sign-In
authRouter.get('/auth/google/status', (_req: Request, res: Response) => {
  const enabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return res.json({ success: true, enabled });
});

authRouter.get('/auth/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(501).json({ success: false, error: 'Google OAuth is not configured on the server.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
  res.setHeader('Set-Cookie', `tm_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get('/auth/google/callback', async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const cookieHeader = req.headers.cookie || '';
    const stateMatch = cookieHeader.match(/(?:^|;\s*)tm_oauth_state=([^;]+)/);
    const savedState = stateMatch ? stateMatch[1] : '';

    if (!code || !state || state !== savedState) {
      return res.status(400).send('Invalid OAuth state or authorization code.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(401).send('Failed to exchange Google authorization code.');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();
    const email = String(profile.email || '').toLowerCase();
    const name = String(profile.name || email.split('@')[0] || 'Google User');

    if (!email) {
      return res.status(400).send('Google profile did not include an email address.');
    }

    let user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      const id = `usr_${crypto.randomUUID()}`;
      const randomSecret = crypto.randomBytes(24).toString('hex');
      db.prepare(
        'INSERT INTO users (id, name, email, password_hash, preferences_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, name, email, hashPassword(randomSecret), JSON.stringify({ authProvider: 'google' }), new Date().toISOString());
      user = { id };
    }

    const session = createSession(user.id);
    res.setHeader('Set-Cookie', [
      `tm_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      'tm_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ]);
    return res.redirect('/');
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return res.status(500).send('Google Sign-In failed.');
  }
});

