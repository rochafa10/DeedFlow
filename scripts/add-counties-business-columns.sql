-- Add Census Business Patterns columns to counties table
-- Run this SQL in your Supabase SQL editor before running the n8n workflow

ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_establishments INTEGER;
ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_employees INTEGER;
ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_payroll_annual BIGINT;
ALTER TABLE counties ADD COLUMN IF NOT EXISTS census_fips_code VARCHAR(5);
ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_data_year INTEGER;
ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_data_updated TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_counties_fips ON counties(census_fips_code);
CREATE INDEX IF NOT EXISTS idx_counties_establishments ON counties(business_establishments);
CREATE INDEX IF NOT EXISTS idx_counties_employees ON counties(business_employees);

-- Add comments
COMMENT ON COLUMN counties.business_establishments IS 'Number of business establishments from Census CBP data';
COMMENT ON COLUMN counties.business_employees IS 'Total employees from Census CBP data';
COMMENT ON COLUMN counties.business_payroll_annual IS 'Annual payroll in thousands of dollars from Census CBP data';
COMMENT ON COLUMN counties.census_fips_code IS 'Census FIPS code for the county (state+county)';
COMMENT ON COLUMN counties.business_data_year IS 'Year of the Census CBP data';
COMMENT ON COLUMN counties.business_data_updated IS 'Timestamp when business data was last updated';

-- Show current counties table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'counties' 
ORDER BY ordinal_position;