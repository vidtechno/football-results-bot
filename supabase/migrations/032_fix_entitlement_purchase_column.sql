-- Fix the production schema/function drift exposed by purchase_content:
-- migrations 025/031 write source_purchase_id, while migration 019 originally
-- created the canonical column as purchase_id.
--
-- Keep both names synchronized for backwards compatibility. This is additive,
-- idempotent, and does not alter or delete financial history.

ALTER TABLE public.entitlements
  ADD COLUMN IF NOT EXISTS source_purchase_id UUID
  REFERENCES public.purchases(id) ON DELETE SET NULL;

UPDATE public.entitlements
SET source_purchase_id = purchase_id
WHERE source_purchase_id IS NULL
  AND purchase_id IS NOT NULL;

UPDATE public.entitlements
SET purchase_id = source_purchase_id
WHERE purchase_id IS NULL
  AND source_purchase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entitlements_source_purchase
  ON public.entitlements (source_purchase_id)
  WHERE source_purchase_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_entitlement_purchase_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.purchase_id := COALESCE(NEW.purchase_id, NEW.source_purchase_id);
  NEW.source_purchase_id := COALESCE(NEW.source_purchase_id, NEW.purchase_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_entitlement_purchase_ids ON public.entitlements;
CREATE TRIGGER trg_sync_entitlement_purchase_ids
BEFORE INSERT OR UPDATE OF purchase_id, source_purchase_id
ON public.entitlements
FOR EACH ROW
EXECUTE FUNCTION public.sync_entitlement_purchase_ids();
