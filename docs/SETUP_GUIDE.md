# Tax Deed Platform - Complete Setup Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- n8n instance (self-hosted or cloud)
- PostgreSQL knowledge helpful

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project
3. Save your project URL and API keys

### 1.2 Run Database Migrations
1. Go to SQL Editor in Supabase Dashboard
2. Copy entire contents of `/supabase/migrations/001_initial_schema.sql`
3. Run the SQL script
4. Verify tables are created in Table Editor

### 1.3 Configure Row Level Security (Optional)
```sql
-- Enable RLS for user-specific data
ALTER TABLE user_saved_properties ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their saved properties
CREATE POLICY "Users can view own saved properties" ON user_saved_properties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved properties" ON user_saved_properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved properties" ON user_saved_properties
  FOR DELETE USING (auth.uid() = user_id);
```

## Step 2: n8n Workflow Setup

### 2.1 Install n8n
```bash
# Using npm
npm install n8n -g

# Or using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2.2 Import Workflows
1. Open n8n at `http://localhost:5678`
2. Go to Workflows > Import
3. Import each workflow from `/n8n/workflows/`
4. Configure credentials:
   - Supabase credentials
   - Google Maps API
   - Email SMTP settings

### 2.3 Activate Webhooks
1. Open each workflow
2. Click on webhook node
3. Copy the webhook URL
4. Activate the workflow
5. Test with curl command

### 2.4 Configure Credentials
In n8n, add these credentials:
- **Supabase**: URL and service key
- **Google Maps**: API key for geocoding
- **SMTP**: For email notifications
- **HTTP Request**: For county websites

## Step 3: Frontend Setup

### 3.1 Environment Variables
Create `.env.local` file:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# n8n Webhooks
N8N_WEBHOOK_URL=http://localhost:5678/webhook
WEBHOOK_SECRET=your-webhook-secret

# Optional: External APIs
GOOGLE_MAPS_API_KEY=your-key
```

### 3.2 Install Dependencies
```bash
cd tax-deed-platform
npm install
```

### 3.3 Run Development Server
```bash
npm run dev
```

## Step 4: Connect Frontend to Backend

### 4.1 Update API Routes
Edit `/app/api/webhook/route.ts`:
```typescript
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
```

### 4.2 Update Supabase Client
Edit `/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 4.3 Test Connection
```bash
# Test property enrichment
curl -X POST http://localhost:3000/api/properties/enrich \
  -H "Content-Type: application/json" \
  -d '{"identifier":"enrichProperty","data":{"propertyId":"test"}}'
```

## Step 5: Data Population

### 5.1 Import Sample Data
Run in Supabase SQL Editor:
```sql
-- Insert sample properties
INSERT INTO properties (
  parcel_number, address, city, state, county_id,
  amount_due, minimum_bid, bedrooms, bathrooms, 
  living_area, lot_size, year_built, classification, score
) VALUES 
  ('25-45-001-000', '123 Main St', 'Miami', 'FL', 
   (SELECT id FROM counties WHERE name = 'Miami-Dade' LIMIT 1),
   5420, 5420, 3, 2, 1200, 7500, 1985, 'A', 85),
  ('25-45-002-000', '456 Oak Ave', 'Miami', 'FL',
   (SELECT id FROM counties WHERE name = 'Miami-Dade' LIMIT 1),
   3250, 3250, 2, 1, 950, 6000, 1978, 'B', 72);

-- Insert sample auctions
INSERT INTO auctions (
  county_id, auction_date, auction_time, auction_type,
  location, deposit_required, total_properties, status
) VALUES (
  (SELECT id FROM counties WHERE name = 'Miami-Dade' LIMIT 1),
  CURRENT_DATE + INTERVAL '15 days',
  '10:00:00',
  'Tax Deed',
  'Miami-Dade County Courthouse',
  5000,
  125,
  'upcoming'
);
```

### 5.2 Bulk Import Properties
1. Prepare CSV file with columns:
   - Parcel Number
   - Address
   - County
   - Amount Due
   - Bedrooms
   - Bathrooms
   - Square Feet
   - Year Built

2. Use the bulk import endpoint:
```bash
curl -X POST http://localhost:3000/api/bulk-import \
  -F "file=@properties.csv" \
  -F "county=Miami-Dade" \
  -F "state=FL"
```

## Step 6: Production Deployment

### 6.1 Deploy Frontend to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### 6.2 Deploy n8n
Options:
1. **n8n.cloud** (managed)
2. **Railway/Render** (one-click deploy)
3. **VPS with Docker**:
```bash
docker-compose up -d
```

### 6.3 Configure Production Webhooks
Update all webhook URLs to production n8n instance:
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

## Step 7: Monitoring & Maintenance

### 7.1 Set Up Monitoring
- **Supabase**: Enable observability in dashboard
- **n8n**: Use built-in execution logs
- **Frontend**: Vercel Analytics or similar

### 7.2 Database Maintenance
```sql
-- Create indexes for performance
CREATE INDEX idx_properties_updated ON properties(last_updated);
CREATE INDEX idx_auctions_upcoming ON auctions(auction_date) 
  WHERE status = 'upcoming';

-- Vacuum and analyze periodically
VACUUM ANALYZE properties;
```

### 7.3 Backup Strategy
```bash
# Backup Supabase database
pg_dump -h db.supabase.co -U postgres -d postgres > backup.sql

# Backup n8n workflows
n8n export:workflow --all --output=workflows-backup.json
```

## Troubleshooting

### Common Issues

1. **n8n webhook not receiving data**
   - Check workflow is active
   - Verify webhook URL is correct
   - Check n8n logs for errors

2. **Supabase connection errors**
   - Verify API keys are correct
   - Check RLS policies
   - Ensure tables exist

3. **Property enrichment fails**
   - Check external API keys
   - Verify n8n credentials
   - Check rate limits

### Debug Mode
Enable debug logging:
```typescript
// In API routes
console.log('Webhook request:', JSON.stringify(req.body, null, 2));
console.log('Webhook response:', JSON.stringify(response, null, 2));
```

### Testing Checklist
- [ ] Properties page loads
- [ ] Can enrich a property
- [ ] Can generate inspection report
- [ ] Financial calculator works
- [ ] Calendar shows auctions
- [ ] Property details page loads
- [ ] All navigation works
- [ ] Webhooks are responsive

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **n8n Docs**: https://docs.n8n.io
- **Next.js Docs**: https://nextjs.org/docs
- **Project Repository**: [Your GitHub Repo]

## Next Steps

1. **Add Authentication**: Implement Supabase Auth
2. **Add Payment Processing**: Stripe for premium features
3. **Add Email Notifications**: SendGrid/Resend for alerts
4. **Add Maps Integration**: Show properties on map
5. **Add Document Storage**: Store inspection reports
6. **Add Analytics**: Track user behavior
7. **Add API Rate Limiting**: Protect endpoints
8. **Add Caching**: Redis for performance

## License
[Your License]

## Contact
For questions or support: [Your Contact Info]