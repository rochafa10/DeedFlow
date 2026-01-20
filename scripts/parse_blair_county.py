#!/usr/bin/env python3
"""
Blair County Property List Parser
Extracts property data from Blair County tax sale PDFs and stores in Supabase

Requirements:
    pip install pdfplumber requests supabase
"""

import requests
import pdfplumber
import re
import os
from typing import List, Dict, Optional
from datetime import datetime
from supabase import create_client, Client

# Configuration - Use environment variables or defaults
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://oiiwlzobizftprqspbzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Blair County PDF URLs
PDFS = [
    {
        "title": "Repository Property List",
        "url": "https://www.blairco.org/getmedia/1f3bb36c-bd33-4b51-b9cf-f25a43fa7a8e/REPOSITORY_LIST.pdf",
        "sale_type": "repository",
        "sale_date": "2026-03-11 10:00:00"
    },
    {
        "title": "Judicial Sale Property List",
        "url": "https://www.blairco.org/getmedia/03050d22-2704-4bcb-bdaa-388d1a80e181/Judicial-Sale-List.pdf",
        "sale_type": "judicial",
        "sale_date": "2026-04-15 10:00:00"
    },
    {
        "title": "Upset Sale Property List",
        "url": "https://blairco.org/getmedia/05b601bf-4372-4526-8ac2-82ad45322e93/Upset-Sale-List.pdf",
        "sale_type": "upset",
        "sale_date": "2025-09-17 09:00:00"
    }
]


def parse_money(value: str) -> Optional[float]:
    """Parse money string to float"""
    if not value:
        return None
    try:
        # Remove $, commas, and convert to float
        clean = re.sub(r'[$,]', '', str(value).strip())
        return float(clean) if clean else None
    except:
        return None


def parse_parcel_id(value: str) -> Optional[str]:
    """Extract and validate parcel ID from Blair County Map Number format"""
    if not value:
        return None

    # Clean the value
    clean_value = str(value).strip()

    # Reject township/borough/city names (these are NOT parcel IDs)
    upper_value = clean_value.upper()
    if any(x in upper_value for x in ['TOWNSHIP', 'BOROUGH', 'CITY OF', 'CAMA', 'MAP NUMBER']):
        return None

    # Blair County Map Number format: "0 1 . 05-16..-093.00-000" or "01.05-16..-093.00-000"
    # Also handles: "01.02-07..-034.00-000", "09.00-04..-048.01-002"

    # Remove extra spaces in the parcel ID
    clean_value = re.sub(r'\s+', '', clean_value)

    # Match Blair County parcel format: XX.XX-XX..-XXX.XX-XXX
    blair_pattern = r'\d{2}\.\d{2}-\d{2}\.+-\d{3}\.\d{2}-\d{3}'
    match = re.search(blair_pattern, clean_value)
    if match:
        return match.group(0)

    # Alternative format: XX-XXX-XXX.X or XX-XXX-XXX
    alt_pattern = r'\d{2,3}-\d{2,3}-\d{3,4}\.?\d?'
    match = re.search(alt_pattern, clean_value)
    if match:
        return match.group(0)

    return None


def is_township_header(row: list) -> bool:
    """Check if row is a township/municipality header (not a property)"""
    if not row or len(row) < 2:
        return False

    first_cell = str(row[0]).strip().upper() if row[0] else ""

    # Township/municipality headers to skip
    skip_patterns = [
        'TOWNSHIP', 'BOROUGH', 'CITY OF', 'CAMA #', 'CAMA#',
        'REPUTED OWNER', 'PROPERTY DESC', 'MAP NUMBER', 'LAND USE'
    ]

    for pattern in skip_patterns:
        if pattern in first_cell:
            return True

    # Also skip if first cell doesn't look like a CAMA number (8 digits)
    # and second cell is empty or None
    if not re.match(r'^\d{7,8}$', first_cell):
        # Check if it looks like a municipality name (all caps, no digits)
        if re.match(r'^[A-Z\s]+$', first_cell) and len(first_cell) > 5:
            return True

    return False


def get_county_id(county_name: str, state_code: str) -> str:
    """Get or create county ID"""
    result = supabase.rpc('get_or_create_county', {
        'p_county_name': county_name,
        'p_state_code': state_code
    }).execute()

    return result.data


def get_document_id(county_id: str, title: str) -> Optional[str]:
    """Get document ID from title"""
    result = supabase.table('documents').select('id').eq('county_id', county_id).ilike('title', f'%{title}%').execute()

    return result.data[0]['id'] if result.data else None


def create_parsing_job(document_id: str) -> str:
    """Create parsing job"""
    result = supabase.rpc('create_parsing_job', {
        'p_document_id': document_id
    }).execute()

    return result.data


def upsert_property(county_id: str, document_id: str, prop: Dict) -> None:
    """Insert or update property"""
    supabase.rpc('upsert_property', {
        'p_county_id': county_id,
        'p_document_id': document_id,
        'p_parcel_id': prop['parcel_id'],
        'p_property_address': prop.get('address'),
        'p_owner_name': prop.get('owner'),
        'p_tax_amount': prop.get('tax_amount'),
        'p_total_due': prop.get('total_due'),
        'p_tax_year': prop.get('tax_year', 2025),
        'p_sale_type': prop.get('sale_type'),
        'p_sale_date': prop.get('sale_date'),
        'p_raw_text': prop.get('raw_text'),
        'p_confidence': prop.get('confidence', 0.85)
    }).execute()


def complete_job(job_id: str, extracted: int, failed: int, confidence: float) -> None:
    """Mark parsing job complete"""
    supabase.rpc('complete_parsing_job', {
        'p_job_id': job_id,
        'p_properties_extracted': extracted,
        'p_properties_failed': failed,
        'p_parser_used': 'pdfplumber',
        'p_confidence_avg': confidence
    }).execute()


def fail_job(job_id: str, error: str) -> None:
    """Mark parsing job failed"""
    supabase.rpc('fail_parsing_job', {
        'p_job_id': job_id,
        'p_error_message': error
    }).execute()


def detect_pdf_format(first_row: list) -> str:
    """Detect the PDF format based on header row"""
    if not first_row:
        return "unknown"

    header_text = ' '.join([str(c).upper() if c else '' for c in first_row])

    if 'CAMA' in header_text and 'REPUTED OWNER' in header_text:
        return "repository"  # Repository format: CAMA#, Owner, Address, Map Number, Land Use
    elif 'WINNING BID' in header_text:
        return "judicial"  # Judicial format: *, Control#, Owner, Map#, Desc, Land Use, Bid, Bidder
    elif 'UPSET' in header_text or 'APPROXIMATE' in header_text:
        return "upset"  # Upset sale format: Control#, Owner, Map#, Desc, Upset Amount
    elif 'CONTROL NO' in header_text:
        return "upset"  # Upset sale also has CONTROL NO header
    else:
        return "unknown"


def parse_repository_row(row: list, current_municipality: str) -> Optional[Dict]:
    """Parse a row from Repository format PDF"""
    # Format: CAMA#(0), Owner(1), Address(2), Map Number(3), Land Use(4)
    if len(row) < 4:
        return None

    cama_num = str(row[0]).strip() if row[0] else ""
    owner = str(row[1]).strip() if row[1] else None
    address = str(row[2]).strip() if row[2] else None
    map_number = str(row[3]).strip() if row[3] else ""
    land_use = str(row[4]).strip() if len(row) > 4 and row[4] else None

    # Validate CAMA number (should be 7-8 digits)
    if not re.match(r'^\d{7,8}$', cama_num):
        return None

    parcel_id = parse_parcel_id(map_number)
    if not parcel_id:
        return None

    return {
        'parcel_id': parcel_id,
        'address': address,
        'owner': owner,
        'city': current_municipality,
        'total_due': None,
        'confidence': 0.95
    }


def clean_spaced_text(text: str) -> str:
    """Clean up text with extra spaces between characters (e.g., 'B A R N ER DAVID W' -> 'BARNER DAVID W')"""
    if not text:
        return text

    # First normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # Split into words and process
    words = text.split(' ')
    result = []
    i = 0

    while i < len(words):
        # Check if we have a sequence of single letters
        if len(words[i]) == 1 and words[i].isupper():
            # Collect consecutive single letters
            single_letters = [words[i]]
            j = i + 1
            while j < len(words) and len(words[j]) == 1 and words[j].isupper():
                single_letters.append(words[j])
                j += 1

            # If we have 2+ single letters
            if len(single_letters) >= 2:
                combined = ''.join(single_letters)

                # Check if next word is a suffix (2-10 uppercase letters)
                # But NOT if it's a complete word like a first name (DAVID, JAMES, MARI, etc.)
                # Common first names to NOT merge: DAVID, JAMES, JOHN, MARY, MARI, JACK, etc.
                common_names = {'DAVID', 'JAMES', 'JOHN', 'MARY', 'MARI', 'JACK', 'JANE', 'PAUL', 'ANNE', 'MARK', 'RUTH', 'LOUIS', 'MICHAEL', 'PATRICIA', 'THOMAS', 'RICHARD', 'ROBERT', 'WILLIAM', 'MARGARET', 'ANDREA', 'NAOMI', 'CONNIE', 'EVELYN', 'IRENE', 'KIRSTEN', 'VINCENT', 'LEO', 'TARA', 'THELMA', 'MATTHEW', 'TERRY', 'JERE'}

                if j < len(words):
                    next_word = words[j]
                    # If it's 2-10 uppercase letters and NOT a common first name, merge it
                    if len(next_word) >= 2 and len(next_word) <= 10 and next_word.isupper() and next_word not in common_names:
                        combined += next_word
                        j += 1

                result.append(combined)
                i = j
            else:
                result.append(words[i])
                i += 1
        else:
            result.append(words[i])
            i += 1

    text = ' '.join(result)

    # Handle single-letter + suffix pattern like "D ESCRIPTION" or "M ALICOAT"
    # Pattern: single letter, space, then uppercase letters (suffix must be 3+ chars to avoid false positives)
    # But not common first names
    text = re.sub(r'\b([A-Z]) ([A-Z]{5,})(?=\s|$)', r'\1\2', text)

    return text


def clean_spaced_address(text: str) -> str:
    """Clean up address with spaced-out numbers (e.g., '8 1 5 3RD AVE' -> '815 3RD AVE')"""
    if not text:
        return text

    # First normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # Pattern: sequences of single digits separated by spaces at the start
    # e.g., "8 1 5 3RD AVE" -> "815 3RD AVE"
    # e.g., "1 5 08 13TH ALY" -> "1508 13TH ALY"
    # e.g., "2 2 09 1/2 8TH AVE" -> "2209 1/2 8TH AVE"
    def fix_spaced_numbers(match):
        spaced = match.group(0)
        # Remove spaces to combine digits
        return spaced.replace(' ', '')

    # Match pattern: 2+ single digits with spaces at the start, optionally followed by 2-digit number
    # e.g., "8 1 5 " or "1 5 08 " or "2 2 09 "
    text = re.sub(r'^(\d )+\d{1,2}(?=\s)', fix_spaced_numbers, text)

    # Also handle remaining spaced single digits
    # Pattern: multiple single digits separated by spaces at start
    match = re.match(r'^(\d(\s\d)+)', text)
    if match:
        spaced_num = match.group(0)
        clean_num = spaced_num.replace(' ', '')
        text = clean_num + text[len(spaced_num):]

    # Handle spaced text in addresses (like street names)
    # e.g., "D ESCRIPTION" -> "DESCRIPTION"
    text = clean_spaced_text(text)

    return text.strip()


def parse_judicial_row(row: list) -> Optional[Dict]:
    """Parse a row from Judicial Sale format PDF"""
    # Format: *(0), Control#(1), Owner(2), Map#(3), Desc(4), Land Use(5), Winning Bid(6), Winner(7)
    if len(row) < 5:
        return None

    control_num = str(row[1]).strip() if len(row) > 1 and row[1] else ""
    owner = str(row[2]).strip() if len(row) > 2 and row[2] else None
    map_number = str(row[3]).strip() if len(row) > 3 and row[3] else ""
    address = str(row[4]).strip() if len(row) > 4 and row[4] else None
    winning_bid = str(row[6]).strip() if len(row) > 6 and row[6] else None

    # Clean up owner name (fix spaced-out text like "B A R N ER")
    if owner:
        owner = clean_spaced_text(owner)

    # Clean up address (fix spaced-out numbers like "8 1 5 3RD AVE")
    if address:
        address = clean_spaced_address(address)

    # Validate control number format (XXX-XXXXXX)
    if not re.match(r'^\d{3}-\d{6}$', control_num):
        return None

    parcel_id = parse_parcel_id(map_number)
    if not parcel_id:
        return None

    # Parse winning bid amount
    total_due = None
    if winning_bid and winning_bid != 'Not Sold':
        total_due = parse_money(winning_bid)

    return {
        'parcel_id': parcel_id,
        'address': address,
        'owner': owner,
        'city': None,
        'total_due': total_due,
        'confidence': 0.95
    }


def parse_upset_row(row: list, current_municipality: str) -> Optional[Dict]:
    """Parse a row from Upset Sale format PDF"""
    # Format: Empty(0), Control#(1), Owner(2), Map#(3), Description(4), Upset Amount(5)
    if len(row) < 6:
        return None

    control_num = str(row[1]).strip() if len(row) > 1 and row[1] else ""
    owner = str(row[2]).strip() if len(row) > 2 and row[2] else None
    map_number = str(row[3]).strip() if len(row) > 3 and row[3] else ""
    address = str(row[4]).strip() if len(row) > 4 and row[4] else None
    upset_amount = str(row[5]).strip() if len(row) > 5 and row[5] else None

    # Clean up owner name (fix spaced-out text like "B A C K M EIER")
    if owner:
        owner = clean_spaced_text(owner)

    # Clean up address (fix spaced-out numbers like "5 1 1 5TH AVE")
    if address:
        address = clean_spaced_address(address)

    # Validate control number format (XXX-XXXXXX)
    if not re.match(r'^\d{3}-\d{6}$', control_num):
        return None

    parcel_id = parse_parcel_id(map_number)
    if not parcel_id:
        return None

    # Parse upset amount
    total_due = parse_money(upset_amount) if upset_amount else None

    return {
        'parcel_id': parcel_id,
        'address': address,
        'owner': owner,
        'city': current_municipality,
        'total_due': total_due,
        'confidence': 0.95
    }


def parse_pdf(pdf_path: str, sale_type: str, sale_date: str) -> List[Dict]:
    """Parse PDF and extract properties"""
    properties = []
    current_municipality = None
    pdf_format = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"  Processing page {page_num}...")

            # Try table extraction first
            tables = page.extract_tables()

            if tables:
                for table in tables:
                    for row_idx, row in enumerate(table):
                        if not row or len(row) < 4:
                            continue

                        # Detect format on first page
                        if page_num == 1 and row_idx == 0 and pdf_format is None:
                            pdf_format = detect_pdf_format(row)
                            # If detection failed, use the sale_type as a hint
                            if pdf_format == "unknown":
                                pdf_format = sale_type
                            print(f"    Detected format: {pdf_format}")
                            # For repository/judicial, first row is header - skip it
                            # For upset, first row is data - don't skip
                            if pdf_format in ["repository", "judicial"]:
                                continue
                            # For upset, fall through to parse the first data row

                        # Skip header rows and township headers
                        if is_township_header(row):
                            first_cell = str(row[0]).strip() if row[0] else ""
                            if 'TOWNSHIP' in first_cell.upper() or 'BOROUGH' in first_cell.upper() or 'CITY OF' in first_cell.upper():
                                current_municipality = first_cell
                            continue

                        try:
                            # Parse based on detected format
                            prop = None

                            if pdf_format == "repository":
                                prop = parse_repository_row(row, current_municipality)
                            elif pdf_format == "judicial":
                                prop = parse_judicial_row(row)
                            elif pdf_format == "upset":
                                prop = parse_upset_row(row, current_municipality)
                            else:
                                # Try to auto-detect based on row structure
                                # Check if first column is empty or * (judicial format)
                                first_col = str(row[0]).strip() if row[0] else ""
                                if first_col == "" or first_col == "*":
                                    prop = parse_judicial_row(row)
                                else:
                                    prop = parse_repository_row(row, current_municipality)

                            if prop:
                                prop['sale_type'] = sale_type
                                prop['sale_date'] = sale_date
                                prop['tax_year'] = 2025
                                prop['raw_text'] = ' | '.join([str(c) for c in row if c])
                                properties.append(prop)

                        except Exception as e:
                            print(f"    Warning: Error parsing row: {e}")
                            continue
            else:
                # Fallback to text extraction
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        parcel = parse_parcel_id(line)
                        if parcel:
                            prop = {
                                'parcel_id': parcel,
                                'address': None,
                                'owner': None,
                                'total_due': None,
                                'sale_type': sale_type,
                                'sale_date': sale_date,
                                'raw_text': line,
                                'confidence': 0.60
                            }
                            properties.append(prop)

    return properties


def main():
    """Main parsing workflow"""
    print("Blair County Property List Parser")
    print("=" * 60)

    # Get county ID
    print("\nGetting county ID...")
    county_id = get_county_id('Blair', 'PA')
    print(f"   County ID: {county_id}")

    total_extracted = 0
    total_failed = 0

    # Process each PDF
    for pdf_info in PDFS:
        print(f"\nProcessing: {pdf_info['title']}")
        print(f"   URL: {pdf_info['url']}")

        # Get document ID
        document_id = get_document_id(county_id, pdf_info['title'])
        if not document_id:
            print(f"   Warning: Document not found in database, skipping")
            continue

        # Create parsing job
        job_id = create_parsing_job(document_id)
        print(f"   Created parsing job: {job_id}")

        try:
            # Download PDF
            print(f"   Downloading PDF...")
            response = requests.get(pdf_info['url'], timeout=30)
            response.raise_for_status()

            temp_path = f"temp_{pdf_info['title'].replace(' ', '_')}.pdf"
            with open(temp_path, 'wb') as f:
                f.write(response.content)
            print(f"   Downloaded to {temp_path}")

            # Parse PDF
            print(f"   Extracting properties...")
            properties = parse_pdf(temp_path, pdf_info['sale_type'], pdf_info['sale_date'])
            print(f"   Found {len(properties)} properties")

            # Store properties
            print(f"   Storing in database...")
            stored = 0
            failed = 0

            for prop in properties:
                try:
                    upsert_property(county_id, document_id, prop)
                    stored += 1
                    if stored % 50 == 0:
                        print(f"      Progress: {stored}/{len(properties)}")
                except Exception as e:
                    failed += 1
                    print(f"      Warning: Failed to store property {prop['parcel_id']}: {e}")

            print(f"   Stored {stored} properties ({failed} failed)")

            # Calculate average confidence
            avg_confidence = sum(p['confidence'] for p in properties) / len(properties) if properties else 0

            # Complete job
            complete_job(job_id, stored, failed, avg_confidence)

            total_extracted += stored
            total_failed += failed

            # Cleanup
            try:
                os.remove(temp_path)
            except:
                pass

        except Exception as e:
            print(f"   Error: {e}")
            fail_job(job_id, str(e))
            continue

    # Summary
    print("\n" + "=" * 60)
    print("PARSING COMPLETE")
    print(f"   Total Properties Extracted: {total_extracted}")
    print(f"   Total Failed: {total_failed}")
    if total_extracted + total_failed > 0:
        print(f"   Success Rate: {(total_extracted / (total_extracted + total_failed) * 100):.1f}%")
    print("=" * 60)

    # Show sample query
    print("\nTo query your properties:")
    print("  SELECT * FROM vw_properties_complete")
    print("  WHERE county_name = 'Blair' ORDER BY total_due DESC;")


if __name__ == "__main__":
    main()
