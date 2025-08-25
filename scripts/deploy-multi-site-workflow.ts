#!/usr/bin/env tsx
/**
 * Multi-Site Tax Deed Scraper with Python Integration
 * Supports multiple counties and configurable sites
 */

import { n8nMCP, Workflow } from '../lib/n8n-mcp-client';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// MULTI-SITE WORKFLOW with Python Integration
const MULTI_SITE_WORKFLOW: Workflow = {
  name: 'Multi-Site Tax Deed Scraper with Python',
  nodes: [
    {
      id: 'trigger',
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [250, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: 'hours',
              hoursInterval: 3
            }
          ]
        }
      }
    },
    {
      id: 'site-config',
      name: 'Load Site Configurations',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        operation: 'select',
        tableId: 'scraping_sites',
        filterType: 'manual',
        conditions: {
          conditions: [
            {
              keyName: 'active',
              condition: 'equal',
              keyValue: true
            }
          ]
        },
        additionalOptions: {
          orderBy: [
            {
              keyName: 'priority',
              order: 'ASC'
            }
          ]
        }
      }
    },
    {
      id: 'split-sites',
      name: 'Process Each Site',
      type: 'n8n-nodes-base.splitInBatches',
      typeVersion: 3,
      position: [650, 300],
      parameters: {
        batchSize: 1,
        options: {}
      }
    },
    {
      id: 'python-scraper',
      name: 'Python Site Scraper',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [850, 300],
      parameters: {
        mode: 'runOnceForEachItem',
        language: 'python',
        pythonCode: `
import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime, timedelta
from urllib.parse import urljoin, urlparse
import time
import hashlib
import logging

# Get site configuration
site_config = items[0]['json']
site_name = site_config.get('name', 'Unknown')
site_url = site_config.get('url', '')
county = site_config.get('county', 'Unknown')
scraper_type = site_config.get('scraper_type', 'generic')
selectors = site_config.get('selectors', {})

print(f"Processing site: {site_name} ({county})")

def scrape_miami_dade(url, selectors):
    \"\"\"Miami-Dade specific scraper\"\"\"
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        auctions = []
        
        # Look for auction calendar/table
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows[1:]:  # Skip header
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    case_match = re.search(r'\\d{4}-\\d+', str(cells[0]))
                    if case_match:
                        auction = {
                            'case_number': case_match.group(),
                            'sale_date': cells[1].get_text(strip=True) if len(cells) > 1 else '',
                            'property_address': cells[2].get_text(strip=True) if len(cells) > 2 else '',
                            'assessed_value': extract_currency(cells[3].get_text() if len(cells) > 3 else ''),
                            'minimum_bid': extract_currency(cells[4].get_text() if len(cells) > 4 else ''),
                        }
                        auctions.append(auction)
        
        # Alternative: Look for div-based calendar
        calendar_divs = soup.find_all('div', class_=re.compile(r'calendar|auction|sale|foreclosure'))
        for div in calendar_divs:
            text = div.get_text()
            case_matches = re.findall(r'\\d{4}-\\d+', text)
            for case in case_matches:
                auctions.append({
                    'case_number': case,
                    'extraction_method': 'div_parser',
                    'raw_text': text[:200]
                })
        
        return auctions
        
    except Exception as e:
        print(f"Error scraping Miami-Dade: {e}")
        return []

def scrape_generic(url, selectors):
    \"\"\"Generic scraper using CSS selectors\"\"\"
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        auctions = []
        
        # Use configured selectors
        auction_selector = selectors.get('auction_container', '.auction, .sale, .foreclosure')
        case_selector = selectors.get('case_number', '[class*="case"], [id*="case"]')
        date_selector = selectors.get('sale_date', '[class*="date"], [id*="date"]')
        address_selector = selectors.get('address', '[class*="address"], [id*="property"]')
        
        # Find auction containers
        auction_elements = soup.select(auction_selector)
        for element in auction_elements:
            auction = {}
            
            # Extract case number
            case_elem = element.select_one(case_selector)
            if case_elem:
                case_text = case_elem.get_text(strip=True)
                case_match = re.search(r'\\d{4}-\\d+', case_text)
                if case_match:
                    auction['case_number'] = case_match.group()
            
            # Extract date
            date_elem = element.select_one(date_selector)
            if date_elem:
                auction['sale_date'] = date_elem.get_text(strip=True)
            
            # Extract address
            addr_elem = element.select_one(address_selector)
            if addr_elem:
                auction['property_address'] = addr_elem.get_text(strip=True)
            
            if auction.get('case_number'):
                auctions.append(auction)
        
        # Fallback: table-based extraction
        if not auctions:
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows[1:]:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        case_match = re.search(r'\\d{4}-\\d+', str(cells[0]))
                        if case_match:
                            auctions.append({
                                'case_number': case_match.group(),
                                'sale_date': cells[1].get_text(strip=True) if len(cells) > 1 else '',
                                'property_address': cells[2].get_text(strip=True) if len(cells) > 2 else ''
                            })
        
        return auctions
        
    except Exception as e:
        print(f"Error in generic scraper: {e}")
        return []

def extract_currency(text):
    \"\"\"Extract currency amount from text\"\"\"
    if not text:
        return 0
    match = re.search(r'\\$?([\\d,]+(?:\\.\\d{2})?)', str(text))
    if match:
        return float(match.group(1).replace(',', ''))
    return 0

def generate_auction_id(case_number, county):
    \"\"\"Generate deterministic ID for auction\"\"\"
    id_string = f"{county}-{case_number}"
    return hashlib.md5(id_string.encode()).hexdigest()[:12]

# Main scraping logic
raw_auctions = []

if scraper_type == 'miami_dade':
    raw_auctions = scrape_miami_dade(site_url, selectors)
elif scraper_type == 'generic':
    raw_auctions = scrape_generic(site_url, selectors)
else:
    # Default to generic
    raw_auctions = scrape_generic(site_url, selectors)

# Process and standardize auctions
processed_auctions = []
for auction in raw_auctions:
    if auction.get('case_number'):
        processed_auction = {
            'id': generate_auction_id(auction['case_number'], county),
            'case_number': auction['case_number'],
            'sale_date': auction.get('sale_date', ''),
            'property_address': auction.get('property_address', ''),
            'assessed_value': auction.get('assessed_value', 0),
            'minimum_bid': auction.get('minimum_bid', 0),
            'county': county,
            'site_name': site_name,
            'site_url': site_url,
            'confidence_score': 0.85,
            'extraction_method': f'python_{scraper_type}',
            'raw_data': json.dumps(auction),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        processed_auctions.append(processed_auction)

print(f"Extracted {len(processed_auctions)} auctions from {site_name}")

# Return results with metadata
return [{
    'site_info': {
        'name': site_name,
        'county': county,
        'url': site_url,
        'scraper_type': scraper_type
    },
    'auctions': processed_auctions,
    'extraction_stats': {
        'total_found': len(processed_auctions),
        'extraction_time': datetime.now().isoformat(),
        'success': len(processed_auctions) > 0
    }
}]
`
      }
    },
    {
      id: 'ai-enhancer',
      name: 'AI Data Enhancement',
      type: '@n8n/n8n-nodes-langchain.openAi',
      typeVersion: 1.5,
      position: [1050, 300],
      parameters: {
        resource: 'chat',
        model: {
          value: 'gpt-4-turbo-preview'
        },
        messages: {
          values: [
            {
              role: 'system',
              content: `You are a tax deed auction data enhancer. Review the extracted auction data and:
1. Standardize sale dates to YYYY-MM-DD format
2. Clean and standardize property addresses
3. Extract additional details from raw_data if available
4. Validate case numbers format
5. Return enhanced JSON with same structure but improved data quality`
            },
            {
              role: 'user',
              content: 'Enhance this auction data: {{JSON.stringify($json.auctions)}}'
            }
          ]
        },
        options: {
          temperature: 0.1,
          maxTokens: 4000
        }
      }
    },
    {
      id: 'merge-results',
      name: 'Merge Site Results',
      type: 'n8n-nodes-base.merge',
      typeVersion: 2.1,
      position: [1250, 300],
      parameters: {
        mode: 'append',
        options: {}
      }
    },
    {
      id: 'save-auctions',
      name: 'Save Auctions',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [1450, 300],
      parameters: {
        operation: 'upsert',
        tableId: 'auctions',
        upsertColumn: 'id',
        dataToSend: 'autoMapInputData'
      }
    },
    {
      id: 'update-stats',
      name: 'Update Site Stats',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [1450, 450],
      parameters: {
        operation: 'upsert',
        tableId: 'site_extraction_stats',
        upsertColumn: 'site_name',
        dataToSend: 'defineBelow',
        fieldsToSend: {
          values: [
            {
              fieldName: 'site_name',
              fieldValue: '={{$json.site_info.name}}'
            },
            {
              fieldName: 'county',
              fieldValue: '={{$json.site_info.county}}'
            },
            {
              fieldName: 'last_scraped',
              fieldValue: '={{new Date().toISOString()}}'
            },
            {
              fieldName: 'auctions_found',
              fieldValue: '={{$json.extraction_stats.total_found}}'
            },
            {
              fieldName: 'success',
              fieldValue: '={{$json.extraction_stats.success}}'
            },
            {
              fieldName: 'scraper_type',
              fieldValue: '={{$json.site_info.scraper_type}}'
            }
          ]
        }
      }
    }
  ],
  connections: {
    'Schedule Trigger': {
      main: [
        [
          {
            node: 'Load Site Configurations',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Load Site Configurations': {
      main: [
        [
          {
            node: 'Process Each Site',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Process Each Site': {
      main: [
        [
          {
            node: 'Python Site Scraper',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Python Site Scraper': {
      main: [
        [
          {
            node: 'AI Data Enhancement',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'AI Data Enhancement': {
      main: [
        [
          {
            node: 'Merge Site Results',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Merge Site Results': {
      main: [
        [
          {
            node: 'Save Auctions',
            type: 'main',
            index: 0
          }
        ],
        [
          {
            node: 'Update Site Stats',
            type: 'main',
            index: 0
          }
        ]
      ]
    }
  },
  settings: {
    executionOrder: 'v1'
  }
};

async function deployWorkflow() {
  try {
    log('\n🚀 Deploying Multi-Site Tax Deed Scraper', 'bright');
    log('=' .repeat(60), 'bright');
    
    log('\n🎯 Features:', 'cyan');
    log('   • Multi-site support via database config', 'yellow');
    log('   • Python scraping with BeautifulSoup', 'yellow');
    log('   • AI data enhancement', 'yellow');
    log('   • Configurable scrapers per site', 'yellow');
    log('   • Site-specific CSS selectors', 'yellow');
    log('   • Batch processing of multiple sites', 'yellow');
    log('   • Statistics tracking per site', 'yellow');
    
    const result = await n8nMCP.upsertWorkflow(MULTI_SITE_WORKFLOW);
    
    log(`\n✅ Deployed! ID: ${result.id}`, 'green');
    log(`📝 Name: ${result.name}`, 'blue');
    
    return result;
    
  } catch (error: any) {
    log(`❌ Deployment failed: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`Details: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    return null;
  }
}

async function main() {
  const result = await deployWorkflow();
  
  if (result) {
    log('\n📋 Next Steps - Database Setup:', 'cyan');
    log('1. Create scraping_sites table:', 'yellow');
    log('2. Add site configurations:', 'yellow');
    log('3. Configure workflow credentials:', 'yellow');
    log('4. Test with manual execution:', 'yellow');
    
    log('\n💡 This workflow will:', 'magenta');
    log('   • Load sites from database', 'yellow');
    log('   • Process each site with Python', 'yellow');
    log('   • Enhance data with AI', 'yellow');
    log('   • Save results to auctions table', 'yellow');
    log('   • Track statistics per site', 'yellow');
  }
}

main().catch(console.error);