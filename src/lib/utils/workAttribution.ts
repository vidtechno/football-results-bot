type PublicWork = {
  is_translation?: boolean | null;
  original_author_name?: string | null;
  author?: { pen_name?: string | null; profile?: { display_name?: string | null; username?: string | null } | null } | null;
};

export function getPublicWorkAuthorName(work: PublicWork): string {
  if (work.is_translation) {
    return work.original_author_name?.trim() || 'Original muallif ko‘rsatilmagan';
  }

  return work.author?.profile?.display_name?.trim() || work.author?.pen_name?.trim() || 'Muallif';
}

export function getPublicWorkAuthorUsername(work: PublicWork): string | null {
  if (work.is_translation) return null;
  return work.author?.profile?.username?.trim() || null;
}
