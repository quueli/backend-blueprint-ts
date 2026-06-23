import { guard, leadEvents } from 'backend-blueprint';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await guard(authOptions);
  if (!session) return new Response('unauthorized', { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: 'connected', at: new Date().toISOString() });

      const unsubscribe = leadEvents.subscribe((event) => send(event));

      // proxies kill an idle stream, so keep pinging
      const heartbeat = setInterval(() => {
        send({ type: 'ping', at: new Date().toISOString() });
      }, 25_000);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
