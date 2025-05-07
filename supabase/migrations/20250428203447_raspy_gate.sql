/*
  # Add sample photos to item 1 in claim 002

  1. Changes
    - Add sample photos to the first item in claim 002
    - Use realistic stock photos from Pexels
    
  2. Security
    - Maintains existing RLS policies
*/

-- Update the first item in claim 002 with sample photos
UPDATE items
SET photos = ARRAY[
  'https://images.pexels.com/photos/1139784/pexels-photo-1139784.jpeg',
  'https://images.pexels.com/photos/1139785/pexels-photo-1139785.jpeg',
  'https://images.pexels.com/photos/1139786/pexels-photo-1139786.jpeg',
  'https://images.pexels.com/photos/1139787/pexels-photo-1139787.jpeg',
  'https://images.pexels.com/photos/1139788/pexels-photo-1139788.jpeg'
]
WHERE claim_id = '002'
AND item_number = 1;