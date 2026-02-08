const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://oiiwlzobizftprqspbzt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA0NzgzNSwiZXhwIjoyMDcwNjIzODM1fQ.zpH8VqfW5FC9swJhokpOpc5qw44EnW7m04NNKG9QXU4'
);

(async () => {
  // Get all validation records
  const { data: stats, error: statsError } = await supabase
    .from('property_visual_validation')
    .select('validation_status, confidence_score, ai_tokens_used');

  if (statsError) {
    console.log('Error:', statsError);
    return;
  }

  // Calculate aggregates
  const summary = stats.reduce((acc, row) => {
    const status = row.validation_status || 'UNKNOWN';
    if (!acc[status]) {
      acc[status] = { count: 0, totalConfidence: 0, totalTokens: 0 };
    }
    acc[status].count++;
    acc[status].totalConfidence += row.confidence_score || 0;
    acc[status].totalTokens += row.ai_tokens_used || 0;
    return acc;
  }, {});

  console.log('\nVisual Validation Database Summary:');
  console.log('====================================');
  Object.entries(summary).forEach(([status, data]) => {
    const avgConfidence = (data.totalConfidence / data.count).toFixed(1);
    console.log(`${status}: ${data.count} properties | Avg Confidence: ${avgConfidence}% | Total Tokens: ${data.totalTokens}`);
  });

  const total = stats.length;
  const totalTokens = Object.values(summary).reduce((sum, s) => sum + s.totalTokens, 0);
  console.log('====================================');
  console.log(`TOTAL: ${total} properties validated | Total Tokens Used: ${totalTokens}`);
})();
