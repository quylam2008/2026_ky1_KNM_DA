CREATE TABLE IF NOT EXISTS public.focust_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 1280 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.focust_user_plants (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id text NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plant_id)
);

CREATE TABLE IF NOT EXISTS public.focust_daily_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  PRIMARY KEY (user_id, claim_date)
);

ALTER TABLE public.focust_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focust_user_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focust_daily_claims ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.kv_store_23149b0b
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.focust_wallets,
  public.focust_user_plants,
  public.focust_daily_claims
TO service_role;

CREATE OR REPLACE FUNCTION public.focust_purchase_plant(p_user_id uuid, p_plant_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plant_price integer;
  current_balance integer;
BEGIN
  plant_price := CASE p_plant_id
    WHEN 'morning_sprout' THEN 250
    WHEN 'green_pine' THEN 480
    WHEN 'silver_leaf' THEN 700
    ELSE NULL
  END;

  IF plant_price IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_plant');
  END IF;

  INSERT INTO public.focust_wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO current_balance
  FROM public.focust_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.focust_user_plants
    WHERE user_id = p_user_id AND plant_id = p_plant_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_owned', 'balance', current_balance);
  END IF;

  IF current_balance < plant_price THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_funds', 'balance', current_balance);
  END IF;

  UPDATE public.focust_wallets
  SET balance = balance - plant_price, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO current_balance;

  INSERT INTO public.focust_user_plants (user_id, plant_id)
  VALUES (p_user_id, p_plant_id);

  RETURN jsonb_build_object('ok', true, 'balance', current_balance, 'plant_id', p_plant_id);
END;
$$;

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
  VALUES (p_user_id, (now() AT TIME ZONE 'UTC')::date)
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

CREATE OR REPLACE FUNCTION public.focust_add_focus_coins(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  IF p_amount < 0 OR p_amount > 600 THEN
    RAISE EXCEPTION 'Invalid focus reward amount';
  END IF;

  INSERT INTO public.focust_wallets (user_id, balance)
  VALUES (p_user_id, 1280 + p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.focust_wallets.balance + p_amount,
      updated_at = now()
  RETURNING balance INTO current_balance;

  RETURN current_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.focust_purchase_plant(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.focust_claim_daily_reward(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.focust_add_focus_coins(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.focust_purchase_plant(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.focust_claim_daily_reward(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.focust_add_focus_coins(uuid, integer) TO service_role;
