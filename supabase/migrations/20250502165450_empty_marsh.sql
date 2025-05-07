/*
  # Add function to determine editable fields based on tab and role

  1. Changes
    - Add function to determine which fields are editable
    - Consider user role, current tab, and item status
    - Return array of editable field names
    
  2. Security
    - Set SECURITY DEFINER
    - Set explicit search path
*/

-- Create function to determine editable fields
CREATE OR REPLACE FUNCTION get_editable_fields(
  p_tab text,
  p_user_role text,
  p_item_status text
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  editable_fields text[];
BEGIN
  -- Base case: no fields are editable
  editable_fields := ARRAY[]::text[];
  
  -- Inventory tab - basic fields are editable
  IF p_tab = 'inventory' THEN
    editable_fields := ARRAY[
      'description',
      'category_id',
      'room',
      'quantity',
      'claimed_rcv'
    ];
  
  -- Enter & Identify tab - identification fields
  ELSIF p_tab = 'enter_identify' THEN
    editable_fields := ARRAY[
      'description',
      'category_id',
      'room',
      'quantity',
      'claimed_rcv',
      'age',
      'condition',
      'comparable_link'
    ];
  
  -- Price & Verify tab - pricing fields
  ELSIF p_tab = 'price_verify' AND p_user_role IN ('admin', 'desk_adjuster', 'field_adjuster') THEN
    editable_fields := ARRAY[
      'adjusted_rcv',
      'tax_rate',
      'tax_rate_is_custom',
      'adjuster_notes'
    ];
  
  -- Depreciation tab - depreciation fields
  ELSIF p_tab = 'depreciation' AND p_user_role IN ('admin', 'desk_adjuster', 'field_adjuster') THEN
    editable_fields := ARRAY[
      'age',
      'condition',
      'depreciation_percent',
      'replacement_cost_applies'
    ];
  
  -- Recovery tab - recovery fields
  ELSIF p_tab = 'recovery' AND p_item_status != 'holdback_paid' THEN
    editable_fields := ARRAY[
      'replaced',
      'replacement_spent'
    ];
  END IF;

  -- Admin can edit all fields in any tab
  IF p_user_role = 'admin' THEN
    editable_fields := ARRAY[
      'description',
      'category_id',
      'room',
      'quantity',
      'claimed_rcv',
      'adjusted_rcv',
      'age',
      'condition',
      'comparable_link',
      'tax_rate',
      'tax_rate_is_custom',
      'depreciation_percent',
      'replacement_cost_applies',
      'replaced',
      'replacement_spent',
      'adjuster_notes'
    ];
  END IF;

  RETURN editable_fields;
END;
$$;