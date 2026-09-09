import { NextResponse } from 'next/server';
import { verifyAdminProfile, logAdminAction } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/formatters';

const RIGHTS_BASES = new Set(['public_domain', 'licensed']);

export async function GET(request: Request) {
  const admin = await verifyAdminProfile(request.headers.get('Authorization'));
  if (!admin) return NextResponse.json({ success: false, error: 'Ruxsat berilmagan' }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('works')
    .select('id,title,slug,status,cover_url,original_title,original_author_name,source_language,translator_name,translation_rights_basis,created_at,updated_at')
    .eq('is_translation', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  const ids = (data || []).map((work) => work.id);
  const { data: evidence } = ids.length
    ? await supabase.from('translation_rights_evidence').select('work_id,rights_reference').in('work_id', ids)
    : { data: [] };
  const evidenceMap = new Map((evidence || []).map((item) => [item.work_id, item.rights_reference]));
  return NextResponse.json({ success: true, works: (data || []).map((work) => ({ ...work, rights_reference: evidenceMap.get(work.id) || null })) });
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminProfile(request.headers.get('Authorization'));
    if (!admin) return NextResponse.json({ success: false, error: 'Faqat administrator tarjima asar qo‘sha oladi' }, { status: 403 });

    const body = await request.json();
    const id = body.id ? String(body.id) : null;
    const title = String(body.title || '').trim();
    const originalAuthorName = String(body.originalAuthorName || '').trim();
    const sourceLanguage = String(body.sourceLanguage || '').trim();
    const rightsBasis = String(body.rightsBasis || '').trim();
    const genreIds = Array.isArray(body.genreIds) ? body.genreIds.map(String).filter(Boolean) : [];

    if (!title || !originalAuthorName || !sourceLanguage) {
      return NextResponse.json({ success: false, error: 'Asar nomi, original muallif va manba tili majburiy' }, { status: 400 });
    }
    if (!RIGHTS_BASES.has(rightsBasis) || body.rightsConfirmed !== true) {
      return NextResponse.json({ success: false, error: 'Nashr huquqi asosini tanlang va tasdiqlang' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const payload = {
      title,
      original_title: String(body.originalTitle || '').trim() || null,
      original_author_name: originalAuthorName,
      source_language: sourceLanguage,
      translator_name: String(body.translatorName || '').trim() || null,
      translation_rights_basis: rightsBasis,
      description: String(body.description || '').trim(),
      cover_url: String(body.coverUrl || '').trim() || null,
      type: body.type === 'serialized_story' ? 'serialized_story' : 'book',
      access_type: body.accessType === 'paid_full_work' ? 'paid_full_work' : 'free',
      full_work_price: Math.max(0, Math.floor(Number(body.fullWorkPrice || 0))),
      completion_status: body.completionStatus === 'completed' ? 'completed' : 'ongoing',
      age_rating: String(body.ageRating || 'all'),
      is_translation: true,
      language: 'uz',
      updated_at: new Date().toISOString(),
    };

    let work;
    if (id) {
      const { data: existing } = await supabase.from('works').select('id,is_translation').eq('id', id).maybeSingle();
      if (!existing?.is_translation) return NextResponse.json({ success: false, error: 'Tarjima asar topilmadi' }, { status: 404 });
      const { data, error } = await supabase.from('works').update(payload).eq('id', id).select().single();
      if (error) throw error;
      work = data;
    } else {
      await supabase.from('author_profiles').upsert({
        user_id: admin.id,
        pen_name: admin.display_name || 'Manbora tahririyati',
        status: 'approved',
      }, { onConflict: 'user_id', ignoreDuplicates: true });

      let slug = slugify(title) || `tarjima-${Date.now()}`;
      const { data: duplicate } = await supabase.from('works').select('id').eq('slug', slug).maybeSingle();
      if (duplicate) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from('works').insert({
        ...payload,
        author_id: admin.id,
        slug,
        status: 'draft',
        is_archived: false,
      }).select().single();
      if (error) throw error;
      work = data;
    }

    await supabase.from('work_genres').delete().eq('work_id', work.id);
    if (genreIds.length) await supabase.from('work_genres').insert(genreIds.map((genreId: string) => ({ work_id: work.id, genre_id: genreId })));
    await supabase.from('translation_rights_evidence').upsert({
      work_id: work.id,
      rights_reference: String(body.rightsReference || '').trim() || null,
      created_by: admin.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'work_id' });
    await logAdminAction(supabase, admin.id, id ? 'update_translated_work' : 'create_translated_work', 'works', work.id, {
      original_author_name: originalAuthorName,
      source_language: sourceLanguage,
      rights_basis: rightsBasis,
    });

    return NextResponse.json({ success: true, work });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Tarjima asarni saqlashda xatolik' }, { status: 500 });
  }
}
