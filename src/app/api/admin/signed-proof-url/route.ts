import { NextResponse } from 'next/server';
import { verifyAdminProfile } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminProfile(request.headers.get('Authorization'));
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu amalni bajarishi mumkin' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const filePath = String(body.path || '').trim();

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'Fayl yo‘li talab qilinadi' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Generate signed URL valid for 300 seconds (5 minutes)
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(filePath, 300);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Xavfsiz havola yaratishda xatolik' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
