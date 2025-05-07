/*
  # Fix claim creator trigger function

  1. Changes
    - Add error handling to trigger function
    - Add logging for debugging
    - Ensure SECURITY DEFINER is set
    - Set search_path for security
    - Add explicit schema references
  
  2. Security
    - Maintains existing RLS policies
    - Uses SECURITY DEFINER to bypass RLS
    - Sets explicit search_path
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS add_claim_creator_trigger ON public.claims;
DROP FUNCTION IF EXISTS public.add_claim_creator_as_participant();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION public.add_claim_creator_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_log_message text;
BEGIN
  -- Get the user's role
  SELECT role INTO v_role
  FROM public.users
  WHERE id = NEW.created_by;

  -- Log the attempt
  v_log_message := format(
    'Adding creator as participant - Claim: %s, User: %s, Role: %s',
    NEW.file_number,
    NEW.created_by,
    v_role
  );
  RAISE NOTICE '%', v_log_message;

  -- Insert the participant record
  INSERT INTO public.claim_participants (
    claim_id,
    user_id,
    role,
    added_by
  ) VALUES (
    NEW.file_number,
    NEW.created_by,
    v_role,
    NEW.created_by
  );

  -- Log success
  RAISE NOTICE 'Successfully added creator as participant';

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    RAISE WARNING 'Error in add_claim_creator_as_participant: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER add_claim_creator_trigger
  AFTER INSERT ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.add_claim_creator_as_participant();

-- Verify existing claims have participants
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT file_number, created_by FROM public.claims LOOP
    INSERT INTO public.claim_participants (claim_id, user_id, role, added_by)
    SELECT 
      r.file_number,
      r.created_by,
      users.role,
      r.created_by
    FROM public.users
    WHERE users.id = r.created_by
    ON CONFLICT (claim_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;