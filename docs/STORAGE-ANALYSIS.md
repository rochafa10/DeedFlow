# Storage Analysis - Screenshot Storage

## Current Storage Architecture

### ✅ Screenshots are NOT stored on DigitalOcean VPS

**Screenshots are uploaded directly to Supabase Storage**, not saved to the VPS disk. Here's how it works:

1. **Playwright Script** (`regrid-screenshot-v15.js`) runs in the `pwrunner` container
2. **Screenshot captured** in memory as base64
3. **n8n workflow** converts base64 to binary
4. **Uploaded directly to Supabase Storage** via HTTP POST
5. **URL stored in database** (`regrid_data.screenshot_url`)

### Storage Flow

```
Playwright Script (VPS)
  ↓ (base64 in memory)
n8n Workflow
  ↓ (convert to binary)
Supabase Storage API
  ↓ (HTTP POST)
Supabase Storage Bucket: "screenshots"
  ↓ (public URL)
Database: regrid_data.screenshot_url
```

## DigitalOcean VPS Disk Usage

**Current Status:**
- **Total Disk**: 77GB
- **Used**: 46GB (60%)
- **Available**: 31GB (40%)

**What's using space:**
- Docker images and containers (~20-30GB typical)
- System files and logs
- n8n workflows and data
- **NOT screenshot files** (they go to Supabase)

## Supabase Storage

Screenshots are stored in Supabase Storage bucket: `screenshots`

**Storage Path Format:**
```
screenshots/{parcel_id_sanitized}.png
```

**Example:**
```
screenshots/01_05_16___094_00_000.png
```

## Storage Capacity Planning

### Supabase Storage Limits

**Free Tier:**
- 1GB storage
- 2GB bandwidth/month

**Pro Tier ($25/month):**
- 100GB storage
- 200GB bandwidth/month

### Screenshot Size Estimates

**Before Optimization:**
- PNG format: ~9.6MB per screenshot
- 100 screenshots = ~960MB
- 1,000 screenshots = ~9.6GB

**After Optimization (Current):**
- JPEG quality 75: ~300KB per screenshot
- 100 screenshots = ~30MB
- 1,000 screenshots = ~300MB
- 10,000 screenshots = ~3GB
- 100,000 screenshots = ~30GB

### Projected Usage

If you scrape **10,000 properties**:
- **Storage needed**: ~3GB (with optimized JPEG)
- **Free tier**: ❌ Not enough (1GB limit)
- **Pro tier**: ✅ Plenty of space (100GB available)

If you scrape **100,000 properties**:
- **Storage needed**: ~30GB
- **Pro tier**: ✅ Still within limits (100GB)

## Recommendations

### 1. Monitor Supabase Storage Usage

Check your Supabase dashboard regularly:
- Go to: https://supabase.com/dashboard/project/oiiwlzobizftprqspbzt/storage/buckets
- Monitor the `screenshots` bucket size

### 2. Set Up Storage Alerts

Create a monitoring query:
```sql
-- Check storage usage (approximate)
SELECT 
  COUNT(*) as total_screenshots,
  COUNT(*) * 300000 as estimated_bytes, -- 300KB per screenshot
  ROUND(COUNT(*) * 300000 / 1024.0 / 1024.0, 2) as estimated_mb,
  ROUND(COUNT(*) * 300000 / 1024.0 / 1024.0 / 1024.0, 2) as estimated_gb
FROM regrid_data
WHERE screenshot_url IS NOT NULL;
```

### 3. Implement Cleanup Strategy (if needed)

If you need to free up space:

**Option A: Delete old screenshots**
```sql
-- Find properties without screenshots that are older than X days
SELECT property_id, parcel_id, scraped_at
FROM regrid_data
WHERE screenshot_url IS NULL
  AND scraped_at < NOW() - INTERVAL '90 days';
```

**Option B: Compress older screenshots**
- Re-upload with lower quality (quality: 50 instead of 75)
- Saves ~50% more space

**Option C: Archive to cheaper storage**
- Move screenshots older than 1 year to DigitalOcean Spaces or AWS S3
- Keep only recent screenshots in Supabase

### 4. Upgrade Plan When Needed

**When to upgrade:**
- Free tier: When you hit ~3,000 screenshots (~900MB)
- Pro tier: When you hit ~300,000 screenshots (~90GB)

**Cost:**
- Pro tier: $25/month for 100GB
- Team tier: $599/month for 500GB (if you need more)

## Current Status

✅ **No immediate concerns:**
- Screenshots are NOT filling up your VPS disk
- They're stored in Supabase Storage (cloud)
- With optimized JPEG format, you can store ~300,000 screenshots in Pro tier
- VPS disk at 60% is normal (Docker, system files)

## Action Items

1. ✅ **Already optimized**: Screenshots are now JPEG quality 75 (~300KB)
2. ⚠️ **Monitor**: Check Supabase storage usage monthly
3. 📊 **Track**: Use the SQL query above to estimate storage needs
4. 🔄 **Plan**: Upgrade to Pro tier when you approach 1GB usage
