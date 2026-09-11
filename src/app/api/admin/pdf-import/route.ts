import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminAction } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { detectChapters, validateIntegrity } from '@/lib/pdf-import/detector';
import { analyzePageFurniture, extractPdf } from '@/lib/pdf-import/extract';
import { reviewLowConfidenceChapters } from '@/lib/pdf-import/ai';
import { sanitizeRichText } from '@/lib/utils/sanitizer';
import type { ImportChapter } from '@/lib/pdf-import/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const SCANNED_MESSAGE =
  'Bu PDF matnli formatda emas. Hozircha faqat matni tanlash mumkin bo‘lgan PDF fayllar qo‘llab-quvvatlanadi.';

async function adminFor(request: NextRequest) {
  try {
    return await requireAdmin(request.headers.get('Authorization'));
  } catch {
    return null;
  }
}
const denied = () => NextResponse.json({ error: 'Faqat administratorlar uchun' }, { status: 403 });
function toClientSession<T extends Record<string, any>>(session: T) {
  const { raw_text: _rawText, pages: _pages, ...safe } = session;
  return {
    ...safe,
    chapters: Array.isArray(safe.chapters)
      ? safe.chapters.map(({ sourceText: _sourceText, ...chapter }: ImportChapter) => chapter)
      : safe.chapters,
  };
}

function hydrateSourceCoverage(rawText: string, chapters: ImportChapter[]) {
  const hydrated = chapters.map((chapter, index) => {
    const sourceStart = Number(chapter.sourceStart);
    const sourceEnd = Number(chapter.sourceEnd);
    if (
      !Number.isInteger(sourceStart) ||
      !Number.isInteger(sourceEnd) ||
      sourceStart < 0 ||
      sourceEnd > rawText.length ||
      sourceEnd <= sourceStart
    ) {
      throw new Error(`INVALID_SOURCE_RANGE_${index}`);
    }
    return {
      ...chapter,
      order: index + 1,
      sourceStart,
      sourceEnd,
      sourceText: rawText.slice(sourceStart, sourceEnd),
    };
  });
  const bySource = [...hydrated].sort((a, b) => a.sourceStart - b.sourceStart);
  let cursor = 0;
  let unassignedText = '';
  for (const chapter of bySource) {
    if (chapter.sourceStart < cursor) throw new Error('OVERLAPPING_SOURCE_RANGES');
    if (chapter.sourceStart > cursor) unassignedText += rawText.slice(cursor, chapter.sourceStart);
    cursor = chapter.sourceEnd;
  }
  if (cursor < rawText.length) unassignedText += rawText.slice(cursor);
  return { chapters: hydrated, unassignedText };
}

export async function GET(request: NextRequest) {
  const adminProfile = await adminFor(request);
  if (!adminProfile) return denied();
  const db = createAdminClient();
  const id = new URL(request.url).searchParams.get('id');
  if (id) {
    const { data, error } = await db
      .from('pdf_import_sessions')
      .select(
        'id,created_by,work_id,original_filename,status,chapters,unassigned_text,ignored_metadata,statistics,warning,error_message,expires_at,created_at,updated_at',
      )
      .eq('id', id)
      .eq('created_by', adminProfile.id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error || !data)
      return NextResponse.json(
        { error: 'Import sessiyasi topilmadi yoki muddati tugagan' },
        { status: 404 },
      );
    return NextResponse.json({ session: toClientSession(data) });
  }
  const { data, error } = await db
    .from('works')
    .select('id,title,status,author:author_profiles(pen_name)')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error)
    return NextResponse.json({ error: 'Asarlar ro‘yxatini olib bo‘lmadi' }, { status: 500 });
  return NextResponse.json({ works: data || [] });
}

export async function POST(request: NextRequest) {
  const adminProfile = await adminFor(request);
  if (!adminProfile) return denied();
  const db = createAdminClient();
  const action = new URL(request.url).searchParams.get('action') || 'extract';
  try {
    if (action === 'extract') {
      // Opportunistic cleanup keeps temporary imports bounded even when a cron job is not configured.
      await db.rpc('cleanup_expired_pdf_import_sessions').then(({ error }) => {
        if (error) console.warn('Expired PDF import cleanup skipped', { code: error.code });
      });
      const form = await request.formData();
      const file = form.get('file');
      const workId = String(form.get('workId') || '') || null;
      if (!(file instanceof File))
        return NextResponse.json({ error: 'PDF fayl tanlanmagan' }, { status: 400 });
      const maxBytes = Math.max(1_000_000, Number(process.env.PDF_IMPORT_MAX_BYTES) || 10_485_760);
      if (file.type !== 'application/pdf' || file.size > maxBytes)
        return NextResponse.json(
          {
            error: `Faqat PDF fayl qabul qilinadi. Maksimal hajm ${Math.round(maxBytes / 1_048_576)} MB.`,
          },
          { status: 400 },
        );
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-')
        return NextResponse.json({ error: 'Fayl haqiqiy PDF formatida emas' }, { status: 400 });
      let extracted;
      try {
        extracted = await extractPdf(buffer);
      } catch (error: any) {
        if (error?.message === 'SCANNED_PDF')
          return NextResponse.json({ error: SCANNED_MESSAGE }, { status: 422 });
        console.error('PDF extraction failed', { name: error?.name, message: error?.message });
        return NextResponse.json(
          { error: 'PDF matnini olishda xatolik yuz berdi' },
          { status: 422 },
        );
      }
      if (extracted.rawText.length > 3_000_000)
        return NextResponse.json({ error: 'PDF matni import uchun juda katta' }, { status: 413 });
      const furniture = analyzePageFurniture(extracted.pages);
      const detected = detectChapters(extracted.rawText, furniture.ranges);
      const statistics = {
        ...validateIntegrity(extracted.rawText, detected.chapters, detected.unassignedText),
        pageCount: extracted.pageCount,
      };
      const { data, error } = await db
        .from('pdf_import_sessions')
        .insert({
          created_by: adminProfile.id,
          work_id: workId,
          original_filename: file.name.slice(0, 240),
          status: 'needs_review',
          raw_text: extracted.rawText,
          pages: extracted.pages,
          chapters: detected.chapters,
          unassigned_text: detected.unassignedText,
          ignored_metadata: furniture.items,
          statistics,
        })
        .select()
        .single();
      if (error) throw error;
      await logAdminAction(
        db,
        adminProfile.id,
        'pdf_import_extracted',
        'pdf_import_session',
        data.id,
        {
          filename: file.name.slice(0, 240),
          pageCount: extracted.pageCount,
          characterCount: extracted.rawText.length,
        },
      );
      return NextResponse.json({ session: toClientSession(data) }, { status: 201 });
    }

    const body = await request.json();
    const { data: session } = await db
      .from('pdf_import_sessions')
      .select('*')
      .eq('id', String(body.sessionId || ''))
      .eq('created_by', adminProfile.id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!session)
      return NextResponse.json(
        { error: 'Import sessiyasi topilmadi yoki muddati tugagan' },
        { status: 404 },
      );
    if (action === 'analyze') {
      const reviewed = await reviewLowConfidenceChapters(
        adminProfile.id,
        session.chapters as ImportChapter[],
      );
      const { data, error } = await db
        .from('pdf_import_sessions')
        .update({
          chapters: reviewed.chapters,
          warning: reviewed.warning,
          status: 'needs_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ session: toClientSession(data) });
    }
    if (action === 'import') {
      const authorName = String(body.authorName || '').trim();
      if (authorName.length < 2 || authorName.length > 160)
        return NextResponse.json(
          { error: 'Muallif ism-familiyasini to‘g‘ri kiriting' },
          { status: 400 },
        );
      const chapters = (session.chapters as ImportChapter[]).sort((a, b) => a.order - b.order);
      const stats = validateIntegrity(session.raw_text, chapters, session.unassigned_text || '');
      if (stats.coverage < 1 || stats.unassignedCharacters > 0)
        return NextResponse.json(
          { error: 'Matn yaxlitligi tekshiruvi o‘tmadi. Aniqlanmagan matnni bobga biriktiring.' },
          { status: 409 },
        );
      const escapeHtml = (value: string) =>
        value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const payload = chapters.map((chapter) => ({
        title: chapter.title,
        content: sanitizeRichText(
          `<p>${escapeHtml(chapter.content)
            .replace(/\n{2,}/g, '</p><p>')
            .replace(/\n/g, '<br>')}</p>`,
        ),
      }));
      const { data, error } = await db.rpc('admin_import_pdf_chapters', {
        p_session_id: session.id,
        p_admin_id: adminProfile.id,
        p_work_id: String(body.workId || session.work_id || ''),
        p_chapters: payload,
        p_author_name: authorName,
      });
      if (error) {
        console.error('Atomic PDF import failed', {
          sessionId: session.id,
          code: error.code,
          message: error.message,
        });
        return NextResponse.json(
          { error: 'Boblarni import qilib bo‘lmadi. Hech qanday bob saqlanmadi.' },
          { status: 500 },
        );
      }
      await logAdminAction(
        db,
        adminProfile.id,
        'pdf_chapters_imported',
        'work',
        String(body.workId || session.work_id),
        { sessionId: session.id, imported: data?.imported },
      );
      return NextResponse.json({ success: true, result: data });
    }
    return NextResponse.json({ error: 'Noma’lum amal' }, { status: 400 });
  } catch (error: any) {
    console.error('PDF import request failed', {
      action,
      name: error?.name,
      message: error?.message,
    });
    return NextResponse.json(
      { error: 'PDF import jarayonida server xatosi yuz berdi' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const adminProfile = await adminFor(request);
  if (!adminProfile) return denied();
  try {
    const body = await request.json();
    const db = createAdminClient();
    const { data: session } = await db
      .from('pdf_import_sessions')
      .select('id,raw_text')
      .eq('id', String(body.sessionId || ''))
      .eq('created_by', adminProfile.id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!session)
      return NextResponse.json({ error: 'Import sessiyasi topilmadi' }, { status: 404 });
    const incomingChapters = Array.isArray(body.chapters) ? body.chapters : [];
    const { chapters, unassignedText } = hydrateSourceCoverage(
      session.raw_text,
      incomingChapters,
    );
    const statistics = validateIntegrity(session.raw_text, chapters, unassignedText);
    const { data, error } = await db
      .from('pdf_import_sessions')
      .update({
        chapters,
        unassigned_text: unassignedText,
        statistics,
        status: statistics.coverage === 1 && !unassignedText ? 'ready' : 'needs_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ session: toClientSession(data) });
  } catch (error: any) {
    console.error('PDF import session update failed', {
      name: error?.name,
      message: error?.message,
    });
    return NextResponse.json({ error: 'Import sessiyasini saqlab bo‘lmadi' }, { status: 500 });
  }
}
