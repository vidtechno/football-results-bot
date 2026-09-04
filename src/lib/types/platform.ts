export type AuthorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type WorkType = 'book' | 'serialized_story';
export type WorkStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type WorkAccessType = 'free' | 'paid_full_work' | 'paid_by_chapter';
export type WorkCompletionStatus = 'ongoing' | 'completed';
export type ChapterStatus = 'draft' | 'published';
export type LibrarySavedState = 'reading' | 'completed' | 'want_to_read';
export type PurchaseType = 'full_work' | 'chapter';
export type PurchaseStatus = 'active' | 'refunded';
export type AccountType =
  | 'reader_credit'
  | 'author_earnings_available'
  | 'author_earnings_reserved'
  | 'platform_revenue';
export type TransactionType =
  | 'topup'
  | 'purchase_debit'
  | 'author_sale_credit'
  | 'platform_fee_credit'
  | 'payout_reserve'
  | 'payout_paid'
  | 'payout_cancel_reversal'
  | 'adjustment';
export type ReferenceType = 'topup_request' | 'purchase' | 'payout_request' | 'manual';
export type TopupStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
export type PayoutStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export interface ReadingPreferences {
  theme: 'light' | 'sepia' | 'dark';
  fontFamily: 'serif' | 'sans';
  fontSize: number;
  lineHeight: 'normal' | 'relaxed' | 'loose';
  contentWidth: 'narrow' | 'medium' | 'wide';
}

export interface Profile {
  id: string;
  public_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  telegram_username: string | null;
  is_admin: boolean;
  reading_preferences?: ReadingPreferences | null;
  created_at: string;
  updated_at: string;
}

export type RevisionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface WorkRevision {
  id: string;
  work_id: string;
  author_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  type: WorkType;
  access_type: WorkAccessType;
  full_work_price: number;
  age_rating: string;
  status: RevisionStatus;
  moderator_id?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  work?: Work;
  author?: Profile;
}

export interface ChapterRevision {
  id: string;
  chapter_id: string;
  work_id: string;
  author_id: string;
  title: string;
  content: string;
  is_free: boolean;
  price: number;
  status: RevisionStatus;
  moderator_id?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  chapter?: Chapter;
  work?: Work;
}

export interface AuthorProfile {
  user_id: string;
  pen_name: string;
  biography: string | null;
  status: AuthorStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Work {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  type: WorkType;
  status: WorkStatus;
  rejection_reason?: string | null;
  access_type: WorkAccessType;
  full_work_price: number;
  age_rating: string;
  completion_status: WorkCompletionStatus;
  language: string;
  is_archived?: boolean;
  pending_revision?: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: AuthorProfile;
  genres?: Genre[];
  chapters_count?: number;
}

export interface Chapter {
  id: string;
  work_id: string;
  chapter_number: number;
  title: string;
  slug: string;
  content?: string;
  is_free: boolean;
  price: number;
  status: ChapterStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryItem {
  user_id: string;
  work_id: string;
  saved_state: LibrarySavedState;
  last_read_chapter_id: string | null;
  reading_progress: number;
  created_at: string;
  updated_at: string;
  work?: Work;
}

export interface Purchase {
  id: string;
  buyer_id: string;
  author_id: string;
  work_id: string;
  chapter_id: string | null;
  purchase_type: PurchaseType;
  gross_amount: number;
  commission_amount: number;
  author_net_amount: number;
  idempotency_key: string;
  status: PurchaseStatus;
  created_at: string;
  work?: Work;
  chapter?: Chapter;
}

export interface WalletAccount {
  id: string;
  user_id: string | null;
  account_type: AccountType;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  account_id: string;
  amount: number;
  transaction_type: TransactionType;
  reference_type: ReferenceType;
  reference_id: string;
  idempotency_key: string | null;
  description: string;
  actor_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface TopupRequest {
  id: string;
  reader_id: string;
  amount: number;
  status: TopupStatus;
  payment_proof_url: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  reader?: Profile;
}

export interface PayoutRequest {
  id: string;
  author_id: string;
  requested_amount: number;
  full_legal_name: string;
  protected_card_data: string;
  masked_card: string;
  status: PayoutStatus;
  payment_proof_url: string | null;
  author_note: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface PlatformSettings {
  commission_percentage: number;
  minimum_payout: number;
  telegram_support_username: string;
  allowed_topup_amounts: number[];
}

export interface AdminAuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  admin?: Profile;
}
