import { defineMiddleware } from 'astro:middleware';
import { validateSession } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export const onRequest = defineMiddleware(async ({ request, url, redirect }, next) => {
  const path = url.pathname;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))) {
    return next();
  }

  // Check session cookie
  const cookieHeader = request.headers.get('cookie');
  const valid = await validateSession(cookieHeader);

  if (!valid) {
    // API routes get 401, pages get redirected
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/login', 302);
  }

  return next();
});
