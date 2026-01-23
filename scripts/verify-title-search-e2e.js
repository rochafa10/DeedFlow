/**
 * Manual E2E Verification Script for Title Search Flow
 *
 * This script performs end-to-end verification of the title search implementation:
 * 1. POST /api/title-search - Trigger title search
 * 2. Verify Supabase title_searches table
 * 3. Verify Supabase liens table
 * 4. GET /api/title-search/[id] - Retrieve title data
 * 5. Verify TitleResearch component data structure
 * 6. Verify surviving liens identification
 * 7. Verify title risk score calculation
 *
 * Usage:
 *   node scripts/verify-title-search-e2e.js [propertyId]
 *
 * If no propertyId provided, will use first available property
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, title) {
  console.log('\n' + '='.repeat(80))
  log(`STEP ${step}: ${title}`, 'cyan')
  console.log('='.repeat(80))
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green')
}

function logError(message) {
  log(`✗ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue')
}

async function getTestProperty() {
  logInfo('Fetching test property from database...')

  try {
    // Try to get a property with some tax amount
    const response = await fetch(`${API_BASE_URL}/api/properties?limit=1`)

    if (!response.ok) {
      throw new Error(`Failed to fetch properties: ${response.status}`)
    }

    const data = await response.json()

    if (!data.properties || data.properties.length === 0) {
      throw new Error('No properties found in database')
    }

    const property = data.properties[0]
    logSuccess(`Found test property: ${property.id}`)
    logInfo(`  Address: ${property.property_address}, ${property.city}, ${property.state}`)
    logInfo(`  Parcel: ${property.parcel_id}`)
    logInfo(`  Market Value: $${property.market_value?.toLocaleString() || 'N/A'}`)

    return property.id
  } catch (error) {
    logError(`Failed to get test property: ${error.message}`)
    throw error
  }
}

async function step1_triggerTitleSearch(propertyId) {
  logStep(1, 'Trigger Title Search via POST /api/title-search')

  try {
    logInfo(`Sending POST request to /api/title-search...`)

    const response = await fetch(`${API_BASE_URL}/api/title-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyId: propertyId,
        force: true, // Force new search for testing
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API returned ${response.status}: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    logSuccess('Title search initiated successfully')
    logInfo(`Search ID: ${data.searchId}`)
    logInfo(`Total Liens: ${data.summary.totalLiens}`)
    logInfo(`Surviving Liens: ${data.summary.survivingLiens}`)
    logInfo(`Title Risk Score: ${data.summary.titleRiskScore.toFixed(2)}`)
    logInfo(`Recommendation: ${data.summary.recommendation.toUpperCase()}`)
    logInfo(`Title Quality: ${data.summary.titleQuality}`)

    // Verify response structure
    if (!data.success) {
      throw new Error('Response success is false')
    }

    if (!data.searchId) {
      throw new Error('No searchId in response')
    }

    if (!data.summary) {
      throw new Error('No summary in response')
    }

    logSuccess('Response structure validated')

    return data
  } catch (error) {
    logError(`Step 1 failed: ${error.message}`)
    throw error
  }
}

async function step2_verifyTitleSearchesTable(propertyId) {
  logStep(2, 'Verify data written to Supabase title_searches table')

  try {
    logInfo('Checking title_searches table via Supabase...')

    // We'll verify this through the GET endpoint since we don't have direct DB access in this script
    const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch title search: ${response.status}`)
    }

    const data = await response.json()

    if (!data.data || !data.data.titleSearch) {
      throw new Error('No title search data found in database')
    }

    const titleSearch = data.data.titleSearch

    // Verify required fields
    const requiredFields = [
      'id',
      'propertyId',
      'status',
      'searchDate',
      'titleQuality',
      'marketabilityScore',
      'risk',
    ]

    for (const field of requiredFields) {
      if (!(field in titleSearch)) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    logSuccess('title_searches record created successfully')
    logInfo(`  ID: ${titleSearch.id}`)
    logInfo(`  Status: ${titleSearch.status}`)
    logInfo(`  Title Quality: ${titleSearch.titleQuality}`)
    logInfo(`  Marketability Score: ${titleSearch.marketabilityScore.toFixed(2)}`)
    logInfo(`  Risk Score: ${titleSearch.risk.score.toFixed(2)}`)
    logInfo(`  Recommendation: ${titleSearch.risk.recommendation}`)

    // Verify numeric ranges
    if (titleSearch.marketabilityScore < 0 || titleSearch.marketabilityScore > 1) {
      throw new Error(`Invalid marketability score: ${titleSearch.marketabilityScore}`)
    }

    if (titleSearch.risk.score < 0 || titleSearch.risk.score > 1) {
      throw new Error(`Invalid risk score: ${titleSearch.risk.score}`)
    }

    logSuccess('All numeric fields within valid ranges')

    return titleSearch
  } catch (error) {
    logError(`Step 2 failed: ${error.message}`)
    throw error
  }
}

async function step3_verifyLiensTable(propertyId) {
  logStep(3, 'Verify liens written to liens table')

  try {
    logInfo('Checking liens table via API...')

    const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch title search: ${response.status}`)
    }

    const data = await response.json()

    if (!data.data || !data.data.liens) {
      throw new Error('No liens data in response')
    }

    const liens = data.data.liens

    logSuccess(`Found ${liens.length} lien records`)

    if (liens.length > 0) {
      // Verify first lien structure
      const firstLien = liens[0]

      const requiredFields = [
        'id',
        'type',
        'holder',
        'amount',
        'recordedDate',
        'status',
        'survivesTaxSale',
      ]

      for (const field of requiredFields) {
        if (!(field in firstLien)) {
          throw new Error(`Lien missing required field: ${field}`)
        }
      }

      logSuccess('Lien records have proper structure')

      // Display lien details
      liens.forEach((lien, index) => {
        const surviveFlag = lien.survivesTaxSale ? '🔴 SURVIVES' : '✓ Wiped Out'
        logInfo(`  ${index + 1}. ${lien.type} - $${lien.amount.toLocaleString()} - ${surviveFlag}`)
        logInfo(`     Holder: ${lien.holder}`)
        logInfo(`     Status: ${lien.status}`)
        if (lien.survivesTaxSale && lien.survivabilityBasis) {
          logWarning(`     Basis: ${lien.survivabilityBasis}`)
        }
      })

      // Count surviving liens
      const survivingLiens = liens.filter(l => l.survivesTaxSale)
      logInfo(`\nSurviving Liens: ${survivingLiens.length} of ${liens.length}`)

      if (survivingLiens.length > 0) {
        const survivingTotal = survivingLiens.reduce((sum, l) => sum + l.amount, 0)
        logWarning(`Total Surviving Liens Amount: $${survivingTotal.toLocaleString()}`)
      }
    } else {
      logWarning('No liens found for this property')
    }

    return liens
  } catch (error) {
    logError(`Step 3 failed: ${error.message}`)
    throw error
  }
}

async function step4_getTitleSearchData(propertyId) {
  logStep(4, 'Verify title data appears in GET /api/title-search/[id]')

  try {
    logInfo(`Sending GET request to /api/title-search/${propertyId}...`)

    const response = await fetch(`${API_BASE_URL}/api/title-search/${propertyId}`)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()

    logSuccess('Title search data retrieved successfully')

    // Verify top-level structure
    const requiredSections = ['titleSearch', 'liens', 'deedChain', 'titleIssues', 'summary']

    for (const section of requiredSections) {
      if (!(section in data.data)) {
        throw new Error(`Missing section: ${section}`)
      }
    }

    logSuccess('All required data sections present')

    // Display summary
    const summary = data.data.summary
    logInfo('\nSummary:')
    logInfo(`  Search Completed: ${summary.searchCompleted ? 'Yes' : 'No'}`)
    logInfo(`  Search Date: ${summary.searchDate}`)
    logInfo(`  Total Liens: ${summary.totalLiens}`)
    logInfo(`  Surviving Liens: ${summary.survivingLiens}`)
    logInfo(`  Wipeable Liens: ${summary.wipeableLiens}`)
    logInfo(`  Surviving Liens Total: $${summary.survivingLiensTotal?.toLocaleString() || 0}`)
    logInfo(`  Risk Score: ${summary.riskScore.toFixed(2)}`)
    logInfo(`  Recommendation: ${summary.recommendation.toUpperCase()}`)

    return data.data
  } catch (error) {
    logError(`Step 4 failed: ${error.message}`)
    throw error
  }
}

async function step5_verifyComponentDataStructure(titleData) {
  logStep(5, 'Verify TitleResearch component displays data correctly')

  try {
    logInfo('Validating data structure for TitleResearch component...')

    // Verify TitleResearchProps structure
    if (!titleData.summary) {
      throw new Error('Missing summary (required for TitleResearch)')
    }

    if (!titleData.liens) {
      throw new Error('Missing liens array (required for TitleResearch)')
    }

    logSuccess('Basic component prop structure validated')

    // Verify summary matches TitleResearchSummary interface
    const summaryFields = [
      'searchCompleted',
      'searchDate',
      'totalLiens',
      'survivingLiens',
      'wipeableLiens',
      'riskScore',
      'recommendation',
    ]

    for (const field of summaryFields) {
      if (!(field in titleData.summary)) {
        throw new Error(`Summary missing field: ${field}`)
      }
    }

    logSuccess('TitleResearchSummary interface validated')

    // Verify lien records match LienRecord interface
    if (titleData.liens.length > 0) {
      const lienFields = ['id', 'type', 'holder', 'amount', 'status', 'survivesTaxSale']

      for (const field of lienFields) {
        if (!(field in titleData.liens[0])) {
          throw new Error(`Lien record missing field: ${field}`)
        }
      }

      logSuccess('LienRecord interface validated')
    }

    logSuccess('All component data structures match expected interfaces')

    return true
  } catch (error) {
    logError(`Step 5 failed: ${error.message}`)
    throw error
  }
}

async function step6_verifySurvivingLiensHighlighted(titleData) {
  logStep(6, 'Verify surviving liens are flagged correctly')

  try {
    logInfo('Checking surviving lien flags...')

    const liens = titleData.liens
    const summary = titleData.summary

    const survivingLiens = liens.filter(l => l.survivesTaxSale === true)

    logInfo(`Found ${survivingLiens.length} surviving liens`)

    // Verify summary matches actual count
    if (summary.survivingLiens !== survivingLiens.length) {
      throw new Error(
        `Summary count (${summary.survivingLiens}) doesn't match actual (${survivingLiens.length})`
      )
    }

    logSuccess('Summary surviving lien count matches actual liens')

    if (survivingLiens.length > 0) {
      logWarning('\n🔴 SURVIVING LIENS (Would NOT be wiped out by tax sale):')

      survivingLiens.forEach((lien, index) => {
        logWarning(`  ${index + 1}. ${lien.type}`)
        logWarning(`     Amount: $${lien.amount.toLocaleString()}`)
        logWarning(`     Holder: ${lien.holder}`)
        if (lien.survivabilityBasis) {
          logWarning(`     Reason: ${lien.survivabilityBasis}`)
        }
      })

      // Verify hasSurvivingLiens flag
      if (!summary.hasSurvivingLiens) {
        throw new Error('hasSurvivingLiens should be true but is false')
      }

      logSuccess('All surviving liens properly flagged with survivesTaxSale: true')
    } else {
      logSuccess('No surviving liens - property is clean! ✓')

      if (summary.hasSurvivingLiens) {
        throw new Error('hasSurvivingLiens should be false but is true')
      }
    }

    return survivingLiens
  } catch (error) {
    logError(`Step 6 failed: ${error.message}`)
    throw error
  }
}

async function step7_verifyTitleRiskScoreCalculation(titleData) {
  logStep(7, 'Verify title risk score is calculated correctly')

  try {
    logInfo('Validating title risk score calculation...')

    const summary = titleData.summary
    const riskScore = summary.riskScore
    const recommendation = summary.recommendation

    // Verify risk score is in valid range
    if (riskScore < 0 || riskScore > 1) {
      throw new Error(`Risk score ${riskScore} is outside valid range [0, 1]`)
    }

    logSuccess(`Risk score ${riskScore.toFixed(2)} is within valid range`)

    // Verify recommendation aligns with risk score
    const expectedRecommendation =
      riskScore >= 0.70 ? 'approve' : riskScore >= 0.40 ? 'caution' : 'reject'

    if (recommendation !== expectedRecommendation) {
      throw new Error(
        `Recommendation "${recommendation}" doesn't match score ${riskScore.toFixed(2)} (expected "${expectedRecommendation}")`
      )
    }

    logSuccess(`Recommendation "${recommendation}" correctly aligns with risk score`)

    // Check surviving liens penalty
    if (summary.survivingLiens > 0) {
      logInfo('Surviving liens present - verifying penalty applied...')

      // With surviving liens, score should be penalized
      if (riskScore === 1.0) {
        logWarning('Risk score is perfect despite surviving liens (unusual)')
      } else {
        logSuccess('Risk score penalized for surviving liens')
      }

      // Display risk breakdown
      logInfo('\nRisk Assessment:')
      logInfo(`  Risk Score: ${riskScore.toFixed(2)} / 1.00`)
      logInfo(`  Risk Level: ${recommendation.toUpperCase()}`)
      logInfo(`  Surviving Liens: ${summary.survivingLiens} ($${summary.survivingLiensTotal?.toLocaleString() || 0})`)
      logInfo(`  Wipeable Liens: ${summary.wipeableLiens}`)

      // Check for auto-fail condition (>30% surviving liens)
      const titleSearch = titleData.titleSearch
      const propertyValue = titleSearch.property?.market_value || 100000
      const survivingPercentage = (summary.survivingLiensTotal || 0) / propertyValue

      if (survivingPercentage > 0.30) {
        logWarning(
          `⚠ Surviving liens exceed 30% of property value (${(survivingPercentage * 100).toFixed(1)}%)`
        )

        if (riskScore !== 0) {
          logWarning('  Expected auto-fail (score = 0) but got different score')
        } else {
          logSuccess('  Auto-fail correctly applied (score = 0)')
        }
      }
    } else {
      logSuccess('No surviving liens - risk calculation straightforward')
    }

    // Final assessment
    logInfo('\n' + '─'.repeat(80))
    log('FINAL TITLE ASSESSMENT:', 'cyan')

    if (recommendation === 'approve') {
      logSuccess(`✓ APPROVED - Low risk title (score: ${riskScore.toFixed(2)})`)
    } else if (recommendation === 'caution') {
      logWarning(`⚠ CAUTION - Medium risk title (score: ${riskScore.toFixed(2)})`)
    } else {
      logError(`✗ REJECT - High risk title (score: ${riskScore.toFixed(2)})`)
    }

    logInfo('─'.repeat(80))

    return true
  } catch (error) {
    logError(`Step 7 failed: ${error.message}`)
    throw error
  }
}

async function main() {
  console.clear()
  log('\n' + '='.repeat(80), 'cyan')
  log('END-TO-END TITLE SEARCH FLOW VERIFICATION', 'cyan')
  log('='.repeat(80) + '\n', 'cyan')

  logInfo(`API Base URL: ${API_BASE_URL}`)

  try {
    // Get property ID from command line or fetch one
    let propertyId = process.argv[2]

    if (!propertyId) {
      logWarning('No propertyId provided, fetching test property...')
      propertyId = await getTestProperty()
    } else {
      logInfo(`Using provided propertyId: ${propertyId}`)
    }

    // Run all verification steps
    const searchResult = await step1_triggerTitleSearch(propertyId)
    const titleSearch = await step2_verifyTitleSearchesTable(propertyId)
    const liens = await step3_verifyLiensTable(propertyId)
    const titleData = await step4_getTitleSearchData(propertyId)
    await step5_verifyComponentDataStructure(titleData)
    const survivingLiens = await step6_verifySurvivingLiensHighlighted(titleData)
    await step7_verifyTitleRiskScoreCalculation(titleData)

    // Final summary
    console.log('\n' + '='.repeat(80))
    log('✓ ALL VERIFICATION STEPS PASSED', 'green')
    console.log('='.repeat(80))

    logSuccess('\nTitle Search E2E Flow is working correctly!')
    logInfo('\nNext steps:')
    logInfo('  1. Deploy schema to Supabase: Execute sql/title-search-schema.sql')
    logInfo('  2. Start dev server: cd TaxDeedFlow && npm run dev')
    logInfo(`  3. View in browser: http://localhost:3000/report/${propertyId}`)
    logInfo('  4. Verify TitleResearch section renders with data')
    logInfo('  5. Verify surviving liens are highlighted in red')

    process.exit(0)
  } catch (error) {
    console.log('\n' + '='.repeat(80))
    logError('✗ VERIFICATION FAILED')
    console.log('='.repeat(80))
    logError(`\nError: ${error.message}`)

    if (error.stack) {
      console.log('\nStack trace:')
      console.log(error.stack)
    }

    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { main }
