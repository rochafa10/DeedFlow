# Apply Watchlist Schema Migration

## Migration File
`20260123000001_create_watchlists.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `20260123000001_create_watchlists.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

### Option 2: Supabase CLI (if installed)
```bash
cd TaxDeedFlow
supabase db push
```

### What This Migration Creates

#### Tables
- **watchlists**: Stores named watchlists (e.g., 'High Priority', 'Research Needed')
  - user_id, name, description, color
  - Unique constraint on (user_id, name)

- **watchlist_items**: Tracks properties in watchlists
  - watchlist_id, property_id, max_bid, notes, priority
  - last_status, status_changed_at (for change detection)
  - Unique constraint on (watchlist_id, property_id)

#### RLS Policies
- Both tables have full RLS enabled
- Users can only access their own watchlists and items
- Policies: SELECT, INSERT, UPDATE, DELETE all restricted by user_id

#### Helper Functions
- `create_watchlist()` - Create a new watchlist
- `add_to_watchlist()` - Add property to watchlist
- `remove_from_watchlist()` - Remove property from watchlist
- `update_watchlist_item()` - Update item details
- `detect_watchlist_status_changes()` - Find properties with status changes
- `update_watchlist_statuses()` - Update all tracked statuses

#### Views
- `vw_watchlist_items_complete` - Full property details with watchlist info
- `vw_watchlist_summary` - Watchlist counts and stats
- `vw_watchlist_status_changes` - Properties with recent status changes

## Verification

After applying, verify the following:

1. **Tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name IN ('watchlists', 'watchlist_items');
   ```

2. **RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE tablename IN ('watchlists', 'watchlist_items');
   ```

3. **Policies exist:**
   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN ('watchlists', 'watchlist_items');
   ```

4. **Functions exist:**
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname LIKE '%watchlist%';
   ```

## Test Queries

```sql
-- Test creating a watchlist (use your actual user_id)
SELECT create_watchlist(
  auth.uid(),
  'Test Watchlist',
  'Test description',
  '#3b82f6'
);

-- View summary
SELECT * FROM vw_watchlist_summary WHERE user_id = auth.uid();
```
