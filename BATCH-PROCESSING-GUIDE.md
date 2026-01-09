# Batch Processing Guide

## Why Batch Processing?

Your **Max $200 plan** has context limits. Processing thousands of properties in one session will:
- Hit context limits (session ends unexpectedly)
- Waste tokens re-reading the same context
- Risk losing progress if session crashes

**Solution**: Process in batches, save progress to database, resume across sessions.

---

## Universal Batch Commands

### Start Any Batch Job
```
"Start [job_type] for [County] in batches of [size]"

Examples:
"Start Regrid scraping for Blair County in batches of 50"
"Start visual validation for all counties in batches of 100"
"Start title research for Somerset County in batches of 20"
```

### Resume Any Job
```
"Resume batch job"
"Continue from where we left off"
"Resume [job_type] job"
```

### Check Status
```
"Show batch job status"
"How much work is pending?"
"Show active batch jobs"
```

### Pause Job
```
"Pause batch job"
"Stop for now, we'll continue later"
```

---

## Recommended Batch Sizes (Max $200 Plan)

| Job Type | Batch Size | Per Session | Reason |
|----------|------------|-------------|--------|
| **regrid_scraping** | 50 | ~150 | Web scraping is slow |
| **visual_validation** | 100 | ~300 | Fast database checks |
| **property_condition** | 25 | ~75 | Web research per property |
| **environmental_research** | 25 | ~75 | Multiple API calls |
| **title_research** | 20 | ~60 | Complex multi-source |
| **bid_strategy** | 50 | ~150 | Calculations are fast |
| **pdf_parsing** | 5 | ~15 | Memory intensive |
| **county_research** | 10 | ~30 | Deep research each |

---

## Batch Job Types

### 1. regrid_scraping
Scrapes Regrid.com for property data and screenshots.
```sql
SELECT create_batch_job('regrid_scraping', county_id, 50);
```

### 2. visual_validation
Analyzes images to filter non-investable properties.
```sql
SELECT create_batch_job('visual_validation', county_id, 100);
```

### 3. property_condition (Agent 6)
Assesses property condition remotely.
```sql
SELECT create_batch_job('property_condition', county_id, 25);
```

### 4. environmental_research (Agent 7)
Checks environmental risks.
```sql
SELECT create_batch_job('environmental_research', county_id, 25);
```

### 5. title_research (Agent 5)
Researches liens and title issues.
```sql
SELECT create_batch_job('title_research', county_id, 20);
```

### 6. bid_strategy (Agent 9)
Calculates maximum bid amounts.
```sql
SELECT create_batch_job('bid_strategy', county_id, 50);
```

### 7. pdf_parsing
Extracts properties from PDF documents.
```sql
SELECT create_batch_job('pdf_parsing', county_id, 5);
```

### 8. county_research
Researches county auction information.
```sql
SELECT create_batch_job('county_research', NULL, 10);
```

---

## SQL Commands

### Check Pending Work
```sql
SELECT * FROM get_pending_work_summary();
```
Returns:
| job_type | pending | batch_size | batches | sessions |
|----------|---------|------------|---------|----------|
| regrid_scraping | 7,358 | 50 | 148 | 49 |
| visual_validation | 17 | 100 | 1 | 1 |

### Create Batch Job
```sql
-- For specific county
SELECT create_batch_job(
  'regrid_scraping',
  (SELECT id FROM counties WHERE county_name = 'Blair'),
  50
);

-- For all counties
SELECT create_batch_job('regrid_scraping', NULL, 50);
```

### Get Next Batch
```sql
SELECT * FROM get_next_batch('job-uuid-here');
```

### Update Progress
```sql
SELECT update_batch_progress(
  'job-uuid',
  'last-item-uuid',
  1,  -- items processed
  0,  -- items failed
  NULL  -- error message
);
```

### Pause/Resume
```sql
SELECT pause_batch_job('job-uuid');
SELECT resume_batch_job('job-uuid');
```

### Check Job Status
```sql
SELECT * FROM get_batch_status('job-uuid');
SELECT * FROM vw_active_batch_jobs;
```

### Complete Job
```sql
SELECT complete_batch_job('job-uuid');
```

---

## Session Workflow

### Session Start
```
1. "Show pending work" or "Run data audit"
2. Pick a job type to work on
3. "Start [job_type] in batches of [size]"
   OR "Resume batch job"
4. Process 2-4 batches
5. "Pause batch job" before context fills up
6. End session
```

### Example Session
```
User: "What work is pending?"

Claude: Shows pending work summary:
- regrid_scraping: 7,358 pending (~49 sessions)
- visual_validation: 17 pending (~1 session)

User: "Start Regrid scraping for Blair County in batches of 50"

Claude:
- Creates batch job
- Processes batch 1 (50 properties)
- Processes batch 2 (50 properties)
- Processes batch 3 (50 properties)

User: "Pause batch job"

Claude:
- Saves progress to database
- Reports: "Paused at 150/235 properties (64%)"
- "Resume with: 'Resume batch job'"
```

### Next Session
```
User: "Resume batch job"

Claude:
- Finds paused job
- Resumes from property 151
- Processes remaining 85 properties
- Completes job
```

---

## Multi-County Strategy

### Option A: One County at a Time
```
Session 1-2: Complete Blair County (252 properties)
Session 3-5: Complete Clearfield County (231 properties)
Session 6-10: Work on Westmoreland County (172 properties)
...
```

### Option B: Round-Robin
```
Session 1: 50 properties each from Blair, Clearfield, Westmoreland
Session 2: Next 50 from each county
...
```

### Option C: Priority-Based
```
Focus on counties with upcoming auctions first:
1. Check upcoming_sales for nearest dates
2. Prioritize those counties
3. Process in order of auction date
```

---

## Error Handling

### If Session Crashes
Progress is saved in `batch_jobs` table. Just resume:
```
"Resume batch job"
```

### If Property Fails
Error is logged, batch continues:
```sql
SELECT update_batch_progress(
  'job-uuid',
  'property-uuid',
  0,  -- 0 processed
  1,  -- 1 failed
  'Error: Property not found in Regrid'
);
```

### If Too Many Failures
Job automatically pauses at 10+ consecutive failures.
Review errors and fix before resuming.

---

## Monitoring

### During Session
```
"Show batch job status"
```

### Between Sessions
```sql
-- View all active jobs
SELECT * FROM vw_active_batch_jobs;

-- View completed jobs
SELECT * FROM vw_completed_batch_jobs;

-- Check specific job
SELECT * FROM get_batch_status('job-uuid');
```

---

## Best Practices

### DO:
- Start session with "Show pending work"
- Use recommended batch sizes
- Pause before context gets full
- Resume jobs across sessions
- Track progress regularly

### DON'T:
- Process all properties in one session
- Use batch size > 100
- Ignore pause warnings
- Start new jobs without finishing old ones
- Forget to check for active jobs

---

## Quick Reference

| Action | Command |
|--------|---------|
| Check pending work | `SELECT * FROM get_pending_work_summary();` |
| Start job | `SELECT create_batch_job('type', county_id, size);` |
| Get next batch | `SELECT * FROM get_next_batch('job-uuid');` |
| Update progress | `SELECT update_batch_progress(...);` |
| Pause job | `SELECT pause_batch_job('job-uuid');` |
| Resume job | `SELECT resume_batch_job('job-uuid');` |
| Check status | `SELECT * FROM get_batch_status('job-uuid');` |
| View active jobs | `SELECT * FROM vw_active_batch_jobs;` |

---

## Your Current Work Queue

Run this at the start of each session:
```sql
SELECT * FROM get_pending_work_summary();
```

This shows exactly what needs to be done and how many sessions it will take.
