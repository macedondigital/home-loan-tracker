import type { APIRoute } from 'astro';
import { validatePassword, createSessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const password = body?.password;

    if (!password || typeof password !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Password is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!validatePassword(password)) {
      return new Response(JSON.stringify({ success: false, error: 'Incorrect password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cookie = await createSessionCookie();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
