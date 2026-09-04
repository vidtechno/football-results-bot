import { createAdminClient } from '@/lib/supabase/server';
import { generateIdempotencyKey } from '@/lib/utils/currency';

export interface PurchaseResult {
  success: boolean;
  purchase_id?: string;
  gross_amount?: number;
  balance_after?: number;
  already_owned?: boolean;
  idempotent?: boolean;
  message?: string;
  error?: string;
}

export interface PayoutCreationResult {
  success: boolean;
  payout_id?: string;
  reserved_amount?: number;
  available_balance_after?: number;
  error?: string;
}

export interface PayoutResolutionResult {
  success: boolean;
  payout_id?: string;
  paid_amount?: number;
  returned_amount?: number;
  status?: string;
  error?: string;
}

export interface TopupApprovalResult {
  success: boolean;
  request_id?: string;
  credited_amount?: number;
  balance_after?: number;
  error?: string;
}

/**
 * Execute server-side content purchase through PostgreSQL RPC.
 */
export async function executePurchase(
  userId: string,
  workId: string,
  chapterId: string | null = null,
  customIdempotencyKey?: string,
): Promise<PurchaseResult> {
  const supabase = createAdminClient();
  const idempotencyKey =
    customIdempotencyKey ||
    generateIdempotencyKey(`buy_${userId.slice(0, 8)}_${chapterId || workId}`);

  const { data, error } = await supabase.rpc('purchase_content', {
    p_work_id: workId,
    p_chapter_id: chapterId,
    p_idempotency_key: idempotencyKey,
    p_user_id: userId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Xaridni amalga oshirishda xatolik yuz berdi',
    };
  }

  return data as PurchaseResult;
}

/**
 * Author submits payout request through atomic reservation RPC.
 * Raw bank card is encrypted server-side before calling this RPC;
 * only ciphertext and masked format are stored in Postgres.
 */
export async function executeAuthorPayoutRequest(
  userId: string,
  amount: number,
  legalName: string,
  encryptedCard: string,
  maskedCard: string,
  authorNote: string = '',
): Promise<PayoutCreationResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('author_create_payout_request', {
    p_amount: Math.floor(amount),
    p_legal_name: legalName.trim(),
    p_encrypted_card: encryptedCard,
    p_masked_card: maskedCard,
    p_author_note: authorNote.trim(),
    p_user_id: userId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Pul yechib olish so‘rovini yaratishda xatolik yuz berdi',
    };
  }

  return data as PayoutCreationResult;
}

/**
 * Admin marks payout paid with receipt proof.
 */
export async function executeAdminApprovePayout(
  adminId: string,
  requestId: string,
  proofUrl: string,
  adminNote: string = '',
): Promise<PayoutResolutionResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('admin_approve_payout_paid', {
    p_request_id: requestId,
    p_proof_url: proofUrl,
    p_admin_note: adminNote,
    p_admin_id: adminId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'To‘lovni tasdiqlashda xatolik yuz berdi',
    };
  }

  return data as PayoutResolutionResult;
}

/**
 * Admin rejects payout request, reversing reserved money to available earnings.
 */
export async function executeAdminRejectPayout(
  adminId: string,
  requestId: string,
  adminNote: string = '',
  isCancel: boolean = false,
): Promise<PayoutResolutionResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('admin_reject_payout', {
    p_request_id: requestId,
    p_admin_note: adminNote,
    p_is_cancel: isCancel,
    p_admin_id: adminId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'So‘rovni rad etishda xatolik yuz berdi',
    };
  }

  return data as PayoutResolutionResult;
}

/**
 * Admin approves reader balance top-up request.
 */
export async function executeAdminApproveTopup(
  adminId: string,
  requestId: string,
  proofUrl: string = '',
  adminNote: string = '',
): Promise<TopupApprovalResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('admin_approve_topup', {
    p_request_id: requestId,
    p_proof_url: proofUrl,
    p_admin_note: adminNote,
    p_admin_id: adminId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Hisobni to‘ldirishni tasdiqlashda xatolik yuz berdi',
    };
  }

  return data as TopupApprovalResult;
}
