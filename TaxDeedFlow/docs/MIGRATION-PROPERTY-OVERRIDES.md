# Database Migration Guide - Property Overrides

## Migration File
`./TaxDeedFlow/supabase/migrations/20260123000001_create_property_overrides.sql`

## Overview
This migration creates the `property_overrides` table and associated indexes for persisting user-made property modifications.

## What Gets Created

### Table: `property_overrides`
Stores user-made modifications to property data fields with full change history.

**Columns:**
- `id` (UUID) - Primary key
- `property_id` (UUID) - Foreign key to properties table
- `field_name` (TEXT) - Name of modified field (e.g., 'total_due', 'property_address')
- `original_value` (TEXT) - Original value from data source
- `override_value` (TEXT) - User's custom value
- `override_reason` (TEXT) - Optional explanation for the change
- `created_by` (UUID) - User ID who made the change (references auth.users)
- `is_active` (BOOLEAN) - true = active override, false = reverted (preserves history)
- `created_at` (TIMESTAMPTZ) - When override was created
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### Indexes Created
1. `idx_property_overrides_property` - Fast lookups by property
2. `idx_property_overrides_field` - Fast lookups by field name
3. `idx_property_overrides_active` - Partial index for active overrides
4. `idx_property_overrides_created_at` - Date sorting
5. `idx_property_overrides_created_by` - User filtering
6. `idx_property_overrides_property_active` - Composite index for active overrides by property
7. `idx_property_overrides_property_created` - Composite index for change history
8. `idx_property_overrides_user_created` - Composite index for user's changes
9. `idx_property_overrides_unique_active` - Unique constraint (one active override per field per property)

## How to Apply the Migration

### Option 1: Supabase CLI (Recommended)

```bash
# Navigate to the TaxDeedFlow directory
cd TaxDeedFlow

# Ensure Supabase CLI is installed
npm install -g supabase

# Link to your Supabase project (if not already linked)
supabase link --project-ref <your-project-ref>

# Push migrations to database
supabase db push

# Or reset and apply all migrations
supabase db reset
```

### Option 2: Supabase Dashboard (Manual)

1. Go to https://app.supabase.com/project/<your-project-id>/editor/sql
2. Create a new query
3. Copy the entire contents of `./TaxDeedFlow/supabase/migrations/20260123000001_create_property_overrides.sql`
4. Paste into the SQL editor
5. Click "Run" to execute
6. Verify the table was created successfully

### Option 3: Direct SQL Execution

If you have direct PostgreSQL access:

```bash
# Execute the migration file
psql -h <supabase-host> -U postgres -d postgres -f ./TaxDeedFlow/supabase/migrations/20260123000001_create_property_overrides.sql
```

## Verification

After applying the migration, verify the table exists:

```sql
-- Check table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'property_overrides';

-- Check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'property_overrides'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'property_overrides';

-- Verify unique constraint works
-- This should succeed (first active override)
INSERT INTO property_overrides (property_id, field_name, original_value, override_value, is_active)
VALUES (gen_random_uuid(), 'test_field', 'old', 'new', true);

-- This should fail (duplicate active override for same property + field)
INSERT INTO property_overrides (property_id, field_name, original_value, override_value, is_active)
SELECT property_id, field_name, 'old2', 'new2', true
FROM property_overrides
WHERE field_name = 'test_field' AND is_active = true
LIMIT 1;

-- Clean up test data
DELETE FROM property_overrides WHERE field_name = 'test_field';
```

Expected results:
- Table has 10 columns
- 9 indexes created
- Unique constraint prevents duplicate active overrides

## Dependencies

This migration requires:
- ✅ `properties` table must exist (for foreign key reference)
- ✅ `auth.users` table must exist (built-in Supabase auth)

## Rollback

If you need to rollback this migration:

```sql
BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_property_overrides_unique_active;
DROP INDEX IF EXISTS idx_property_overrides_user_created;
DROP INDEX IF EXISTS idx_property_overrides_property_created;
DROP INDEX IF EXISTS idx_property_overrides_property_active;
DROP INDEX IF EXISTS idx_property_overrides_created_by;
DROP INDEX IF EXISTS idx_property_overrides_created_at;
DROP INDEX IF EXISTS idx_property_overrides_active;
DROP INDEX IF EXISTS idx_property_overrides_field;
DROP INDEX IF EXISTS idx_property_overrides_property;

-- Drop table
DROP TABLE IF EXISTS property_overrides;

COMMIT;
```

## Next Steps

After applying this migration:

1. ✅ Verify table exists (run verification SQL above)
2. ✅ Test the API endpoints that use this table:
   - PATCH `/api/properties/[id]` - Update property field
   - GET `/api/properties/[id]/overrides` - List overrides
   - DELETE `/api/properties/[id]/overrides?field=<field_name>` - Revert override
3. ✅ Test the frontend UI:
   - Edit property fields
   - Verify override indicators appear
   - Test revert functionality
   - Check change history modal

## Related Files

- Migration: `./TaxDeedFlow/supabase/migrations/20260123000001_create_property_overrides.sql`
- Schema reference: `./sql/property-overrides-schema.sql`
- API endpoints: `./TaxDeedFlow/src/app/api/properties/[id]/route.ts`
- API endpoints: `./TaxDeedFlow/src/app/api/properties/[id]/overrides/route.ts`
- React hook: `./TaxDeedFlow/src/hooks/usePropertyOverrides.ts`
- UI component: `./TaxDeedFlow/src/components/properties/FieldOverrideIndicator.tsx`

## Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Verify `properties` table exists
3. Ensure you have sufficient privileges
4. Review error messages carefully

## Status

- ✅ Migration file created
- ⏳ Migration application pending
- ⏳ Verification pending
