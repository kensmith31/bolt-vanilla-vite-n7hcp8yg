/*
  # Add comparable image functionality

  1. Changes
    - Add comparable_image column to items table
    - Create storage bucket for comparable images
    - Set up secure access policies
    
  2. Security
    - Enable RLS on storage bucket
    - Restrict access based on claim participation
    - Allow staff to upload images
*/

-- Add comparable_image column to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS comparable_image text;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('comparableimages', 'Comparable Images', false)
ON CONFLICT (id) DO NOTHING;

-- Update bucket configuration
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'comparableimages';

-- Policy to allow admins full access
CREATE POLICY "admin_full_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'comparableimages'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'comparableimages'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
);

-- Policy to allow users to read comparable images for their claims
CREATE POLICY "read_comparable_images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comparableimages'
  AND EXISTS (
    SELECT 1 FROM public.claim_participants cp
    JOIN public.items i ON i.claim_id = cp.claim_id
    WHERE cp.user_id = auth.uid()
    AND position(i.claim_id || '/' in name) = 1
  )
);

-- Policy to allow staff to upload comparable images
CREATE POLICY "staff_upload_comparable_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comparableimages'
  AND EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name IN ('admin', 'desk_adjuster', 'field_adjuster')
  )
);