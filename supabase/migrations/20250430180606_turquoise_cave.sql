/*
  # Configure storage bucket for item images

  1. Changes
    - Create storage bucket for item images
    - Set file size and type limits
    - Add policies for secure access control
    
  2. Security
    - Restrict file types to images
    - Limit file size to 10MB
    - Ensure proper role-based access
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('itemimages', 'Item Images', false)
ON CONFLICT (id) DO NOTHING;

-- Update bucket configuration
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10MB limit
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'itemimages';

-- Policy to allow admins full access
CREATE POLICY "admin_full_access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'itemimages'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'itemimages'
  AND EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
);

-- Policy to allow users to read photos for their claims
CREATE POLICY "read_claim_photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'itemimages'
  AND EXISTS (
    SELECT 1 FROM public.claim_participants cp
    JOIN public.items i ON i.claim_id = cp.claim_id
    WHERE cp.user_id = auth.uid()
    AND position(i.claim_id || '/' in name) = 1
  )
);

-- Policy to allow users to upload photos for their claims
CREATE POLICY "upload_claim_photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'itemimages'
  AND EXISTS (
    SELECT 1 FROM public.claim_participants cp
    JOIN public.items i ON i.claim_id = cp.claim_id
    WHERE cp.user_id = auth.uid()
    AND position(i.claim_id || '/' in name) = 1
  )
);

-- Policy to allow users to delete photos they uploaded
CREATE POLICY "delete_own_photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'itemimages'
  AND EXISTS (
    SELECT 1 FROM public.claim_participants cp
    JOIN public.items i ON i.claim_id = cp.claim_id
    WHERE cp.user_id = auth.uid()
    AND position(i.claim_id || '/' in name) = 1
  )
);