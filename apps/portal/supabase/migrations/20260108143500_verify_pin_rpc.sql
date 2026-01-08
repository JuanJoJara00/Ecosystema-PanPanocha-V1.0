-- RPC to verify PIN for sensitive actions
-- Returns true if the PIN belongs to a user with sufficient privileges (owner, admin, dev)
-- Updated roles as per user request.

CREATE OR REPLACE FUNCTION verify_action_pin(input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  valid_user boolean;
BEGIN
  -- Check for valid role AND matching PIN
  -- Roles allowed: 'owner', 'admin', 'dev'
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE pin_code = input_pin 
    AND role IN ('owner', 'admin', 'dev') 
    AND (deleted_at IS NULL)
  ) INTO valid_user;

  RETURN valid_user;
END;
$$;
