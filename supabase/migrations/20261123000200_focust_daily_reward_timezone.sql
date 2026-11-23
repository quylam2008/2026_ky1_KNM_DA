CREATE OR REPLACE FUNCTION public.focust_claim_daily_reward(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_rows integer;
  current_balance integer;
BEGIN
  INSERT INTO public.focust_wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.focust_daily_claims (user_id, claim_date)
  VALUES (p_user_id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
  ON CONFLICT (user_id, claim_date) DO NOTHING;
  GET DIAGNOSTICS claimed_rows = ROW_COUNT;

  IF claimed_rows = 0 THEN
    SELECT balance INTO current_balance
    FROM public.focust_wallets
    WHERE user_id = p_user_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed', 'balance', current_balance);
  END IF;

  UPDATE public.focust_wallets
  SET balance = balance + 200, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO current_balance;

  RETURN jsonb_build_object('ok', true, 'reward', 200, 'balance', current_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.focust_claim_daily_reward(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.focust_claim_daily_reward(uuid) TO service_role;
