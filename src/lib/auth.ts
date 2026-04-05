import { env } from 'cloudflare:workers';

const COOKIE_NAME = 'hbo-session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

async function sign(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${value}.${sigHex}`;
}

async function verify(signed: string, secret: string): Promise<string | null> {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;

  const value = signed.slice(0, lastDot);
  const expected = await sign(value, secret);
  if (expected !== signed) return null;

  return value;
}

export async function createSessionCookie(): Promise<string> {
  const token = crypto.randomUUID();
  const signed = await sign(token, env.APP_SECRET);
  return `${COOKIE_NAME}=${signed}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export async function validateSession(cookieHeader: string | null): Promise<boolean> {
  if (!cookieHeader) return false;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!sessionCookie) return false;

  const value = sessionCookie.slice(COOKIE_NAME.length + 1);
  const result = await verify(value, env.APP_SECRET);
  return result !== null;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function validatePassword(input: string): boolean {
  return input === env.APP_PASSWORD;
}
