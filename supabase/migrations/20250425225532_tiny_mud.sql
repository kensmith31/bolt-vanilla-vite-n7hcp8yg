/*
  # Add predefined categories

  1. Changes
    - Add predefined categories to the categories table
    - Set default category to 'Unassigned'
    - Add name column for category display name
  
  2. Security
    - Maintain existing RLS policies
*/

-- First, add a name column to store the display name
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS name text NOT NULL;

-- Insert predefined categories
INSERT INTO categories (id, name, created_at)
VALUES 
  (1, 'Unassigned', NOW()),
  (2, 'Alcohol', NOW()),
  (3, 'Antique & Collectible', NOW()),
  (4, 'Apparel', NOW()),
  (5, 'Appliance', NOW()),
  (6, 'Art', NOW()),
  (7, 'Baby Care', NOW()),
  (8, 'Bedding', NOW()),
  (9, 'Boat', NOW()),
  (10, 'Book', NOW()),
  (11, 'Building Material', NOW()),
  (12, 'Business Equipment', NOW()),
  (13, 'Camera & Photo', NOW()),
  (14, 'Cash', NOW()),
  (15, 'Computer', NOW()),
  (16, 'Craft & Hobby', NOW()),
  (17, 'Designer Bag', NOW()),
  (18, 'Electronic', NOW()),
  (19, 'Equestrian', NOW()),
  (20, 'Eyewear', NOW()),
  (21, 'Firearm', NOW()),
  (22, 'Food', NOW()),
  (23, 'Footwear', NOW()),
  (24, 'Furniture', NOW()),
  (25, 'Gym Equipment', NOW()),
  (26, 'Health & Beauty', NOW()),
  (27, 'Holiday Decoration', NOW()),
  (28, 'Household Good', NOW()),
  (29, 'Housewares', NOW()),
  (30, 'Kitchenware', NOW()),
  (31, 'Lamps & Lighting', NOW()),
  (32, 'Luggage', NOW()),
  (33, 'Mattresses & Bedding', NOW()),
  (34, 'Media', NOW()),
  (35, 'Medical Care', NOW()),
  (36, 'Motorized Vehicle', NOW()),
  (37, 'Musical Instrument', NOW()),
  (38, 'Office', NOW()),
  (39, 'Optical Equipment', NOW()),
  (40, 'Outdoor Furniture', NOW()),
  (41, 'Pack Out', NOW()),
  (42, 'Personal Effect', NOW()),
  (43, 'Pet', NOW()),
  (44, 'Pillows & Cushions', NOW()),
  (45, 'Plant', NOW()),
  (46, 'Pool & Spa', NOW()),
  (47, 'Religious Item', NOW()),
  (48, 'Restoration', NOW()),
  (49, 'Rugs & Carpets', NOW()),
  (50, 'Scheduled Item', NOW()),
  (51, 'Shipping & Moving', NOW()),
  (52, 'Silver - Sterling', NOW()),
  (53, 'Smoking Accessories', NOW()),
  (54, 'Sporting Good', NOW()),
  (55, 'Storage', NOW()),
  (56, 'Structure', NOW()),
  (57, 'Tableware', NOW()),
  (58, 'Tool', NOW()),
  (59, 'Towel', NOW()),
  (60, 'Toys & Games', NOW()),
  (61, 'Trailer', NOW()),
  (62, 'Unassigned', NOW()),
  (63, 'Window Treatment', NOW()),
  (64, 'Yard & Garden', NOW())
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Set sequence to start after our predefined categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));