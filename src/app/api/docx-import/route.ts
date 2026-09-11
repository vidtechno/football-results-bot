import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';
import { sanitizeRichText } from '@/lib/utils/sanitizer';
import { analyzeDocxTechnicalIssues, applyConfirmedSuggestion } from '@/lib/docx-import/ai';
import { parseDocx, validateDocxIntegrity } from '@/lib/docx-import/parser';
import { htmlToPlainText } from '@/lib/docx-import/text';
import type { AiSuggestion, DocxChapter } from '@/lib/docx-import/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const MAX_CHAPTERS = 1_000;
const MAX_TOTAL_HTML = 3_000_000;

function safeSession<T extends Record<string, any>>(session: T) {
  const { raw_text: _raw, expected_body_text: _expected, ...safe } = session;
  return safe;
}

function friendlyError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'INVALID_DOCX_SIGNATURE' || code === 'INVALID_DOCX_STRUCTURE')
    return 'Fayl haqiqiy DOCX formatida emas.';
  if (code === 'CORRUPT_DOCX') return 'DOCX fayl buzilgan yoki noto‘g‘ri formatda.';
  if (code === 'ENCRYPTED_DOCX')
    return 'Parol bilan himoyalangan DOCX fayl qo‘llab-quvvatlanmaydi.';
  if (code === 'DOCX_ARCHIVE_LIMIT') return 'DOCX ichki hajmi xavfsizlik limitidan oshib ketgan.';
  if (code === 'EMPTY_DOCX') return 'DOCX faylda import qilinadigan matn topilmadi.';
  if (code === 'DOCX_TEXT_LOSS')
    return 'Import vaqtida matnning bir qismi yo‘qolishi mumkin. Iltimos, faylni tekshiring.';
  return 'DOCX faylni qayta ishlashda xatolik yuz berdi.';
}

async function authorize(request: NextRequest, workId: string) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return { error: 'Avtorizatsiya talab qilinadi', status: 401 } as const;
  const db = createAdminClient();
  const [{ data: work }, { data: author }] = await Promise.all([
    db
      .from('works')
      .select('id,author_id,title,slug,status,is_archived')
      .eq('id', workId)
      .maybeSingle(),
    db.from('author_profiles').select('status').eq('user_id', profile.id).maybeSingle(),
  ]);
  const isAdmin = profile.is_admin === true || profile.role === 'admin';
  if (!work || (work.author_id !== profile.id && !isAdmin)) {
    return { error: 'Asar topilmadi yoki sizga tegishli emas', status: 403 } as const;
  }
  if (!isAdmin && author?.status !== 'approved') {
    return { error: 'Faqat tasdiqlangan mualliflar DOCX import qila oladi', status: 403 } as const;
  }
  return { profile, db, work, isAdmin };
}

async function loadSession(
  db: ReturnType<typeof createAdminClient>,
  actorId: string,
  sessionId: string,
) {
  const { data } = await db
    .from('document_import_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('created_by', actorId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return data;
}

function normalizeIncomingChapters(value: unknown): DocxChapter[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_CHAPTERS) {
    throw new Error('INVALID_CHAPTERS');
  }
  let totalHtml = 0;
  return value.map((item: any, index) => {
    const title = String(item.title || '')
      .trim()
      .slice(0, 180);
    const contentHtml = sanitizeRichText(String(item.contentHtml || ''));
    const plainText = htmlToPlainText(contentHtml);
    totalHtml += contentHtml.length;
    if (!title || !plainText || totalHtml > MAX_TOTAL_HTML) throw new Error('INVALID_CHAPTERS');
    return {
      id: String(item.id || randomUUID()),
      title,
      contentHtml,
      plainText,
      order: index + 1,
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
    };
  });
}

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get('id') || '';
  const workId = new URL(request.url).searchParams.get('workId') || '';
  const auth = await authorize(request, workId);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const session = await loadSession(auth.db, auth.profile.id, sessionId);
  if (!session) return NextResponse.json({ error: 'Import sessiyasi topilmadi' }, { status: 404 });
  return NextResponse.json({ session: safeSession(session) });
}

export async function POST(request: NextRequest) {
  const action = new URL(request.url).searchParams.get('action') || 'extract';
  try {
    if (action === 'extract') {
      const form = await request.formData();
      const file = form.get('file');
      const workId = String(form.get('workId') || '');
      const auth = await authorize(request, workId);
      if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
      if (!(file instanceof File))
        return NextResponse.json({ error: 'DOCX fayl tanlanmagan' }, { status: 400 });
      const maxBytes = Math.max(
        1_000_000,
        Number(process.env.DOCX_IMPORT_MAX_BYTES) || DEFAULT_MAX_BYTES,
      );
      const extensionValid = file.name.toLocaleLowerCase('uz-UZ').endsWith('.docx');
      if (!extensionValid || file.type !== DOCX_MIME || file.size > maxBytes) {
        return NextResponse.json(
          {
            error: `Faqat .docx fayl qabul qilinadi. Maksimal hajm ${Math.round(maxBytes / 1_048_576)} MB.`,
          },
          { status: 400 },
        );
      }
      if (
        auth.work.status === 'published' ||
        auth.work.status === 'archived' ||
        auth.work.is_archived
      ) {
        return NextResponse.json(
          { error: 'DOCX import yangi, qoralama yoki moderatsiyadagi asar uchun ishlaydi.' },
          { status: 409 },
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = createHash('sha256').update(buffer).digest('hex');
      const { data: existing } = await auth.db
        .from('document_import_sessions')
        .select('*')
        .eq('created_by', auth.profile.id)
        .eq('work_id', workId)
        .eq('file_hash', hash)
        .maybeSingle();
      if (existing) {
        if (existing.status === 'completed') {
          return NextResponse.json({ error: 'Bu DOCX avval import qilingan.' }, { status: 409 });
        }
        return NextResponse.json({ session: safeSession(existing), reused: true });
      }

      await auth.db.rpc('cleanup_expired_document_import_sessions').then(({ error }) => {
        if (error) console.warn('DOCX session cleanup skipped', { code: error.code });
      });
      let parsed;
      try {
        parsed = await parseDocx(buffer, auth.work.title);
      } catch (error) {
        return NextResponse.json({ error: friendlyError(error) }, { status: 422 });
      }
      const { data, error } = await auth.db
        .from('document_import_sessions')
        .insert({
          created_by: auth.profile.id,
          work_id: workId,
          original_filename: file.name.slice(0, 240),
          file_hash: hash,
          status: 'ready',
          raw_text: parsed.rawText,
          expected_body_text: parsed.expectedBodyText,
          chapters: parsed.chapters,
          statistics: parsed.statistics,
          warnings: parsed.warnings,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505')
          return NextResponse.json(
            { error: 'Bu DOCX uchun import sessiyasi mavjud.' },
            { status: 409 },
          );
        throw error;
      }
      return NextResponse.json({ session: safeSession(data) }, { status: 201 });
    }

    const body = await request.json();
    const workId = String(body.workId || '');
    const auth = await authorize(request, workId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const session = await loadSession(auth.db, auth.profile.id, String(body.sessionId || ''));
    if (!session)
      return NextResponse.json({ error: 'Import sessiyasi topilmadi' }, { status: 404 });

    if (action === 'analyze') {
      const result = await analyzeDocxTechnicalIssues(
        auth.profile.id,
        session.chapters as DocxChapter[],
        String(body.instruction || '')
          .trim()
          .slice(0, 500),
      );
      const { data, error } = await auth.db
        .from('document_import_sessions')
        .update({ suggestions: result.suggestions, updated_at: new Date().toISOString() })
        .eq('id', session.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ session: safeSession(data), warning: result.warning });
    }

    if (action === 'suggestion') {
      const suggestionId = String(body.suggestionId || '');
      const decision = body.decision === 'accept' ? 'accepted' : 'rejected';
      const suggestions = (
        Array.isArray(session.suggestions) ? session.suggestions : []
      ) as AiSuggestion[];
      const suggestion = suggestions.find(
        (item) => item.id === suggestionId && item.status === 'pending',
      );
      if (!suggestion) return NextResponse.json({ error: 'Taklif topilmadi' }, { status: 404 });
      let chapters = session.chapters as DocxChapter[];
      if (decision === 'accepted') {
        chapters = chapters.map((chapter) =>
          chapter.id === suggestion.chapterId
            ? applyConfirmedSuggestion(chapter, suggestion)
            : chapter,
        );
      }
      const nextSuggestions = suggestions.map((item) =>
        item.id === suggestionId ? { ...item, status: decision } : item,
      );
      const stats = validateDocxIntegrity(
        session.expected_body_text,
        chapters,
        Number(session.statistics?.paragraphCount || 0),
      );
      const { data, error } = await auth.db
        .from('document_import_sessions')
        .update({
          chapters,
          suggestions: nextSuggestions,
          statistics: stats,
          status: stats.suspiciousLoss ? 'needs_review' : 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ session: safeSession(data) });
    }

    if (action === 'import') {
      const chapters = normalizeIncomingChapters(session.chapters);
      const stats = validateDocxIntegrity(
        session.expected_body_text,
        chapters,
        Number(session.statistics?.paragraphCount || 0),
      );
      if (stats.suspiciousLoss) {
        return NextResponse.json(
          {
            error:
              'Import vaqtida matnning bir qismi yo‘qolishi mumkin. Iltimos, faylni tekshiring.',
          },
          { status: 409 },
        );
      }
      const { data, error } = await auth.db.rpc('import_docx_chapters', {
        p_session_id: session.id,
        p_actor_id: auth.profile.id,
        p_work_id: workId,
        p_chapters: chapters.map(({ title, contentHtml }) => ({ title, contentHtml })),
      });
      if (error) {
        if (error.message.includes('IMPORT_ALREADY_COMPLETED'))
          return NextResponse.json({ error: 'Bu DOCX avval import qilingan.' }, { status: 409 });
        console.error('Atomic DOCX import failed', { code: error.code, sessionId: session.id });
        return NextResponse.json(
          { error: 'Boblarni import qilib bo‘lmadi. Hech qanday bob saqlanmadi.' },
          { status: 500 },
        );
      }
      revalidateTag('public-catalogue');
      revalidatePath(`/muallif/asar/${workId}`);
      return NextResponse.json({ success: true, result: data });
    }
    return NextResponse.json({ error: 'Noma’lum amal' }, { status: 400 });
  } catch (error) {
    console.error('DOCX import failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      { error: 'DOCX import jarayonida server xatosi yuz berdi.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const workId = String(body.workId || '');
    const auth = await authorize(request, workId);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const session = await loadSession(auth.db, auth.profile.id, String(body.sessionId || ''));
    if (!session)
      return NextResponse.json({ error: 'Import sessiyasi topilmadi' }, { status: 404 });
    if (session.status === 'completed')
      return NextResponse.json(
        { error: 'Yakunlangan importni o‘zgartirib bo‘lmaydi' },
        { status: 409 },
      );
    const chapters = normalizeIncomingChapters(body.chapters);
    const stats = validateDocxIntegrity(
      session.expected_body_text,
      chapters,
      Number(session.statistics?.paragraphCount || 0),
    );
    const { data, error } = await auth.db
      .from('document_import_sessions')
      .update({
        chapters,
        statistics: stats,
        status: stats.suspiciousLoss ? 'needs_review' : 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ session: safeSession(data) });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    return NextResponse.json(
      {
        error:
          code === 'INVALID_CHAPTERS'
            ? 'Boblar bo‘sh, juda katta yoki noto‘g‘ri formatda.'
            : 'Import previewini saqlab bo‘lmadi.',
      },
      { status: 400 },
    );
  }
}
