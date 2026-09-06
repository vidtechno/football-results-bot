import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chapterId = searchParams.get("chapter_id");

    if (!chapterId) {
      return NextResponse.json({ error: "chapter_id ko‘rsatilmadi" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiyadan o‘tilmagan" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Verify ownership
    const { data: chapter, error: chErr } = await admin
      .from("chapters")
      .select("id, work_id, works!inner(author_id, author_profiles!inner(user_id))")
      .eq("id", chapterId)
      .maybeSingle();

    if (chErr || !chapter) {
      return NextResponse.json({ error: "Bob topilmadi" }, { status: 404 });
    }

    const authorUserId = (chapter as any).works?.author_profiles?.user_id;

    // Check if user is author or admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    if (authorUserId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Ruxsat berilmadi" }, { status: 403 });
    }

    // Fetch versions
    const { data: versions, error: vErr } = await admin
      .from("chapter_versions")
      .select("id, chapter_id, version_number, title, word_count, created_at")
      .eq("chapter_id", chapterId)
      .order("version_number", { ascending: false });

    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chapter_id, version_id } = body;

    if (!chapter_id || !version_id) {
      return NextResponse.json(
        { error: "chapter_id va version_id talab qilinadi" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiyadan o‘tilmagan" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Verify ownership
    const { data: chapter, error: chErr } = await admin
      .from("chapters")
      .select("id, work_id, chapter_number, works!inner(author_id, author_profiles!inner(user_id))")
      .eq("id", chapter_id)
      .maybeSingle();

    if (chErr || !chapter) {
      return NextResponse.json({ error: "Bob topilmadi" }, { status: 404 });
    }

    const authorUserId = (chapter as any).works?.author_profiles?.user_id;
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    if (authorUserId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Ruxsat berilmadi" }, { status: 403 });
    }

    // Fetch the target snapshot
    const { data: targetVersion, error: tvErr } = await admin
      .from("chapter_versions")
      .select("*")
      .eq("id", version_id)
      .eq("chapter_id", chapter_id)
      .maybeSingle();

    if (tvErr || !targetVersion) {
      return NextResponse.json({ error: "Versiya topilmadi" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    // 1. Update chapter title and word count
    await admin
      .from("chapters")
      .update({
        title: targetVersion.title,
        word_count: targetVersion.word_count,
        updated_at: nowIso,
      })
      .eq("id", chapter_id);

    // 2. Update chapter_contents
    await admin
      .from("chapter_contents")
      .upsert({
        chapter_id: chapter_id,
        content: targetVersion.content,
        updated_at: nowIso,
      });

    // 3. Create a new snapshot for this restoration event
    const { data: latestV } = await admin
      .from("chapter_versions")
      .select("version_number")
      .eq("chapter_id", chapter_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVNumber = (latestV?.version_number || 0) + 1;

    await admin.from("chapter_versions").insert({
      chapter_id: chapter_id,
      version_number: nextVNumber,
      title: targetVersion.title,
      content: targetVersion.content,
      word_count: targetVersion.word_count,
      created_by: user.id,
      created_at: nowIso,
    });

    return NextResponse.json({
      success: true,
      restoredTitle: targetVersion.title,
      restoredContent: targetVersion.content,
      restoredVersionNumber: targetVersion.version_number,
      message: `${targetVersion.version_number}-versiya muvaffaqiyatli tiklandi`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Xatolik yuz berdi" }, { status: 500 });
  }
}
