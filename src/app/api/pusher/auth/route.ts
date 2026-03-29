import Pusher from 'pusher';
import { NextRequest } from 'next/server';

// Validate env vars
if (!process.env.PUSHER_APP_ID || !process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
  throw new Error('Missing Pusher environment variables');
}

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { socket_id, channel_name } = body;

    console.log('[Pusher Auth] Authorizing:', { socket_id, channel_name });

    // Authorize the user for the private channel
    const auth = pusher.authorizeChannel(socket_id, channel_name);
    
    console.log('[Pusher Auth] Success:', auth);
    return Response.json(auth);
  } catch (error) {
    console.error('[Pusher Auth] Error:', error);
    return Response.json(
      { error: 'Authorization failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
