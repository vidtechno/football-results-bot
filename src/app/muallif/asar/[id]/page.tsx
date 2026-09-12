import { notFound, redirect } from 'next/navigation';
import {
  createServerSupabaseClient,
  createAdminClient,
  isUserAllowlistedAdmin,
} from '@/lib/supabase/server';
import { AuthorWorkEditorClient } from './AuthorWorkEditorClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    docx?: string;
  }>;
}

export default async function AuthorWorkEditorPage({ params: paramsPromise, searchParams: searchParamsPromise }: PageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const workIdOrSlug = params.id;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/kirish?redirect=/muallif/asar/${workIdOrSlug}`);
  }

  const adminClient = createAdminClient();

  // Query work by id or slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    workIdOrSlug,
  );
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

  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin =
    profile?.is_admin === true || profile?.role === 'admin' || isUserAllowlistedAdmin(user);

  // Strict ownership check: Must be the author of this work or a platform administrator
  const isAuthorized = work.author_id === user.id || isAdmin;

  if (!isAuthorized) {
    // IDOR protection: Non-author cannot view management interface of another author's work
    notFound();
  }

  const { data: authorProfile } = await adminClient
    .from('author_profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();
  const canUseDocxImport =
    isAdmin || (work.author_id === user.id && authorProfile?.status === 'approved');

  return (
    <AuthorWorkEditorClient
      workId={work.id}
      canUseDocxImport={canUseDocxImport}
      initialDocxOpen={canUseDocxImport && searchParams?.docx === '1'}
    />
  );
}
