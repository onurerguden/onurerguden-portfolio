import { timingSafeEqual } from 'node:crypto';
import { synchronize } from '@/lib/github/core';
import { createStore } from '@/lib/github/store';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const store = createStore();
  const token = process.env.GITHUB_TOKEN;
  if (!store || !token) return Response.json({ error: 'Integration unavailable' }, { status: 503 });
  try {
    const result = await synchronize(store, token, `cron-${crypto.randomUUID()}`);
    return Response.json({ ok: true, result });
  } catch {
    console.error('GitHub reconciliation failed; prior snapshot retained.');
    return Response.json({ error: 'Reconciliation failed' }, { status: 503 });
  }
}
