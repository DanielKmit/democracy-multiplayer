import Pusher from 'pusher';
import { NextRequest } from 'next/server';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  const { channel, event, data, socketId } = await req.json();

  // Trigger event on the channel, excluding the sender's socket
  await pusher.trigger(channel, event, data, { socket_id: socketId });

  return Response.json({ ok: true });
}
