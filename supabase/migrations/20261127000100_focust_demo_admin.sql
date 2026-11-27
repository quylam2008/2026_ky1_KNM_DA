CREATE OR REPLACE FUNCTION public.focust_update_demo_account(
  p_user_id uuid,
  p_email text,
  p_old_username text,
  p_new_username text,
  p_entries jsonb,
  p_wallet_balance integer,
  p_owned_plant_ids text[],
  p_daily_reward_claimed boolean,
  p_claim_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  entry jsonb;
  entry_key text;
  existing_mapping jsonb;
BEGIN
  IF p_wallet_balance IS NULL OR p_wallet_balance < 0 OR p_wallet_balance > 2000000000 THEN
    RAISE EXCEPTION 'Invalid demo wallet balance';
  END IF;

  IF p_new_username !~ '^[a-z0-9._-]{3,24}$' THEN
    RAISE EXCEPTION 'Invalid demo username';
  END IF;

  IF p_entries IS NULL OR jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid demo account data';
  END IF;

  IF jsonb_array_length(p_entries) <> 9 OR p_owned_plant_ids IS NULL THEN
    RAISE EXCEPTION 'Invalid demo account data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_owned_plant_ids) AS owned(plant_id)
    WHERE owned.plant_id NOT IN ('morning_sprout', 'green_pine', 'silver_leaf')
  ) THEN
    RAISE EXCEPTION 'Invalid demo plant';
  END IF;

  SELECT value INTO existing_mapping
  FROM public.kv_store_23149b0b
  WHERE key = 'username:' || p_new_username;

  IF existing_mapping IS NOT NULL
    AND existing_mapping->>'userId' IS DISTINCT FROM p_user_id::text THEN
    RAISE EXCEPTION 'Demo username is already in use';
  END IF;

  INSERT INTO public.focust_wallets (user_id, balance)
  VALUES (p_user_id, p_wallet_balance)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = EXCLUDED.balance, updated_at = now();

  DELETE FROM public.focust_user_plants WHERE user_id = p_user_id;
  INSERT INTO public.focust_user_plants (user_id, plant_id)
  SELECT p_user_id, owned.plant_id
  FROM unnest(p_owned_plant_ids) AS owned(plant_id)
  ON CONFLICT (user_id, plant_id) DO NOTHING;

  DELETE FROM public.focust_daily_claims
  WHERE user_id = p_user_id AND claim_date = p_claim_date;
  IF p_daily_reward_claimed THEN
    INSERT INTO public.focust_daily_claims (user_id, claim_date)
    VALUES (p_user_id, p_claim_date);
  END IF;

  FOR entry IN SELECT value FROM jsonb_array_elements(p_entries)
  LOOP
    entry_key := entry->>'key';
    IF entry_key IS NULL OR entry_key NOT IN (
      'profile:' || p_user_id::text,
      'tasks:' || p_user_id::text,
      'apps:' || p_user_id::text,
      'goals:' || p_user_id::text,
      'notification-settings:' || p_user_id::text,
      'notifications:' || p_user_id::text,
      'favorite-plants:' || p_user_id::text,
      'focus-history:' || p_user_id::text,
      'focus-progress:' || p_user_id::text
    ) OR NOT (entry ? 'value') THEN
      RAISE EXCEPTION 'Invalid demo account key';
    END IF;

    INSERT INTO public.kv_store_23149b0b (key, value)
    VALUES (entry_key, entry->'value')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  END LOOP;

  IF p_old_username IS DISTINCT FROM p_new_username THEN
    DELETE FROM public.kv_store_23149b0b
    WHERE key = 'username:' || p_old_username
      AND value->>'userId' = p_user_id::text;
  END IF;

  INSERT INTO public.kv_store_23149b0b (key, value)
  VALUES (
    'username:' || p_new_username,
    jsonb_build_object('email', p_email, 'userId', p_user_id::text)
  )
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
$$;

REVOKE ALL ON FUNCTION public.focust_update_demo_account(
  uuid, text, text, text, jsonb, integer, text[], boolean, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.focust_update_demo_account(
  uuid, text, text, text, jsonb, integer, text[], boolean, date
) TO service_role;
