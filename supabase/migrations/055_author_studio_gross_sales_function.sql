-- 055: Muallif studiyasi uchun jami savdo yig'indisi (avval brauzer barcha xaridlarni yuklab, o'zi yig'ardi).
CREATE OR REPLACE FUNCTION public.get_my_gross_sales() RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(gross_amount), 0)::bigint
  FROM public.purchases
  WHERE author_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_gross_sales() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_gross_sales() TO authenticated;
