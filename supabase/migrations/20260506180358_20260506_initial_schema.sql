/*
  # Initial Schema Setup for Vehicle Usage Forms

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users with CASCADE delete)
      - `full_name` (text)
      - `role` (text, CHECK 'admin' or 'employee', DEFAULT 'employee')
      - `badge_number` (text, nullable)
      - `created_at` (timestamptz, DEFAULT now())
      - `updated_at` (timestamptz, DEFAULT now())

    - `pdf_templates`
      - `id` (uuid, primary key, DEFAULT gen_random_uuid())
      - `name` (text, NOT NULL)
      - `file_url` (text, NOT NULL)
      - `created_at` (timestamptz, DEFAULT now())
      - `updated_at` (timestamptz, DEFAULT now())

    - `pdf_fields`
      - `id` (uuid, primary key, DEFAULT gen_random_uuid())
      - `template_id` (uuid, foreign key to pdf_templates with CASCADE delete)
      - `name` (text, NOT NULL)
      - `type` (text, CHECK 'editable' or 'prefilled', NOT NULL)
      - `value` (text, nullable)
      - `x` (numeric, NOT NULL)
      - `y` (numeric, NOT NULL)
      - `width` (numeric, NOT NULL)
      - `height` (numeric, NOT NULL)
      - `page` (integer, NOT NULL, DEFAULT 1)
      - `created_at` (timestamptz, DEFAULT now())
      - `updated_at` (timestamptz, DEFAULT now())

  2. Security
    - Enable RLS on all tables
    - profiles: users can read/update own profile; admins can read all profiles; admins can insert/delete profiles
    - pdf_templates: authenticated users can read; admins can insert/update/delete
    - pdf_fields: authenticated users can read; admins can insert/update/delete

  3. Database Functions
    - `get_profiles_with_email()`: joins profiles with auth.users to return email addresses

  4. Important Notes
    - profiles.id references auth.users.id with CASCADE delete
    - pdf_fields.template_id references pdf_templates.id with CASCADE delete
    - Role-based access control uses profiles.role column
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  role text CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  badge_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pdf_templates table
CREATE TABLE IF NOT EXISTS pdf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pdf_fields table
CREATE TABLE IF NOT EXISTS pdf_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES pdf_templates ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('editable', 'prefilled')) NOT NULL,
  value text,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  page integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_fields ENABLE ROW LEVEL SECURITY;

-- ===========================
-- Profiles RLS Policies
-- ===========================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ===========================
-- PDF Templates RLS Policies
-- ===========================

-- Authenticated users can view templates
CREATE POLICY "Authenticated users can view templates"
  ON pdf_templates FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert templates
CREATE POLICY "Admins can insert templates"
  ON pdf_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update templates
CREATE POLICY "Admins can update templates"
  ON pdf_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete templates
CREATE POLICY "Admins can delete templates"
  ON pdf_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ===========================
-- PDF Fields RLS Policies
-- ===========================

-- Authenticated users can view fields
CREATE POLICY "Authenticated users can view fields"
  ON pdf_fields FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert fields
CREATE POLICY "Admins can insert fields"
  ON pdf_fields FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update fields
CREATE POLICY "Admins can update fields"
  ON pdf_fields FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete fields
CREATE POLICY "Admins can delete fields"
  ON pdf_fields FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ===========================
-- Helper Function
-- ===========================

-- Function to get profiles with email from auth.users
CREATE OR REPLACE FUNCTION get_profiles_with_email()
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  badge_number text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.role,
    p.badge_number,
    u.email
  FROM profiles p
  INNER JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

-- ===========================
-- Indexes
-- ===========================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_pdf_fields_template_id ON pdf_fields(template_id);
