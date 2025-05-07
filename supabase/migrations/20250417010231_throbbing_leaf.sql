/*
  # Seed Items Table with Common Household Property

  1. Changes
    - Add sample items across different categories
    - Include realistic values and descriptions
    - Set appropriate conditions and ages
    
  2. Categories
    - Electronics
    - Furniture
    - Kitchen
    - Clothing
    - Jewelry
    - Sporting Goods
*/

-- Create a test claim if it doesn't exist
INSERT INTO claims (
  file_number,
  insured_name,
  phone_number,
  email,
  status,
  default_tax_rate,
  depreciation_applicable,
  depreciation_recoverable,
  property_address,
  property_zip_code
)
VALUES (
  '002',
  'John Smith',
  '555-123-4567',
  'john.smith@example.com',
  'active',
  8.25,
  true,
  true,
  '123 Main Street',
  '12345'
)
ON CONFLICT (file_number) DO NOTHING;

-- Electronics
INSERT INTO items (
  claim_id,
  description,
  category,
  room,
  status,
  quantity,
  claimed_rcv,
  adjusted_rcv,
  age,
  depreciation_percent,
  condition,
  comparable_link,
  adjuster_notes,
  submitted_by,
  policyholder_viewable
) VALUES
('002', 'Samsung 65" 4K Smart TV', 'Electronics', 'Living Room', 'submitted', 1, 1299.99, 1199.99, 2.5, 0.25, 'good', 'https://www.samsung.com/tv/q60', 'Model QN65Q60B verified', 'policyholder', true),
('002', 'MacBook Pro 16" 2022', 'Electronics', 'Home Office', 'submitted', 1, 2499.99, 2499.99, 1.0, 0.15, 'good', 'https://www.apple.com/macbook-pro', 'Receipt provided', 'policyholder', true),
('002', 'Sony PlayStation 5', 'Electronics', 'Family Room', 'submitted', 1, 499.99, 499.99, 1.5, 0.20, 'good', 'https://www.playstation.com/ps5', 'Standard edition', 'policyholder', true);

-- Furniture
INSERT INTO items (
  claim_id,
  description,
  category,
  room,
  status,
  quantity,
  claimed_rcv,
  adjusted_rcv,
  age,
  depreciation_percent,
  condition,
  comparable_link,
  adjuster_notes,
  submitted_by,
  policyholder_viewable
) VALUES
('002', 'Leather Sectional Sofa', 'Furniture', 'Living Room', 'submitted', 1, 2999.99, 2799.99, 3.0, 0.30, 'fair', 'https://www.ashleyfurniture.com/sofa', 'Some wear on armrests', 'policyholder', true),
('002', 'Queen Size Bed Frame', 'Furniture', 'Master Bedroom', 'submitted', 1, 899.99, 899.99, 4.0, 0.35, 'good', 'https://www.wayfair.com/bed-frame', 'Solid wood construction', 'policyholder', true),
('002', 'Dining Table with 6 Chairs', 'Furniture', 'Dining Room', 'submitted', 1, 1599.99, 1499.99, 5.0, 0.40, 'fair', 'https://www.roomandboard.com/dining', 'Minor scratches on table surface', 'policyholder', true);

-- Kitchen
INSERT INTO items (
  claim_id,
  description,
  category,
  room,
  status,
  quantity,
  claimed_rcv,
  adjusted_rcv,
  age,
  depreciation_percent,
  condition,
  comparable_link,
  adjuster_notes,
  submitted_by,
  policyholder_viewable
) VALUES
('002', 'KitchenAid Stand Mixer', 'Kitchen', 'Kitchen', 'submitted', 1, 449.99, 449.99, 2.0, 0.20, 'good', 'https://www.kitchenaid.com/mixer', 'Professional 5qt model', 'policyholder', true),
('002', 'Cuisinart Coffee Maker', 'Kitchen', 'Kitchen', 'submitted', 1, 129.99, 119.99, 3.5, 0.30, 'fair', 'https://www.cuisinart.com/coffee', '12-cup programmable', 'policyholder', true),
('002', 'Ninja Air Fryer', 'Kitchen', 'Kitchen', 'submitted', 1, 149.99, 149.99, 1.0, 0.15, 'good', 'https://www.ninjakitchen.com/airfryer', '6qt capacity', 'policyholder', true);

-- Clothing
INSERT INTO items (
  claim_id,
  description,
  category,
  room,
  status,
  quantity,
  claimed_rcv,
  adjusted_rcv,
  age,
  depreciation_percent,
  condition,
  comparable_link,
  adjuster_notes,
  submitted_by,
  policyholder_viewable
) VALUES
('002', 'Men''s Suits', 'Clothing', 'Master Bedroom', 'submitted', 3, 699.99, 649.99, 2.0, 0.25, 'good', 'https://www.menswearhouse.com/suits', 'Designer brands', 'policyholder', true),
('002', 'Women''s Dresses', 'Clothing', 'Master Bedroom', 'submitted', 5, 199.99, 179.99, 1.5, 0.20, 'good', 'https://www.nordstrom.com/dresses', 'Casual and formal wear', 'policyholder', true),
('002', 'Athletic Shoes', 'Clothing', 'Master Bedroom', 'submitted', 2, 129.99, 119.99, 1.0, 0.15, 'good', 'https://www.nike.com/running', 'Nike running shoes', 'policyholder', true);

-- Jewelry
INSERT INTO items (
  claim_id,
  description,
  category,
  room,
  status,
  quantity,
  claimed_rcv,
  adjusted_rcv,
  age,
  depreciation_percent,
  condition,
  comparable_link,
  adjuster_notes,
  submitted_by,
  policyholder_viewable
) VALUES
('002', 'Diamond Engagement Ring', 'Jewelry', 'Master Bedroom', 'submitted', 1, 5999.99, 5999.99, 5.0, 0.10, 'good', 'https://www.bluenile.com/rings', '1.5ct center stone, platinum band', 'policyholder', true),
('002', 'Men''s Wedding Band', 'Jewelry', 'Master Bedroom', 'submitted', 1, 899.99, 899.99, 5.0, 0.10, 'good', 'https://www.jared.com/bands', '14K white gold', 'policyholder', true),
('002', 'Women''s Watch', 'Jewelry', 'Master Bedroom', 'submitted', 1, 349.99, 329.99, 2.0, 0.15, 'good', 'https://www.fossil.com/watches', 'Fossil smartwatch', 'policyholder', true);

-- Sporting Goods
INSERT INTO items (
  claim_id,
  description,
  category,
  room,
  status,
  quantity,
  claimed_rcv,
  adjusted_rcv,
  age,
  depreciation_percent,
  condition,
  comparable_link,
  adjuster_notes,
  submitted_by,
  policyholder_viewable
) VALUES
('002', 'Trek Mountain Bike', 'Sporting Goods', 'Garage', 'submitted', 1, 1299.99, 1199.99, 3.0, 0.30, 'fair', 'https://www.trekbikes.com/mtb', 'Front suspension, aluminum frame', 'policyholder', true),
('002', 'Golf Club Set', 'Sporting Goods', 'Garage', 'submitted', 1, 899.99, 849.99, 2.5, 0.25, 'good', 'https://www.callawaygolf.com/sets', 'Callaway complete set with bag', 'policyholder', true),
('002', 'Camping Tent', 'Sporting Goods', 'Garage', 'submitted', 1, 299.99, 279.99, 4.0, 0.35, 'fair', 'https://www.rei.com/tents', '4-person tent with rainfly', 'policyholder', true);