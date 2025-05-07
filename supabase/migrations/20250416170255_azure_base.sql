/*
  # Initial Schema Setup for Clarity Contents

  1. New Tables
    - `users`: Extended user profile data
    - `claims`: Insurance claims
    - `claim_participants`: Links users to claims with roles
    - `items`: Claim inventory items
    - `item_change_history`: Tracks changes to items
    - `messages`: Communication system
    - `rooms`: Room organization for items
    - `report_templates`: Report configuration
    - `generated_reports`: Stored reports

  2. Security
    - Enable RLS on all tables
    - Add policies for proper data access control
    - Set up user role management
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'desk_adjuster', 'field_adjuster', 'policyholder');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE claim_status AS ENUM ('active', 'under_review', 'complete');
CREATE TYPE item_condition AS ENUM ('poor', 'fair', 'good', 'new');
CREATE TYPE submission_source AS ENUM ('adjuster', 'insured', 'field_adjuster', 'policyholder');

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  role user_role NOT NULL DEFAULT 'policyholder',
  phone text,
  company text,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  status user_status DEFAULT 'active'
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  file_number text PRIMARY KEY,
  insured_name text NOT NULL,
  phone_number text,
  email text,
  status claim_status DEFAULT 'active',
  assigned_adjuster uuid REFERENCES users(id),
  default_tax_rate numeric(5,2),
  depreciation_applicable boolean DEFAULT true,
  depreciation_recoverable boolean DEFAULT true,
  property_address text,
  property_zip_code text,
  date_created timestamptz DEFAULT now(),
  date_updated timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create claim participants table
CREATE TABLE IF NOT EXISTS claim_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text REFERENCES claims(file_number),
  user_id uuid REFERENCES users(id),
  role user_role NOT NULL,
  added_by uuid REFERENCES users(id),
  added_at timestamptz DEFAULT now(),
  last_active timestamptz,
  UNIQUE(claim_id, user_id)
);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text REFERENCES claims(file_number),
  item_number serial,
  description text NOT NULL,
  category text,
  room text,
  status text,
  quantity numeric(10,2) DEFAULT 1,
  claimed_rcv numeric(10,2),
  adjusted_rcv numeric(10,2),
  tax_rate numeric(5,2),
  age numeric(5,2),
  depreciation_percent numeric(5,2),
  condition item_condition,
  comparable_link text,
  photos text[],
  replacement_cost_applies boolean DEFAULT true,
  replaced boolean DEFAULT false,
  replacement_spent numeric(10,2) DEFAULT 0,
  receipts text[],
  adjuster_notes text,
  submitted_by submission_source,
  policyholder_viewable boolean DEFAULT true,
  clean_allowance boolean DEFAULT false,
  location_coordinates jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Calculated fields that don't depend on other generated columns
  rcv_total numeric(10,2) GENERATED ALWAYS AS (quantity * adjusted_rcv) STORED,
  rcv_plus_tax numeric(10,2) GENERATED ALWAYS AS (quantity * adjusted_rcv * (1 + tax_rate)) STORED,
  depreciation_amount numeric(10,2) GENERATED ALWAYS AS (quantity * adjusted_rcv * (1 + tax_rate) * depreciation_percent) STORED,
  acv numeric(10,2) GENERATED ALWAYS AS (
    quantity * adjusted_rcv * (1 + tax_rate) * (1 - depreciation_percent)
  ) STORED,
  holdback_due numeric(10,2) GENERATED ALWAYS AS (
    LEAST(
      replacement_spent - (quantity * adjusted_rcv * (1 + tax_rate) * (1 - depreciation_percent)),
      quantity * adjusted_rcv * (1 + tax_rate) * depreciation_percent
    )
  ) STORED
);

-- Create item change history table
CREATE TABLE IF NOT EXISTS item_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id),
  user_id uuid REFERENCES users(id),
  user_name text,
  changed_at timestamptz DEFAULT now(),
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text REFERENCES claims(file_number),
  item_id uuid REFERENCES items(id),
  sender_id uuid REFERENCES users(id),
  sender_role user_role,
  message text NOT NULL,
  attachments text[],
  sent_at timestamptz DEFAULT now(),
  read_by jsonb DEFAULT '[]'::jsonb
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text REFERENCES claims(file_number),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create report templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_structure jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create generated reports table
CREATE TABLE IF NOT EXISTS generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id text REFERENCES claims(file_number),
  template_id uuid REFERENCES report_templates(id),
  generated_by uuid REFERENCES users(id),
  generated_at timestamptz DEFAULT now(),
  report_url text,
  spreadsheet_url text,
  share_link text,
  share_link_expiry timestamptz
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins can read all user data
CREATE POLICY "Admins can read all user data" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Claims participants can read claim data
CREATE POLICY "Participants can read claims" ON claims
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claim_participants
      WHERE claim_id = file_number AND user_id = auth.uid()
    )
  );

-- Claim participants can read items
CREATE POLICY "Participants can read items" ON items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM claim_participants
      WHERE claim_id = items.claim_id AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_assigned_adjuster ON claims(assigned_adjuster);
CREATE INDEX IF NOT EXISTS idx_items_claim_id ON items(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_participants_claim_user ON claim_participants(claim_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_claim_id ON messages(claim_id);
CREATE INDEX IF NOT EXISTS idx_item_change_history_item_id ON item_change_history(item_id);