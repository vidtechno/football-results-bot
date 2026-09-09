import { NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const authorId = new URL(request.url).searchParams.get('authorId');
  if (!authorId) return NextResponse.json({ error: 'Muallif ID talab qilinadi' }, { status: 400 });
  const { data, error } = await createAdminClient().from('author_subscription_plans').select('*').eq('author_id',authorId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ plan:data });
}
export async function PUT(request: Request) {
  const profile=await getCurrentProfile(request.headers.get('Authorization')); if(!profile) return NextResponse.json({error:'Kirish talab qilinadi'},{status:401});
  const body=await request.json(); const price=Math.floor(Number(body.monthlyPrice)); if(price<1000) return NextResponse.json({error:'Narx kamida 1 000 so‘m'},{status:400});
  const admin=createAdminClient(); const {data:author}=await admin.from('author_profiles').select('status').eq('user_id',profile.id).maybeSingle(); if(author?.status!=='approved') return NextResponse.json({error:'Tasdiqlangan muallif talab qilinadi'},{status:403});
  const {data,error}=await admin.from('author_subscription_plans').upsert({author_id:profile.id,monthly_price:price,title:String(body.title||'Muallif obunasi').slice(0,100),description:String(body.description||'').slice(0,1000)||null,is_active:Boolean(body.isActive),updated_at:new Date().toISOString()},{onConflict:'author_id'}).select().single();
  if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json({plan:data});
}
