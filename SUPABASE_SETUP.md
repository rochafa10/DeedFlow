# Supabase Database Setup Guide

## Quick Setup (Recommended)

### Step 1: Access Supabase SQL Editor
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Migration
1. Copy the entire contents of `/supabase/migrations/001_initial_schema.sql`
2. Paste it into the SQL Editor
3. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Tables Created
After running the migration, you should see the following tables in your database:

#### Core Tables:
- `states` - US states configuration
- `counties` - Counties within states
- `properties` - Main property records
- `property_valuations` - Property value estimates
- `property_owners` - Owner information
- `property_legal` - Legal descriptions
- `property_liens` - Lien records
- `neighborhood_analysis` - Neighborhood data
- `risk_assessments` - Risk evaluation

#### Auction Tables:
- `auctions` - Auction events
- `auction_properties` - Properties in auctions
- `auction_documents` - Auction documents

#### Analysis Tables:
- `inspections` - Property inspections
- `inspection_items` - Individual inspection items
- `financial_analyses` - Investment analysis
- `bidding_lists` - User bidding lists
- `bidding_properties` - Properties in bidding lists

#### Photo Tables:
- `property_photos` - Property images
- `enrichment_logs` - Data enrichment tracking
- `notification_logs` - System notifications

## Environment Variables Setup

Add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For admin operations (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Where to Find Your Keys:
1. Go to your Supabase project
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Enable Row Level Security (RLS)

For production, you should enable RLS on all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Create a basic read policy (customize as needed)
CREATE POLICY "Enable read access for all users" ON properties
  FOR SELECT USING (true);

-- Create authenticated write policy
CREATE POLICY "Enable write for authenticated users" ON properties
  FOR ALL USING (auth.role() = 'authenticated');
```

## Test Your Setup

### Using the App:
1. Restart your development server: `npm run dev`
2. The app should now connect to your Supabase database
3. Try enriching a property - it will now save to the database

### Using Supabase Dashboard:
1. Go to **Table Editor** in your Supabase dashboard
2. You should see all the tables listed
3. Click on any table to view its structure

## Alternative: Programmatic Setup

If you prefer to set up the database programmatically:

```bash
# Install additional dependency
npm install dotenv

# Run the setup script
node scripts/setup-database.js
```

**Note:** The programmatic approach requires the service role key and may not work for all SQL statements. The manual SQL Editor approach is more reliable.

## Troubleshooting

### "Permission denied" errors
- Make sure you're using the service_role key for admin operations
- Check that RLS policies are configured correctly

### "Relation already exists" errors
- The tables are already created
- You can drop all tables and recreate: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- ⚠️ This will delete all data!

### Connection issues
- Verify your Supabase URL is correct
- Check that your API keys are valid
- Ensure your Supabase project is active (not paused)

## Next Steps

1. **Set up authentication** if needed
2. **Configure RLS policies** for security
3. **Create database functions** for complex operations
4. **Set up real-time subscriptions** for live updates
5. **Configure backups** in Supabase dashboard

## Sample Data

To add sample data for testing:

```sql
-- Insert sample states
INSERT INTO states (code, name, auction_type, is_active) VALUES
  ('FL', 'Florida', 'Tax Deed', true),
  ('TX', 'Texas', 'Tax Deed', true),
  ('GA', 'Georgia', 'Tax Deed', true);

-- Insert sample counties
INSERT INTO counties (state_id, name, state_code) 
SELECT id, 'Miami-Dade', 'FL' FROM states WHERE code = 'FL';

-- Add more sample data as needed
```

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [SQL Editor Guide](https://supabase.com/docs/guides/database/sql-editor)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)