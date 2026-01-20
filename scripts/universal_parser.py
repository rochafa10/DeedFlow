#!/usr/bin/env python3
"""
Universal Tax Auction Property Parser
Parses property list PDFs from any county and stores in Supabase

Lessons Learned from Blair County:
1. PDF formats vary - need format auto-detection
2. Text can be spaced out (e.g., "B A R N ER" -> "BARNER")
3. Numbers can be spaced out (e.g., "8 1 5" -> "815")
4. Township/Borough headers appear as rows - must filter
5. Column positions vary by format - need format-specific parsers
6. First row may be header OR data depending on format
7. sale_type can be used as fallback for format detection

Usage:
    python universal_parser.py --county "Blair" --state "PA"
    python universal_parser.py --county "Centre" --state "PA" --sale-type upset
"""

import argparse
import requests
import pdfplumber
import re
import os
import sys
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://oiiwlzobizftprqspbzt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# =============================================================================
# TEXT CLEANING FUNCTIONS
# =============================================================================

# Common first names that should NOT be merged with preceding text
COMMON_FIRST_NAMES = {
    'DAVID', 'JAMES', 'JOHN', 'MARY', 'MARI', 'JACK', 'JANE', 'PAUL', 'ANNE',
    'MARK', 'RUTH', 'LOUIS', 'MICHAEL', 'PATRICIA', 'THOMAS', 'RICHARD',
    'ROBERT', 'WILLIAM', 'MARGARET', 'ANDREA', 'NAOMI', 'CONNIE', 'EVELYN',
    'IRENE', 'KIRSTEN', 'VINCENT', 'LEO', 'TARA', 'THELMA', 'MATTHEW',
    'TERRY', 'JERE', 'LINDA', 'DEBRA', 'KENNETH', 'SHIRLEY', 'WENDY',
    'SOPHIE', 'RANDALL', 'EUGENE', 'CARL', 'ELAINE', 'LORIE', 'MARTIN',
    'GREGORY', 'TRAVIS', 'LEE', 'GERTRUDE', 'ROBIN', 'EDWARD', 'JODY',
    'CHARLOTTE', 'KRISTOPHER', 'DAWNA', 'BRUNHILDE', 'HERBERT', 'LYNN'
}


def clean_spaced_text(text: str) -> str:
    """
    Clean up text with extra spaces between characters.
    Example: 'B A R N ER DAVID W' -> 'BARNER DAVID W'
    """
    if not text:
        return text

    # Normalize whitespace
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
                # But NOT if it's a common first name
                if j < len(words):
                    next_word = words[j]
                    if (len(next_word) >= 2 and len(next_word) <= 10 and
                        next_word.isupper() and next_word not in COMMON_FIRST_NAMES):
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

    # Handle single-letter + suffix pattern like "D ESCRIPTION"
    text = re.sub(r'\b([A-Z]) ([A-Z]{5,})(?=\s|$)', r'\1\2', text)

    return text


def clean_spaced_address(text: str) -> str:
    """
    Clean up address with spaced-out numbers.
    Example: '8 1 5 3RD AVE' -> '815 3RD AVE'
    """
    if not text:
        return text

    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    # Pattern: sequences of single digits separated by spaces at the start
    def fix_spaced_numbers(match):
        return match.group(0).replace(' ', '')

    # Match pattern: 2+ single digits with spaces at the start
    text = re.sub(r'^(\d )+\d{1,2}(?=\s)', fix_spaced_numbers, text)

    # Also handle remaining spaced single digits
    match = re.match(r'^(\d(\s\d)+)', text)
    if match:
        spaced_num = match.group(0)
        clean_num = spaced_num.replace(' ', '')
        text = clean_num + text[len(spaced_num):]

    # Handle spaced text in addresses (like street names)
    text = clean_spaced_text(text)

    return text.strip()


def parse_money(value: str) -> Optional[float]:
    """Parse money string to float"""
    if not value:
        return None
    try:
        clean = re.sub(r'[$,]', '', str(value).strip())
        return float(clean) if clean else None
    except:
        return None


# =============================================================================
# PARCEL ID PARSING
# =============================================================================

# Known parcel ID patterns by state
PARCEL_PATTERNS = {
    'PA': [
        # Blair County: XX.XX-XX..-XXX.XX-XXX
        r'\d{2}\.\d{2}-\d{2}\.+-\d{3}\.\d{2}-\d{3}',
        # Alternative PA format
        r'\d{2,3}-\d{2,3}-\d{3,4}\.?\d?',
    ],
    'FL': [
        # Florida format: XX-XX-XX-XXXX-XXX-XXXX
        r'\d{2}-\d{2}-\d{2}-\d{4}-\d{3}-\d{4}',
    ],
    'TX': [
        # Texas format varies by county
        r'\d{5,10}',
    ],
    'DEFAULT': [
        # Generic patterns
        r'\d{2,3}[-\.]\d{2,3}[-\.]\d{3,4}',
        r'\d{8,12}',
    ]
}


def parse_parcel_id(value: str, state_code: str = 'PA') -> Optional[str]:
    """Extract and validate parcel ID based on state format"""
    if not value:
        return None

    clean_value = str(value).strip()

    # Reject township/borough/city names
    upper_value = clean_value.upper()
    reject_patterns = ['TOWNSHIP', 'BOROUGH', 'CITY OF', 'CAMA', 'MAP NUMBER',
                       'CONTROL', 'OWNER', 'DESCRIPTION', 'LAND USE']
    if any(x in upper_value for x in reject_patterns):
        return None

    # Remove extra spaces
    clean_value = re.sub(r'\s+', '', clean_value)

    # Try state-specific patterns first
    patterns = PARCEL_PATTERNS.get(state_code, []) + PARCEL_PATTERNS['DEFAULT']

    for pattern in patterns:
        match = re.search(pattern, clean_value)
        if match:
            return match.group(0)

    return None


# =============================================================================
# ROW DETECTION AND FILTERING
# =============================================================================

def is_header_or_skip_row(row: list) -> bool:
    """Check if row is a header or should be skipped"""
    if not row or len(row) < 2:
        return True

    first_cell = str(row[0]).strip().upper() if row[0] else ""

    # Skip patterns
    skip_patterns = [
        'TOWNSHIP', 'BOROUGH', 'CITY OF', 'CAMA', 'CONTROL',
        'REPUTED OWNER', 'PROPERTY DESC', 'MAP NUMBER', 'LAND USE',
        'OWNER', 'PARCEL', 'DESCRIPTION', 'AMOUNT', 'BID'
    ]

    for pattern in skip_patterns:
        if pattern in first_cell:
            return True

    # Check if it looks like a municipality name (all caps, no digits, > 5 chars)
    if re.match(r'^[A-Z\s]+$', first_cell) and len(first_cell) > 5:
        # But not if it looks like an owner name (has common name patterns)
        if not any(name in first_cell for name in ['LLC', 'INC', 'CORP', 'TRUST']):
            return True

    return False


def extract_municipality(row: list) -> Optional[str]:
    """Extract municipality name from header row"""
    if not row:
        return None

    first_cell = str(row[0]).strip().upper() if row[0] else ""

    if 'TOWNSHIP' in first_cell or 'BOROUGH' in first_cell or 'CITY OF' in first_cell:
        return first_cell

    return None


# =============================================================================
# FORMAT DETECTION
# =============================================================================

def detect_pdf_format(first_row: list, page_text: str = "") -> str:
    """
    Detect the PDF format based on header row or page text.
    Returns: 'repository', 'judicial', 'upset', or 'unknown'
    """
    if first_row:
        header_text = ' '.join([str(c).upper() if c else '' for c in first_row])
    else:
        header_text = ""

    # Combine with page text for better detection
    full_text = (header_text + " " + page_text.upper()[:500]).upper()

    # Check for specific format indicators
    if 'CAMA' in full_text and 'REPUTED OWNER' in full_text:
        return "repository"
    elif 'WINNING BID' in full_text or 'WINNING BIDDER' in full_text:
        return "judicial"
    elif 'UPSET' in full_text or 'APPROXIMATE' in full_text:
        return "upset"
    elif 'REPOSITORY' in full_text:
        return "repository"
    elif 'JUDICIAL' in full_text:
        return "judicial"

    return "unknown"


# =============================================================================
# FORMAT-SPECIFIC PARSERS
# =============================================================================

def parse_repository_row(row: list, state_code: str, municipality: str = None) -> Optional[Dict]:
    """
    Parse Repository format row.
    Format: CAMA#(0), Owner(1), Address(2), Map Number(3), Land Use(4)
    """
    if len(row) < 4:
        return None

    cama_num = str(row[0]).strip() if row[0] else ""
    owner = str(row[1]).strip() if row[1] else None
    address = str(row[2]).strip() if row[2] else None
    map_number = str(row[3]).strip() if row[3] else ""

    # Validate CAMA number (7-8 digits)
    if not re.match(r'^\d{7,8}$', cama_num):
        return None

    parcel_id = parse_parcel_id(map_number, state_code)
    if not parcel_id:
        return None

    return {
        'parcel_id': parcel_id,
        'address': address,
        'owner': owner,
        'city': municipality,
        'total_due': None,
        'confidence': 0.95
    }


def parse_judicial_row(row: list, state_code: str) -> Optional[Dict]:
    """
    Parse Judicial Sale format row.
    Format: *(0), Control#(1), Owner(2), Map#(3), Desc(4), Land Use(5), Winning Bid(6), Winner(7)
    """
    if len(row) < 5:
        return None

    control_num = str(row[1]).strip() if len(row) > 1 and row[1] else ""
    owner = str(row[2]).strip() if len(row) > 2 and row[2] else None
    map_number = str(row[3]).strip() if len(row) > 3 and row[3] else ""
    address = str(row[4]).strip() if len(row) > 4 and row[4] else None
    winning_bid = str(row[6]).strip() if len(row) > 6 and row[6] else None

    # Clean spaced text
    if owner:
        owner = clean_spaced_text(owner)
    if address:
        address = clean_spaced_address(address)

    # Validate control number (XXX-XXXXXX)
    if not re.match(r'^\d{3}-\d{6}$', control_num):
        return None

    parcel_id = parse_parcel_id(map_number, state_code)
    if not parcel_id:
        return None

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


def parse_upset_row(row: list, state_code: str, municipality: str = None) -> Optional[Dict]:
    """
    Parse Upset Sale format row.
    Format: Empty(0), Control#(1), Owner(2), Map#(3), Description(4), Upset Amount(5)
    """
    if len(row) < 6:
        return None

    control_num = str(row[1]).strip() if len(row) > 1 and row[1] else ""
    owner = str(row[2]).strip() if len(row) > 2 and row[2] else None
    map_number = str(row[3]).strip() if len(row) > 3 and row[3] else ""
    address = str(row[4]).strip() if len(row) > 4 and row[4] else None
    upset_amount = str(row[5]).strip() if len(row) > 5 and row[5] else None

    # Clean spaced text
    if owner:
        owner = clean_spaced_text(owner)
    if address:
        address = clean_spaced_address(address)

    # Validate control number (XXX-XXXXXX)
    if not re.match(r'^\d{3}-\d{6}$', control_num):
        return None

    parcel_id = parse_parcel_id(map_number, state_code)
    if not parcel_id:
        return None

    total_due = parse_money(upset_amount) if upset_amount else None

    return {
        'parcel_id': parcel_id,
        'address': address,
        'owner': owner,
        'city': municipality,
        'total_due': total_due,
        'confidence': 0.95
    }


def parse_generic_row(row: list, state_code: str, municipality: str = None) -> Optional[Dict]:
    """
    Generic row parser - tries to extract parcel ID from any column.
    Used as fallback when format is unknown.
    """
    parcel_id = None
    address = None
    owner = None
    amount = None

    for i, cell in enumerate(row):
        if not cell:
            continue
        cell_str = str(cell).strip()

        # Try to find parcel ID
        if not parcel_id:
            parcel_id = parse_parcel_id(cell_str, state_code)

        # Try to find money amount
        if not amount and '$' in cell_str:
            amount = parse_money(cell_str)

        # Guess address (contains numbers and common street suffixes)
        if not address and re.search(r'\d+.*(?:ST|AVE|RD|DR|LN|CT|WAY|BLVD)', cell_str.upper()):
            address = clean_spaced_address(cell_str)

        # Guess owner (all caps, no numbers, not too short)
        if not owner and re.match(r'^[A-Z\s&,\.]+$', cell_str) and len(cell_str) > 5:
            if not any(x in cell_str.upper() for x in ['TOWNSHIP', 'BOROUGH', 'CITY OF']):
                owner = clean_spaced_text(cell_str)

    if not parcel_id:
        return None

    return {
        'parcel_id': parcel_id,
        'address': address,
        'owner': owner,
        'city': municipality,
        'total_due': amount,
        'confidence': 0.70  # Lower confidence for generic parsing
    }


# =============================================================================
# PDF PARSING
# =============================================================================

def parse_pdf(pdf_path: str, state_code: str, sale_type: str, sale_date: str) -> List[Dict]:
    """Parse PDF and extract properties"""
    properties = []
    current_municipality = None
    pdf_format = None

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"  Processing page {page_num}...")

            # Get page text for format detection
            page_text = page.extract_text() or ""

            # Try table extraction
            tables = page.extract_tables()

            if tables:
                for table in tables:
                    for row_idx, row in enumerate(table):
                        if not row or len(row) < 3:
                            continue

                        # Detect format on first page, first row
                        if page_num == 1 and row_idx == 0 and pdf_format is None:
                            pdf_format = detect_pdf_format(row, page_text)
                            if pdf_format == "unknown":
                                pdf_format = sale_type  # Use sale_type as fallback
                            print(f"    Detected format: {pdf_format}")

                            # For repository/judicial, first row is usually header
                            if pdf_format in ["repository", "judicial"]:
                                continue

                        # Check for municipality header
                        municipality = extract_municipality(row)
                        if municipality:
                            current_municipality = municipality
                            continue

                        # Skip header rows
                        if is_header_or_skip_row(row):
                            continue

                        try:
                            # Parse based on format
                            prop = None

                            if pdf_format == "repository":
                                prop = parse_repository_row(row, state_code, current_municipality)
                            elif pdf_format == "judicial":
                                prop = parse_judicial_row(row, state_code)
                            elif pdf_format == "upset":
                                prop = parse_upset_row(row, state_code, current_municipality)
                            else:
                                # Try generic parsing
                                prop = parse_generic_row(row, state_code, current_municipality)

                            if prop:
                                prop['sale_type'] = sale_type
                                prop['sale_date'] = sale_date
                                prop['tax_year'] = datetime.now().year
                                prop['raw_text'] = ' | '.join([str(c) for c in row if c])
                                properties.append(prop)

                        except Exception as e:
                            print(f"    Warning: Error parsing row: {e}")
                            continue
            else:
                # Fallback to text extraction
                if page_text:
                    lines = page_text.split('\n')
                    for line in lines:
                        parcel = parse_parcel_id(line, state_code)
                        if parcel:
                            prop = {
                                'parcel_id': parcel,
                                'address': None,
                                'owner': None,
                                'total_due': None,
                                'sale_type': sale_type,
                                'sale_date': sale_date,
                                'tax_year': datetime.now().year,
                                'raw_text': line,
                                'confidence': 0.50
                            }
                            properties.append(prop)

    return properties


# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================

def get_county_id(county_name: str, state_code: str) -> str:
    """Get or create county ID"""
    result = supabase.rpc('get_or_create_county', {
        'p_county_name': county_name,
        'p_state_code': state_code
    }).execute()
    return result.data


def get_unparsed_documents(county_id: str, document_type: str = 'property_list') -> List[Dict]:
    """Get documents that haven't been parsed yet"""
    result = supabase.rpc('get_unparsed_documents', {
        'p_county_id': county_id,
        'p_document_type': document_type,
        'p_limit': 50
    }).execute()
    return result.data or []


def create_parsing_job(document_id: str) -> str:
    """Create parsing job"""
    result = supabase.rpc('create_parsing_job', {
        'p_document_id': document_id
    }).execute()
    return result.data


def complete_job(job_id: str, extracted: int, failed: int, confidence: float) -> None:
    """Mark parsing job complete"""
    supabase.rpc('complete_parsing_job', {
        'p_job_id': job_id,
        'p_properties_extracted': extracted,
        'p_properties_failed': failed,
        'p_parser_used': 'universal_parser',
        'p_confidence_avg': confidence
    }).execute()


def fail_job(job_id: str, error: str) -> None:
    """Mark parsing job failed"""
    supabase.rpc('fail_parsing_job', {
        'p_job_id': job_id,
        'p_error_message': error
    }).execute()


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
        'p_tax_year': prop.get('tax_year', datetime.now().year),
        'p_sale_type': prop.get('sale_type'),
        'p_sale_date': prop.get('sale_date'),
        'p_raw_text': prop.get('raw_text'),
        'p_confidence': prop.get('confidence', 0.85)
    }).execute()


# =============================================================================
# MAIN WORKFLOW
# =============================================================================

def download_pdf(url: str, filename: str) -> str:
    """Download PDF from URL"""
    response = requests.get(url, timeout=60)
    response.raise_for_status()

    with open(filename, 'wb') as f:
        f.write(response.content)

    return filename


def parse_document(county_id: str, document: Dict, state_code: str) -> Tuple[int, int]:
    """Parse a single document and store properties"""
    doc_id = document['document_id']
    url = document['document_url']
    title = document['document_title']

    print(f"\nProcessing: {title}")
    print(f"   URL: {url}")

    # Create parsing job
    job_id = create_parsing_job(doc_id)
    print(f"   Created parsing job: {job_id}")

    try:
        # Download PDF
        print("   Downloading PDF...")
        filename = f"temp_{title.replace(' ', '_')}.pdf"
        download_pdf(url, filename)
        print(f"   Downloaded to {filename}")

        # Determine sale type from title
        title_upper = title.upper()
        if 'REPOSITORY' in title_upper:
            sale_type = 'repository'
        elif 'JUDICIAL' in title_upper:
            sale_type = 'judicial'
        elif 'UPSET' in title_upper:
            sale_type = 'upset'
        else:
            sale_type = 'unknown'

        # Parse PDF
        print("   Extracting properties...")
        properties = parse_pdf(filename, state_code, sale_type, None)
        print(f"   Found {len(properties)} properties")

        # Store in database
        print("   Storing in database...")
        stored = 0
        failed = 0
        confidences = []

        for i, prop in enumerate(properties):
            try:
                upsert_property(county_id, doc_id, prop)
                stored += 1
                confidences.append(prop.get('confidence', 0.85))

                if (i + 1) % 50 == 0:
                    print(f"      Progress: {i + 1}/{len(properties)}")
            except Exception as e:
                failed += 1
                print(f"      Error storing property: {e}")

        print(f"   Stored {stored} properties ({failed} failed)")

        # Complete job
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        complete_job(job_id, stored, failed, avg_confidence)

        # Clean up
        if os.path.exists(filename):
            os.remove(filename)

        return stored, failed

    except Exception as e:
        print(f"   Error: {e}")
        fail_job(job_id, str(e))
        return 0, 1


def parse_county(county_name: str, state_code: str, sale_type_filter: str = None) -> None:
    """Parse all unparsed documents for a county"""
    print(f"Universal Property Parser")
    print("=" * 60)

    # Get county ID
    print(f"\nGetting county ID for {county_name}, {state_code}...")
    county_id = get_county_id(county_name, state_code)
    print(f"   County ID: {county_id}")

    # Get unparsed documents
    print("\nFetching unparsed documents...")
    documents = get_unparsed_documents(county_id)

    if not documents:
        print("   No unparsed documents found.")
        print("\n   Make sure the Research Agent has run and stored documents.")
        return

    print(f"   Found {len(documents)} unparsed documents")

    # Filter by sale type if specified
    if sale_type_filter:
        documents = [d for d in documents if sale_type_filter.lower() in d['document_title'].lower()]
        print(f"   Filtered to {len(documents)} documents matching '{sale_type_filter}'")

    # Process each document
    total_extracted = 0
    total_failed = 0

    for doc in documents:
        extracted, failed = parse_document(county_id, doc, state_code)
        total_extracted += extracted
        total_failed += failed

    # Summary
    print("\n" + "=" * 60)
    print("PARSING COMPLETE")
    print(f"   Total Properties Extracted: {total_extracted}")
    print(f"   Total Failed: {total_failed}")
    if total_extracted + total_failed > 0:
        success_rate = total_extracted / (total_extracted + total_failed) * 100
        print(f"   Success Rate: {success_rate:.1f}%")
    print("=" * 60)

    print("\nTo query your properties:")
    print(f"  SELECT * FROM vw_properties_complete")
    print(f"  WHERE county_name = '{county_name}' ORDER BY total_due DESC;")


def main():
    parser = argparse.ArgumentParser(
        description='Universal Tax Auction Property Parser',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python universal_parser.py --county "Blair" --state "PA"
  python universal_parser.py --county "Centre" --state "PA" --sale-type upset
  python universal_parser.py --county "Miami-Dade" --state "FL"
        """
    )

    parser.add_argument('--county', '-c', required=True, help='County name')
    parser.add_argument('--state', '-s', required=True, help='State code (e.g., PA, FL, TX)')
    parser.add_argument('--sale-type', '-t', help='Filter by sale type (upset, judicial, repository)')

    args = parser.parse_args()

    parse_county(args.county, args.state, args.sale_type)


if __name__ == "__main__":
    main()
