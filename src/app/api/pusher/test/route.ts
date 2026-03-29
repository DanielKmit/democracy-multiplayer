import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAppId: !!process.env.PUSHER_APP_ID,
    hasKey: !!process.env.NEXT_PUBLIC_PUSHER_KEY,
    hasSecret: !!process.env.PUSHER_SECRET,
    hasCluster: !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    appId: process.env.PUSHER_APP_ID?.substring(0, 4) + '***',
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  });
}
