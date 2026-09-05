import { after } from 'next/server';
import { parseEvent, synchronize, verifySignature } from '@/lib/github/core';
import { createStore } from '@/lib/github/store';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_BODY = 2 * 1024 * 1024;

async function readBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let length = 0;
  const timeout = setTimeout(() => void reader.cancel(), 4000);
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > MAX_BODY) { await reader.cancel(); throw new Error('Body too large'); }
      chunks.push(part.value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { clearTimeout(timeout); }
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const token = process.env.GITHUB_TOKEN;
  const store = createStore();
  if (!secret || !token || !store) return Response.json({ error: 'Integration unavailable' }, { status: 503 });
  let body: string;
  try { body = await readBody(request); } catch { return Response.json({ error: 'Invalid body' }, { status: 413 }); }
  if (!verifySignature(body, request.headers.get('x-hub-signature-256'), secret)) return Response.json({ error: 'Invalid signature' }, { status: 401 });
  const kind = request.headers.get('x-github-event');
  if (kind === 'ping') return Response.json({ ok: true });
  if (kind !== 'push' && kind !== 'repository') return Response.json({ ignored: true });
  const delivery = request.headers.get('x-github-delivery');
  if (!delivery || !/^[\w-]{1,100}$/.test(delivery)) return Response.json({ error: 'Invalid delivery' }, { status: 400 });
  let event: ReturnType<typeof parseEvent>;
  try { event = parseEvent(body); } catch { return Response.json({ error: 'Invalid repository' }, { status: 400 }); }
  // Remove confirmed nonpublic data before acknowledging, even when GitHub is down.
  if (event.remove) {
    try { await store.remove(event.id); } catch { return Response.json({ error: 'Integration unavailable' }, { status: 503 }); }
  }
  after(async () => {
    try { await synchronize(store, token, delivery, fetch, event.remove ? event.id : undefined); }
    catch { console.error('GitHub sync failed; redeliver webhook or run reconciliation.'); }
  });
  return Response.json({ accepted: true }, { status: 202 });
}
