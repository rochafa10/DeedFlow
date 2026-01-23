-- ============================================================================
-- SEED FILE: Historical Auction Data
-- Purpose: Populate auction_results table with sample data for analytics testing
-- ============================================================================

-- This seed file creates realistic historical auction data for testing the
-- analytics features including price predictions, bid ratio analysis, and
-- county trend visualization.

DO $$
DECLARE
  v_blair_county_id UUID;
  v_centre_county_id UUID;
  v_bedford_county_id UUID;
  v_property_id UUID;
BEGIN
  -- ============================================================================
  -- STEP 1: Ensure we have sample counties
  -- ============================================================================

  -- Get or create Blair County, PA
  SELECT id INTO v_blair_county_id
  FROM counties
  WHERE county_name = 'Blair' AND state_code = 'PA';

  IF v_blair_county_id IS NULL THEN
    INSERT INTO counties (county_name, state_code, state_name, auction_system)
    VALUES ('Blair', 'PA', 'Pennsylvania', 'Upset -> Judicial -> Repository')
    RETURNING id INTO v_blair_county_id;
  END IF;

  -- Get or create Centre County, PA
  SELECT id INTO v_centre_county_id
  FROM counties
  WHERE county_name = 'Centre' AND state_code = 'PA';

  IF v_centre_county_id IS NULL THEN
    INSERT INTO counties (county_name, state_code, state_name, auction_system)
    VALUES ('Centre', 'PA', 'Pennsylvania', 'Upset -> Judicial -> Repository')
    RETURNING id INTO v_centre_county_id;
  END IF;

  -- Get or create Bedford County, PA
  SELECT id INTO v_bedford_county_id
  FROM counties
  WHERE county_name = 'Bedford' AND state_code = 'PA';

  IF v_bedford_county_id IS NULL THEN
    INSERT INTO counties (county_name, state_code, state_name, auction_system)
    VALUES ('Bedford', 'PA', 'Pennsylvania', 'Upset -> Judicial -> Repository')
    RETURNING id INTO v_bedford_county_id;
  END IF;

  -- ============================================================================
  -- STEP 2: Seed Historical Auction Results (Last 18 Months)
  -- ============================================================================

  -- Blair County - Residential Properties (High Competition Market)
  -- Month 1 (18 months ago)
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '001-123-456',
    '123 Main St', 'Altoona', 'PA', '16602',
    NOW() - INTERVAL '18 months', 'upset', 'sold',
    'Bid4Assets', 'BA-2024-001',
    5000.00, 5000.00, 12500.00, 8200.00, 85000.00,
    15, 8, 100.00,
    'investor', 'Pittsburgh, PA',
    'residential', 'single_family', 5000, 1200, 1985,
    2022, 12, false, 'High demand property, multiple competing bids',
    'manual', 'https://bid4assets.com/auction/001', 0.95
  );

  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '001-123-457',
    '456 Oak Ave', 'Altoona', 'PA', '16602',
    NOW() - INTERVAL '18 months', 'upset', 'sold',
    'Bid4Assets', 'BA-2024-002',
    3500.00, 3500.00, 8200.00, 5100.00, 62000.00,
    12, 6, 100.00,
    'individual', 'Altoona, PA',
    'residential', 'single_family', 4200, 980, 1972,
    2022, 12, false, NULL,
    'manual', 'https://bid4assets.com/auction/002', 0.90
  );

  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '002-234-567',
    '789 Pine Rd', 'Hollidaysburg', 'PA', '16648',
    NOW() - INTERVAL '17 months', 'upset', 'sold',
    'Bid4Assets', 'BA-2024-003',
    2800.00, 2800.00, 3100.00, 4500.00, 48000.00,
    5, 3, 50.00,
    'individual', 'State College, PA',
    'residential', 'single_family', 3800, 850, 1965,
    2022, 12, false, 'Low competition, sold near opening bid',
    'manual', 'https://bid4assets.com/auction/003', 0.85
  );

  -- Blair County - Vacant Land
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '003-345-678',
    'Lot 42 Valley View Dr', 'Altoona', 'PA', '16602',
    NOW() - INTERVAL '16 months', 'judicial', 'sold',
    'Bid4Assets', 'BA-2024-004',
    1200.00, 1200.00, 1850.00, 2100.00, 15000.00,
    7, 4, 50.00,
    'investor', 'Harrisburg, PA',
    'vacant_land', 'agricultural', 21780, NULL, NULL,
    2022, NULL, false, 'Half acre lot, buildable',
    'manual', 'https://bid4assets.com/auction/004', 0.88
  );

  -- Blair County - Commercial Property
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '004-456-789',
    '101 Business Park Dr', 'Altoona', 'PA', '16602',
    NOW() - INTERVAL '15 months', 'repository', 'sold',
    'In-Person', NULL,
    25000.00, 25000.00, 45000.00, 38000.00, 180000.00,
    8, 5, 500.00,
    'institution', 'Philadelphia, PA',
    'commercial', 'office', 12000, 4500, 1990,
    2021, 0, true, 'Former office building, liens cleared',
    'manual', NULL, 0.92
  );

  -- Blair County - More Recent Sales (Higher Prices - Market Trend)
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '005-567-890',
    '234 Maple St', 'Altoona', 'PA', '16602',
    NOW() - INTERVAL '6 months', 'upset', 'sold',
    'Bid4Assets', 'BA-2024-015',
    6000.00, 6000.00, 15200.00, 9500.00, 95000.00,
    18, 9, 100.00,
    'investor', 'Pittsburgh, PA',
    'residential', 'single_family', 5200, 1350, 1995,
    2023, 12, false, 'Renovated property, high demand area',
    'manual', 'https://bid4assets.com/auction/015', 0.95
  );

  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '005-567-891',
    '567 Elm St', 'Hollidaysburg', 'PA', '16648',
    NOW() - INTERVAL '5 months', 'upset', 'sold',
    'Bid4Assets', 'BA-2024-016',
    4500.00, 4500.00, 11800.00, 7200.00, 78000.00,
    14, 7, 100.00,
    'individual', 'Altoona, PA',
    'residential', 'single_family', 4800, 1150, 1982,
    2023, 12, false, NULL,
    'manual', 'https://bid4assets.com/auction/016', 0.93
  );

  -- Blair County - Unsold Properties
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '006-678-901',
    '999 Remote Ln', 'Altoona', 'PA', '16602',
    NOW() - INTERVAL '4 months', 'upset', 'unsold',
    'Bid4Assets', 'BA-2024-017',
    8500.00, 8500.00, NULL, 12000.00, 45000.00,
    0, 0, NULL,
    NULL, NULL,
    'residential', 'single_family', 2500, 650, 1955,
    2023, 12, false, 'Property in poor condition, no bids',
    'manual', 'https://bid4assets.com/auction/017', 0.70
  );

  -- Centre County - University Area (Higher Competition)
  PERFORM upsert_auction_result(
    v_centre_county_id, NULL, 'CC-001-234',
    '1200 University Dr', 'State College', 'PA', '16801',
    NOW() - INTERVAL '12 months', 'upset', 'sold',
    'RealAuction', 'RA-2024-001',
    15000.00, 15000.00, 38500.00, 22000.00, 165000.00,
    25, 12, 250.00,
    'investor', 'Pittsburgh, PA',
    'residential', 'multi_family', 6000, 2400, 1978,
    2022, 12, false, 'Near Penn State, strong rental market',
    'manual', 'https://realauction.com/sale/001', 0.98
  );

  PERFORM upsert_auction_result(
    v_centre_county_id, NULL, 'CC-002-345',
    '450 College Ave', 'State College', 'PA', '16801',
    NOW() - INTERVAL '11 months', 'upset', 'sold',
    'RealAuction', 'RA-2024-002',
    12000.00, 12000.00, 32000.00, 18500.00, 145000.00,
    22, 10, 200.00,
    'investor', 'State College, PA',
    'residential', 'multi_family', 5500, 2200, 1982,
    2022, 12, false, 'Student housing potential',
    'manual', 'https://realauction.com/sale/002', 0.95
  );

  PERFORM upsert_auction_result(
    v_centre_county_id, NULL, 'CC-003-456',
    '789 Park Ave', 'Bellefonte', 'PA', '16823',
    NOW() - INTERVAL '8 months', 'upset', 'sold',
    'RealAuction', 'RA-2024-005',
    5500.00, 5500.00, 8200.00, 7800.00, 72000.00,
    9, 5, 100.00,
    'individual', 'Bellefonte, PA',
    'residential', 'single_family', 4500, 1100, 1968,
    2023, 12, false, NULL,
    'manual', 'https://realauction.com/sale/005', 0.90
  );

  -- Centre County - Recent Sales (Price Growth)
  PERFORM upsert_auction_result(
    v_centre_county_id, NULL, 'CC-004-567',
    '321 Innovation Way', 'State College', 'PA', '16801',
    NOW() - INTERVAL '3 months', 'upset', 'sold',
    'RealAuction', 'RA-2024-010',
    18000.00, 18000.00, 48500.00, 28000.00, 185000.00,
    28, 14, 300.00,
    'investor', 'Philadelphia, PA',
    'residential', 'multi_family', 6500, 2800, 1995,
    2023, 12, false, 'Prime location, bidding war',
    'manual', 'https://realauction.com/sale/010', 0.97
  );

  -- Bedford County - Rural Properties (Lower Competition)
  PERFORM upsert_auction_result(
    v_bedford_county_id, NULL, 'BF-100-200',
    '5678 Country Rd', 'Bedford', 'PA', '15522',
    NOW() - INTERVAL '14 months', 'upset', 'sold',
    'In-Person', NULL,
    2500.00, 2500.00, 2800.00, 4200.00, 42000.00,
    3, 2, 100.00,
    'individual', 'Bedford, PA',
    'residential', 'single_family', 8000, 980, 1960,
    2022, 12, false, 'Rural location, low competition',
    'manual', NULL, 0.82
  );

  PERFORM upsert_auction_result(
    v_bedford_county_id, NULL, 'BF-101-201',
    '1234 Mountain View Rd', 'Everett', 'PA', '15537',
    NOW() - INTERVAL '13 months', 'upset', 'sold',
    'In-Person', NULL,
    1800.00, 1800.00, 1950.00, 3100.00, 38000.00,
    2, 2, 50.00,
    'individual', 'Everett, PA',
    'residential', 'single_family', 7200, 850, 1955,
    2022, 12, false, 'Fixer-upper, minimal bidding',
    'manual', NULL, 0.80
  );

  PERFORM upsert_auction_result(
    v_bedford_county_id, NULL, 'BF-102-202',
    'Lot 15 Ridge Rd', 'Bedford', 'PA', '15522',
    NOW() - INTERVAL '10 months', 'judicial', 'sold',
    'In-Person', NULL,
    800.00, 800.00, 1200.00, 1500.00, 18000.00,
    4, 3, 50.00,
    'individual', 'Bedford, PA',
    'vacant_land', 'agricultural', 43560, NULL, NULL,
    2022, NULL, false, 'One acre, wooded lot',
    'manual', NULL, 0.85
  );

  PERFORM upsert_auction_result(
    v_bedford_county_id, NULL, 'BF-103-203',
    '9876 Main St', 'Bedford', 'PA', '15522',
    NOW() - INTERVAL '7 months', 'repository', 'sold',
    'In-Person', NULL,
    3200.00, 3200.00, 3500.00, 5800.00, 48000.00,
    2, 2, 100.00,
    'individual', 'Altoona, PA',
    'residential', 'single_family', 5800, 920, 1962,
    2023, 0, false, 'Repository sale, low turnout',
    'manual', NULL, 0.78
  );

  -- Bedford County - Recent Unsold Property
  PERFORM upsert_auction_result(
    v_bedford_county_id, NULL, 'BF-104-204',
    '4321 Abandoned Rd', 'Bedford', 'PA', '15522',
    NOW() - INTERVAL '2 months', 'upset', 'unsold',
    'In-Person', NULL,
    5000.00, 5000.00, NULL, 7200.00, 28000.00,
    0, 0, NULL,
    NULL, NULL,
    'residential', 'single_family', 3200, 580, 1945,
    2023, 12, false, 'Severe structural issues, no bids',
    'manual', NULL, 0.65
  );

  -- Add more seasonal variation (Summer vs Winter sales)
  -- Blair County - Summer Sale (Higher Activity)
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '007-789-012',
    '888 Summer Ln', 'Altoona', 'PA', '16602',
    DATE_TRUNC('month', NOW()) - INTERVAL '2 months' + INTERVAL '15 days', -- Recent summer
    'upset', 'sold',
    'Bid4Assets', 'BA-2024-020',
    5500.00, 5500.00, 14200.00, 8900.00, 88000.00,
    20, 10, 100.00,
    'investor', 'State College, PA',
    'residential', 'single_family', 5100, 1280, 1988,
    2024, 12, false, 'Summer sale, high activity',
    'manual', 'https://bid4assets.com/auction/020', 0.94
  );

  -- Blair County - Winter Sale (Lower Activity)
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '008-890-123',
    '777 Winter St', 'Altoona', 'PA', '16602',
    DATE_TRUNC('month', NOW()) - INTERVAL '3 months' - INTERVAL '15 days', -- Winter
    'upset', 'sold',
    'Bid4Assets', 'BA-2024-018',
    4800.00, 4800.00, 6200.00, 7500.00, 65000.00,
    6, 4, 100.00,
    'individual', 'Altoona, PA',
    'residential', 'single_family', 4400, 1050, 1975,
    2024, 12, false, 'Winter sale, lower competition',
    'manual', 'https://bid4assets.com/auction/018', 0.88
  );

  -- Centre County - Additional Recent Sales for Trend Analysis
  PERFORM upsert_auction_result(
    v_centre_county_id, NULL, 'CC-005-678',
    '555 Campus Dr', 'State College', 'PA', '16801',
    NOW() - INTERVAL '2 months', 'upset', 'sold',
    'RealAuction', 'RA-2024-011',
    16500.00, 16500.00, 42000.00, 25000.00, 172000.00,
    24, 11, 250.00,
    'investor', 'Pittsburgh, PA',
    'residential', 'multi_family', 6200, 2500, 1985,
    2024, 12, false, 'Strong rental market continues',
    'manual', 'https://realauction.com/sale/011', 0.96
  );

  PERFORM upsert_auction_result(
    v_centre_county_id, NULL, 'CC-006-789',
    '123 Nittany Ave', 'State College', 'PA', '16801',
    NOW() - INTERVAL '1 month', 'upset', 'sold',
    'RealAuction', 'RA-2024-012',
    14000.00, 14000.00, 36800.00, 21000.00, 158000.00,
    21, 9, 200.00,
    'investor', 'State College, PA',
    'residential', 'multi_family', 5800, 2300, 1980,
    2024, 12, false, 'Recent sale, competitive bidding',
    'manual', 'https://realauction.com/sale/012', 0.95
  );

  -- Add Multi-Family and Commercial for Property Type Diversity
  PERFORM upsert_auction_result(
    v_blair_county_id, NULL, '009-901-234',
    '432 Duplex Dr', 'Altoona', 'PA', '16602',
    NOW() - INTERVAL '9 months', 'upset', 'sold',
    'Bid4Assets', 'BA-2024-008',
    8500.00, 8500.00, 18200.00, 12500.00, 125000.00,
    13, 7, 150.00,
    'investor', 'Pittsburgh, PA',
    'residential', 'multi_family', 5800, 2000, 1975,
    2023, 12, false, 'Duplex, cash flowing property',
    'manual', 'https://bid4assets.com/auction/008', 0.93
  );

  PERFORM upsert_auction_result(
    v_bedford_county_id, NULL, 'BF-105-205',
    '200 Industrial Blvd', 'Bedford', 'PA', '15522',
    NOW() - INTERVAL '11 months', 'repository', 'sold',
    'In-Person', NULL,
    12000.00, 12000.00, 14500.00, 18000.00, 95000.00,
    3, 2, 500.00,
    'institution', 'Altoona, PA',
    'industrial', 'warehouse', 25000, 8000, 1985,
    2021, 0, true, 'Industrial warehouse, limited interest',
    'manual', NULL, 0.85
  );

  RAISE NOTICE 'Successfully seeded % auction results across % counties',
    (SELECT COUNT(*) FROM auction_results),
    (SELECT COUNT(DISTINCT county_id) FROM auction_results);

END $$;

-- ============================================================================
-- VERIFY SEED DATA
-- ============================================================================

-- Show summary of seeded data
SELECT
  c.county_name,
  c.state_code,
  COUNT(*) as auction_count,
  COUNT(*) FILTER (WHERE ar.sale_status = 'sold') as sold_count,
  COUNT(*) FILTER (WHERE ar.sale_status = 'unsold') as unsold_count,
  ROUND(AVG(ar.final_sale_price) FILTER (WHERE ar.sale_status = 'sold'), 2) as avg_sale_price,
  ROUND(AVG(ar.bid_ratio) FILTER (WHERE ar.sale_status = 'sold'), 4) as avg_bid_ratio
FROM auction_results ar
JOIN counties c ON ar.county_id = c.id
GROUP BY c.county_name, c.state_code
ORDER BY c.county_name;

-- Show date range of seeded data
SELECT
  MIN(sale_date) as earliest_sale,
  MAX(sale_date) as latest_sale,
  COUNT(*) as total_records
FROM auction_results;

-- Show property type distribution
SELECT
  property_type,
  COUNT(*) as count,
  ROUND(AVG(final_sale_price) FILTER (WHERE sale_status = 'sold'), 2) as avg_price
FROM auction_results
GROUP BY property_type
ORDER BY count DESC;
