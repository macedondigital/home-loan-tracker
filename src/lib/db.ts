import { env } from 'cloudflare:workers';

export function getDB(): D1Database {
  return env.DB;
}
