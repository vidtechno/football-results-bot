import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { executePurchase } from '@/lib/financial/engine';
import { createInSiteNotification } from '@/lib/notifications/inSite';
import { formatUZS } from '@/lib/utils/currency';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Xaridni amalga oshirish uchun tizimga kiring' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const workId = String(body.workId || '');
    const chapterId = body.chapterId ? String(body.chapterId) : null;
    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : undefined;

    if (!workId) {
      return NextResponse.json(
        { success: false, error: 'Asar identifikatori ko‘rsatilmagan' },
        { status: 400 },
      );
    }

    const adminForRisk = createAdminClient();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count: recentPurchases } = await adminForRisk.from('purchases')
      .select('id', { count: 'exact', head: true }).eq('buyer_id', profile.id).gte('created_at', tenMinutesAgo);
    if ((recentPurchases || 0) >= 5) {
      await adminForRisk.from('financial_risk_events').insert({
        user_id: profile.id, risk_type: 'purchase_velocity', risk_score: Math.min(95, 60 + (recentPurchases || 0) * 5),
        details: { workId, purchasesInTenMinutes: recentPurchases },
      });
    }

    const result = await executePurchase(
      profile.id,
      workId,
      chapterId,
      idempotencyKey,
    );

    if (!result.success) {
      if (/balans|mablag/i.test(result.error || '')) {
        await adminForRisk.from('financial_risk_events').insert({ user_id: profile.id, risk_type: 'repeated_insufficient_balance', risk_score: 25, details: { workId } });
      }
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Safely dispatch in-site notifications for both reader and author
    try {
      const admin = createAdminClient();
      const [{ data: work }, { data: chapter }] = await Promise.all([
        admin.from('works').select('id, title, slug, author_id').eq('id', workId).maybeSingle(),
        chapterId
          ? admin.from('chapters').select('id, title, chapter_number, slug').eq('id', chapterId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const workTitle = work?.title || 'Asar';
      const isFullWork = !chapterId;
      const readingLink = isFullWork
        ? `/asarlar/${work?.slug || workId}`
        : `/asarlar/${work?.slug || workId}/${chapter?.slug || chapterId}`;

      const purchaseSourceId = String(result.purchase_id || idempotencyKey);

      // Notify reader
      await createInSiteNotification({
        userId: profile.id,
        type: 'purchase_success',
        title: 'Xaridingiz muvaffaqiyatli yakunlandi',
        body: isFullWork
          ? `«${workTitle}» kitobini to‘liq xarid qildingiz. Barcha boblar mutolaaga tayyor!`
          : `«${workTitle}» asarining ${chapter?.chapter_number || ''}-bobi muvaffaqiyatli xarid qilindi.`,
        linkUrl: readingLink,
        sourceType: 'purchase',
        sourceId: purchaseSourceId,
        data: { workId, chapterId, grossAmount: result.gross_amount },
      });

      // Notify author if author exists and is not the buyer
      if (work?.author_id && work.author_id !== profile.id) {
        await createInSiteNotification({
          userId: work.author_id,
          type: 'sale_revenue',
          title: 'Asaringizdan yangi xarid!',
          body: `«${workTitle}» asaringiz ${isFullWork ? 'to‘liq' : 'bobi'} sotib olindi. Daromad hisobingizga tushdi.`,
          linkUrl: '/muallif',
          sourceType: 'sale',
          sourceId: purchaseSourceId,
          data: { workId, buyerId: profile.id },
        });
      }
    } catch {
      // Never allow notification failure to block purchase response
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
