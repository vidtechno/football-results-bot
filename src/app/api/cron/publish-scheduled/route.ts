import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { dispatchNewChapterPublicationNotifications } from "@/lib/notifications/inSite";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const secretHeader = req.headers.get("x-cron-secret");
    const cronSecret = process.env.CRON_SECRET;

    const providedSecret = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : secretHeader?.trim();

    if (cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Ruxsat berilmadi" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    // 1. Find scheduled chapters that reached scheduled_at
    const { data: scheduledChapters, error: fetchErr } = await admin
      .from("chapters")
      .select("id, work_id, chapter_number, title, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso);

    if (fetchErr) {
      console.error("Fetch scheduled chapters error:", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!scheduledChapters || scheduledChapters.length === 0) {
      return NextResponse.json({
        success: true,
        publishedCount: 0,
        message: "Rejalashtirilgan boblar topilmadi",
      });
    }

    const chapterIds = (scheduledChapters as Array<{ id: string }>).map((c) => c.id);

    // 2. Update status to 'published'
    const { error: updateErr } = await admin
      .from("chapters")
      .update({
        status: "published",
        published_at: nowIso,
        updated_at: nowIso,
      })
      .in("id", chapterIds);

    if (updateErr) {
      console.error("Update scheduled chapters error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Dispatch in-site notifications for newly published chapters
    for (const ch of scheduledChapters) {
      try {
        await dispatchNewChapterPublicationNotifications(ch.id);
      } catch (notifyErr) {
        console.error(`Error notifying for published chapter ${ch.id}:`, notifyErr);
      }
    }

    return NextResponse.json({
      success: true,
      publishedCount: chapterIds.length,
      chapterIds,
      message: `${chapterIds.length} ta rejalashtirilgan bob muvaffaqiyatli nashr etildi`,
    });
  } catch (err: any) {
    console.error("Cron publish error:", err);
    return NextResponse.json(
      { error: err.message || "Kutilmagan xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
