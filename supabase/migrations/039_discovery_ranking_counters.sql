-- Cheap, indexed counters for homepage shelves and catalogue sorting.
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS unique_readers_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_count BIGINT NOT NULL DEFAULT 0;

UPDATE public.works w SET unique_readers_count = (
  SELECT COUNT(*) FROM public.reading_progress rp WHERE rp.work_id = w.id
);
UPDATE public.works w SET sales_count = (
  SELECT COUNT(*) FROM public.purchases p
  WHERE p.work_id = w.id AND p.status = 'active' AND p.purchase_type = 'full_work'
);

CREATE INDEX IF NOT EXISTS idx_works_unique_readers_rank
  ON public.works (unique_readers_count DESC, view_count DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_works_sales_rank
  ON public.works (sales_count DESC) WHERE status = 'published' AND access_type = 'paid_full_work';

CREATE OR REPLACE FUNCTION public.refresh_work_reader_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_work_id UUID;
BEGIN
  v_work_id := COALESCE(NEW.work_id, OLD.work_id);
  UPDATE public.works SET unique_readers_count = (
    SELECT COUNT(*) FROM public.reading_progress WHERE work_id = v_work_id
  ) WHERE id = v_work_id;
  IF TG_OP = 'UPDATE' AND OLD.work_id IS DISTINCT FROM NEW.work_id THEN
    UPDATE public.works SET unique_readers_count = (
      SELECT COUNT(*) FROM public.reading_progress WHERE work_id = OLD.work_id
    ) WHERE id = OLD.work_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_work_sales_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_work_id UUID;
BEGIN
  v_work_id := COALESCE(NEW.work_id, OLD.work_id);
  UPDATE public.works SET sales_count = (
    SELECT COUNT(*) FROM public.purchases
    WHERE work_id = v_work_id AND status = 'active' AND purchase_type = 'full_work'
  ) WHERE id = v_work_id;
  IF TG_OP = 'UPDATE' AND OLD.work_id IS DISTINCT FROM NEW.work_id THEN
    UPDATE public.works SET sales_count = (
      SELECT COUNT(*) FROM public.purchases
      WHERE work_id = OLD.work_id AND status = 'active' AND purchase_type = 'full_work'
    ) WHERE id = OLD.work_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_work_readers ON public.reading_progress;
CREATE TRIGGER trg_refresh_work_readers
AFTER INSERT OR DELETE OR UPDATE OF work_id ON public.reading_progress
FOR EACH ROW EXECUTE FUNCTION public.refresh_work_reader_count();

DROP TRIGGER IF EXISTS trg_refresh_work_sales ON public.purchases;
CREATE TRIGGER trg_refresh_work_sales
AFTER INSERT OR DELETE OR UPDATE OF work_id, status, purchase_type ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.refresh_work_sales_count();
