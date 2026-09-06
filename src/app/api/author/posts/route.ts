import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get("author_id");
    const username = searchParams.get("username");

    if (!authorId && !username) {
      return NextResponse.json(
        { error: "author_id yoki username talab qilinadi" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    let targetAuthorId = authorId;

    if (!targetAuthorId && username) {
      // Find author by username from profiles
      const { data: profile } = await admin
        .from("profiles")
        .select("id, author_profiles(id)")
        .eq("username", username)
        .maybeSingle();

      const authorProf = (profile as any)?.author_profiles;
      targetAuthorId = Array.isArray(authorProf) ? authorProf[0]?.id : authorProf?.id;

      if (!targetAuthorId) {
        return NextResponse.json({ posts: [] });
      }
    }

    const { data: posts, error } = await admin
      .from("author_posts")
      .select("id, author_id, content, pinned, created_at, updated_at")
      .eq("author_id", targetAuthorId!)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ posts: posts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Post matni bo‘sh bo‘lishi mumkin emas" },
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

    // Verify user has an approved author profile
    const { data: authorProf, error: authErr } = await admin
      .from("author_profiles")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle();

    if (authErr || !authorProf) {
      return NextResponse.json(
        { error: "Faqat tasdiqlangan mualliflar yangilik e’lon qila oladi" },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data: newPost, error: insertErr } = await admin
      .from("author_posts")
      .insert({
        author_id: authorProf.id,
        content: content.trim(),
        pinned: false,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: newPost });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Xatolik yuz berdi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("id");

    if (!postId) {
      return NextResponse.json({ error: "id ko‘rsatilmadi" }, { status: 400 });
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

    const { data: post, error: pErr } = await admin
      .from("author_posts")
      .select("id, author_id, author_profiles!inner(user_id)")
      .eq("id", postId)
      .maybeSingle();

    if (pErr || !post) {
      return NextResponse.json({ error: "Post topilmadi" }, { status: 404 });
    }

    const postOwnerUserId = (post as any).author_profiles?.user_id;

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    if (postOwnerUserId !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Ruxsat berilmadi" }, { status: 403 });
    }

    await admin.from("author_posts").delete().eq("id", postId);

    return NextResponse.json({ success: true, message: "Post o‘chirildi" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Xatolik yuz berdi" }, { status: 500 });
  }
}
