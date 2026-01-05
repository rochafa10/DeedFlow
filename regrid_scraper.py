"""
Regrid Property Scraper
Scrapes property data from Regrid and uploads screenshots to Supabase.

Usage:
    python regrid_scraper.py

This script is meant to be called by Claude after browser automation
to upload the screenshot and store the reference.
"""

import os
import requests
from pathlib import Path

# Supabase Configuration
SUPABASE_URL = "https://oiiwlzobizftprqspbzt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"
BUCKET_NAME = "property-screenshots"

# Local screenshots directory (where Playwright saves them)
SCREENSHOTS_DIR = Path(r"c:\Users\fs_ro\OneDrive\1. FABRICIO\Documents\LFB INVESTMENTS\TAX DEED FLOW\.playwright-mcp")


def upload_screenshot(parcel_id: str, county_state: str = "blair-pa") -> dict:
    """
    Upload a screenshot for a specific parcel to Supabase Storage.

    The screenshot file must exist at: .playwright-mcp/{parcel_id}.png

    Args:
        parcel_id: The property's parcel ID (e.g., "01.01-02..-148.00-000")
        county_state: Folder name in storage (e.g., "blair-pa", "centre-pa")

    Returns:
        dict with success status, url, and any errors
    """
    # Sanitize parcel_id for filename (replace problematic chars)
    safe_filename = parcel_id.replace("/", "-").replace("\\", "-")
    filename = f"{safe_filename}.png"
    local_path = SCREENSHOTS_DIR / filename

    if not local_path.exists():
        return {"success": False, "error": f"Screenshot not found: {local_path}"}

    # Upload to Supabase Storage
    storage_path = f"{county_state}/{filename}"
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}"

    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true"
    }

    with open(local_path, "rb") as f:
        response = requests.post(upload_url, headers=headers, data=f)

    if response.status_code in [200, 201]:
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"

        # Update database with URL
        update_database(parcel_id, storage_path, public_url)

        return {
            "success": True,
            "url": public_url,
            "storage_path": storage_path
        }
    else:
        return {
            "success": False,
            "error": response.text,
            "status": response.status_code
        }


def update_database(parcel_id: str, storage_path: str, storage_url: str):
    """
    Update the regrid_screenshots table with the storage URL.
    Also marks property as has_screenshot = TRUE.
    """
    # First, get the property_id from parcel_id
    query_url = f"{SUPABASE_URL}/rest/v1/properties"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }
    params = {"parcel_id": f"eq.{parcel_id}", "select": "id"}

    response = requests.get(query_url, headers=headers, params=params)

    if response.status_code == 200 and response.json():
        property_id = response.json()[0]["id"]

        # Upsert screenshot record
        upsert_url = f"{SUPABASE_URL}/rest/v1/regrid_screenshots"
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "resolution=merge-duplicates"

        data = {
            "property_id": property_id,
            "storage_path": storage_path,
            "storage_url": storage_url,
            "screenshot_type": "map"
        }

        response = requests.post(upsert_url, headers=headers, json=data)

        # Mark property as having screenshot
        if response.status_code in [200, 201]:
            update_url = f"{SUPABASE_URL}/rest/v1/properties"
            headers["Prefer"] = "return=minimal"
            requests.patch(
                update_url,
                headers=headers,
                params={"id": f"eq.{property_id}"},
                json={"has_screenshot": True}
            )
            return True

    return False


def get_properties_needing_screenshots(county_name: str = "Blair", state_code: str = "PA", limit: int = 10) -> list:
    """
    Get properties that need screenshots (has_screenshot = FALSE).
    """
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }

    # Get county_id first
    county_url = f"{SUPABASE_URL}/rest/v1/counties"
    params = {
        "county_name": f"eq.{county_name}",
        "state_code": f"eq.{state_code}",
        "select": "id"
    }

    response = requests.get(county_url, headers=headers, params=params)

    if response.status_code == 200 and response.json():
        county_id = response.json()[0]["id"]

        # Get properties needing screenshots
        props_url = f"{SUPABASE_URL}/rest/v1/properties"
        params = {
            "county_id": f"eq.{county_id}",
            "has_screenshot": "eq.false",
            "select": "id,parcel_id,property_address,city,owner_name,has_regrid_data",
            "order": "parcel_id",
            "limit": limit
        }

        response = requests.get(props_url, headers=headers, params=params)

        if response.status_code == 200:
            return response.json()

    return []


def get_properties_needing_regrid(county_name: str = "Blair", state_code: str = "PA", limit: int = 10) -> list:
    """
    Get properties that need Regrid data enhancement (has_regrid_data = FALSE).
    """
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }

    # Get county_id first
    county_url = f"{SUPABASE_URL}/rest/v1/counties"
    params = {
        "county_name": f"eq.{county_name}",
        "state_code": f"eq.{state_code}",
        "select": "id"
    }

    response = requests.get(county_url, headers=headers, params=params)

    if response.status_code == 200 and response.json():
        county_id = response.json()[0]["id"]

        # Get properties needing regrid data
        props_url = f"{SUPABASE_URL}/rest/v1/properties"
        params = {
            "county_id": f"eq.{county_id}",
            "has_regrid_data": "eq.false",
            "select": "id,parcel_id,property_address,city,owner_name,has_screenshot",
            "order": "parcel_id",
            "limit": limit
        }

        response = requests.get(props_url, headers=headers, params=params)

        if response.status_code == 200:
            return response.json()

    return []


def get_enhancement_status(county_name: str = "Blair", state_code: str = "PA") -> dict:
    """
    Get enhancement status counts for a county.
    """
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }

    # Query the view
    view_url = f"{SUPABASE_URL}/rest/v1/vw_properties_enhancement_status"
    params = {
        "county_name": f"eq.{county_name}",
        "state_code": f"eq.{state_code}",
        "select": "enhancement_status"
    }

    response = requests.get(view_url, headers=headers, params=params)

    if response.status_code == 200:
        data = response.json()
        status_counts = {"complete": 0, "partial": 0, "pending": 0}
        for row in data:
            status = row.get("enhancement_status", "pending")
            status_counts[status] = status_counts.get(status, 0) + 1
        return status_counts

    return {"complete": 0, "partial": 0, "pending": 0}


def get_properties_to_scrape(county_name: str = "Blair", state_code: str = "PA", limit: int = 10) -> list:
    """
    Get properties that need Regrid data scraped.

    Returns list of properties without regrid_data records.
    """
    # Use RPC to call the helper function
    rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/get_properties_needing_scraping"

    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }

    # Get county_id first
    county_url = f"{SUPABASE_URL}/rest/v1/counties"
    params = {
        "county_name": f"eq.{county_name}",
        "state_code": f"eq.{state_code}",
        "select": "id"
    }

    response = requests.get(county_url, headers=headers, params=params)

    if response.status_code == 200 and response.json():
        county_id = response.json()[0]["id"]

        # Call RPC function
        data = {
            "p_county_id": county_id,
            "p_limit": limit
        }

        response = requests.post(rpc_url, headers=headers, json=data)

        if response.status_code == 200:
            return response.json()

    return []


def clean_old_screenshots():
    """
    Delete screenshots from local directory that don't match parcel_id pattern.
    Keeps only files that look like parcel IDs.
    """
    if not SCREENSHOTS_DIR.exists():
        return

    deleted = 0
    kept = 0

    for file_path in SCREENSHOTS_DIR.glob("*.png"):
        filename = file_path.stem  # filename without extension

        # Check if it looks like a parcel ID (contains digits and special chars like . or -)
        # Parcel IDs typically have patterns like "01.01-02..-148.00-000"
        has_digits = any(c.isdigit() for c in filename)
        has_separators = any(c in filename for c in [".", "-"])
        is_generic = filename.startswith("blair-county-property") or filename.startswith("page-")

        if is_generic or not (has_digits and has_separators):
            file_path.unlink()
            print(f"Deleted: {filename}.png")
            deleted += 1
        else:
            print(f"Kept: {filename}.png")
            kept += 1

    print(f"\nCleaned up: {deleted} deleted, {kept} kept")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "clean":
            print("Cleaning old screenshots...")
            clean_old_screenshots()

        elif command == "upload" and len(sys.argv) > 2:
            parcel_id = sys.argv[2]
            county = sys.argv[3] if len(sys.argv) > 3 else "blair-pa"
            print(f"Uploading screenshot for {parcel_id}...")
            result = upload_screenshot(parcel_id, county)
            if result["success"]:
                print(f"[OK] {result['url']}")
            else:
                print(f"[FAIL] {result['error']}")

        elif command == "list":
            county = sys.argv[2] if len(sys.argv) > 2 else "Blair"
            state = sys.argv[3] if len(sys.argv) > 3 else "PA"
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 10
            print(f"Properties needing scraping in {county}, {state}:")
            properties = get_properties_to_scrape(county, state, limit)
            for p in properties:
                print(f"  {p['parcel_id']}: {p['property_address']}")

        elif command == "screenshots":
            county = sys.argv[2] if len(sys.argv) > 2 else "Blair"
            state = sys.argv[3] if len(sys.argv) > 3 else "PA"
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 10
            print(f"Properties needing screenshots in {county}, {state}:")
            properties = get_properties_needing_screenshots(county, state, limit)
            print(f"Found {len(properties)} properties without screenshots:\n")
            for p in properties:
                print(f"  {p['parcel_id']}: {p['property_address']}")

        elif command == "regrid":
            county = sys.argv[2] if len(sys.argv) > 2 else "Blair"
            state = sys.argv[3] if len(sys.argv) > 3 else "PA"
            limit = int(sys.argv[4]) if len(sys.argv) > 4 else 10
            print(f"Properties needing Regrid data in {county}, {state}:")
            properties = get_properties_needing_regrid(county, state, limit)
            print(f"Found {len(properties)} properties without Regrid data:\n")
            for p in properties:
                screenshot = "[S]" if p.get('has_screenshot') else "[ ]"
                print(f"  {screenshot} {p['parcel_id']}: {p['property_address']}")

        elif command == "status":
            county = sys.argv[2] if len(sys.argv) > 2 else "Blair"
            state = sys.argv[3] if len(sys.argv) > 3 else "PA"
            status = get_enhancement_status(county, state)
            total = status['complete'] + status['partial'] + status['pending']
            print(f"\nEnhancement Status for {county}, {state}")
            print("=" * 40)
            print(f"  Complete (screenshot + regrid): {status['complete']:>5}")
            print(f"  Partial (one of the two):       {status['partial']:>5}")
            print(f"  Pending (neither):              {status['pending']:>5}")
            print("-" * 40)
            print(f"  Total:                          {total:>5}")
            print()
            if total > 0:
                pct_complete = (status['complete'] / total) * 100
                print(f"  Progress: {pct_complete:.1f}% complete")

        else:
            print("Usage:")
            print("  python regrid_scraper.py clean                - Delete non-parcel screenshots")
            print("  python regrid_scraper.py upload <parcel_id>   - Upload specific screenshot")
            print("  python regrid_scraper.py list [county] [state] [limit]  - List properties to scrape")
            print("  python regrid_scraper.py screenshots [county] [state]   - List properties needing screenshots")
            print("  python regrid_scraper.py regrid [county] [state]        - List properties needing Regrid data")
            print("  python regrid_scraper.py status [county] [state]        - Show enhancement status")
    else:
        print("Regrid Scraper Utility")
        print("=" * 50)
        print("Commands:")
        print("  clean  - Delete generic screenshots, keep parcel-named ones")
        print("  upload - Upload a screenshot by parcel_id")
        print("  list   - Show properties needing scraping")
