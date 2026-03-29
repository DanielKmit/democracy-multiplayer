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
    // Pusher sends data as form-urlencoded, not JSON
    const formData = await req.formData();
    const socket_id = formData.get('socket_id') as string;
    const channel_name = formData.get('channel_name') as string;

    if (!socket_id || !channel_name) {
      return Response.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    console.log('[Pusher Auth] Authorizing:', { socket_id, channel_name });

    // Check if it's a presence channel
    const isPresence = channel_name.startsWith('presence-');
    
    let authResponse;
    if (isPresence) {
      // For presence channels, provide user data
      authResponse = pusher.authorizeChannel(socket_id, channel_name, {
        user_id: socket_id,
        user_info: { name: 'Player' }
      });
    } else {
      // For private channels
      authResponse = pusher.authorizeChannel(socket_id, channel_name);
    }
    
    console.log('[Pusher Auth] Success:', authResponse);
    return Response.json(authResponse);
  } catch (error: any) {
    console.error('[Pusher Auth] Error:', error);
    console.error('[Pusher Auth] Stack:', error?.stack);
    return Response.json(
      { 
        error: 'Authorization failed', 
        details: error instanceof Error ? error.message : String(error),
        stack: error?.stack 
      },
      { status: 500 }
    );
  }
}
