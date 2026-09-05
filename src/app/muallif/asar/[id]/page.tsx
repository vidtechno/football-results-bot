import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient, createAdminClient, isUserAllowlistedAdmin } from '@/lib/supabase/server';
import { AuthorWorkEditorClient } from './AuthorWorkEditorClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AuthorWorkEditorPage({ params }: PageProps) {
  const workIdOrSlug = params.id;
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/kirish?redirect=/muallif/asar/${workIdOrSlug}`);
  }

  const adminClient = createAdminClient();

  // Query work by id or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workIdOrSlug);
  let workQuery = adminClient.from('works').select('id, author_id, title, slug, status');
  if (isUuid) {
    workQuery = workQuery.eq('id', workIdOrSlug);
  } else {
    workQuery = workQuery.eq('slug', workIdOrSlug);
  }

  const { data: work } = await workQuery.maybeSingle();

  if (!work) {
    notFound();
  }

  // Strict ownership check: Must be the author of this work or a platform administrator
  let isAuthorized = work.author_id === user.id;

  if (!isAuthorized) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin =
      profile?.is_admin === true ||
      profile?.role === 'admin' ||
      isUserAllowlistedAdmin(user);

    if (isAdmin) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    // IDOR protection: Non-author cannot view management interface of another author's work
    notFound();
  }

  return <AuthorWorkEditorClient workId={work.id} />;
}
