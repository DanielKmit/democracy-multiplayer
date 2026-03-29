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
  const body = await req.json();
  const { socket_id, channel_name } = body;

  // Authorize the user for the private channel
  const auth = pusher.authorizeChannel(socket_id, channel_name);
  return Response.json(auth);
}
