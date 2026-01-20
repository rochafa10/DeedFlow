"""
Supabase Screenshot Uploader
Automatically uploads property screenshots to Supabase Storage
and updates the database with the public URLs.
"""

import os
import requests
from pathlib import Path

# Supabase Configuration
SUPABASE_URL = "https://oiiwlzobizftprqspbzt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"
BUCKET_NAME = "property-screenshots"

# Local screenshots directory
SCREENSHOTS_DIR = Path(r"c:\Users\fs_ro\OneDrive\1. FABRICIO\Documents\LFB INVESTMENTS\TAX DEED FLOW\.playwright-mcp")

def upload_to_supabase(local_file_path: Path, storage_path: str) -> dict:
    """
    Upload a file to Supabase Storage.

    Args:
        local_file_path: Path to the local file
        storage_path: Path in Supabase Storage (e.g., "blair-pa/01.01-02..-148.00-000.png")

    Returns:
        dict with success status and public URL
    """
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}"

    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true"  # Overwrite if exists
    }

    with open(local_file_path, "rb") as f:
        response = requests.post(upload_url, headers=headers, data=f)

    if response.status_code in [200, 201]:
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"
        return {"success": True, "url": public_url}
    else:
        return {"success": False, "error": response.text, "status": response.status_code}


def update_screenshot_url(parcel_id: str, storage_url: str) -> bool:
    """
    Update the regrid_screenshots table with the public URL.

    Args:
        parcel_id: The parcel ID (used in filename)
        storage_url: The public Supabase Storage URL

    Returns:
        True if successful
    """
    # Use Supabase REST API to update
    update_url = f"{SUPABASE_URL}/rest/v1/regrid_screenshots"

    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # Update where storage_path contains the parcel_id
    params = {
        "storage_path": f"like.*{parcel_id}*"
    }

    data = {
        "storage_url": storage_url
    }

    response = requests.patch(update_url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]


def upload_all_screenshots(county_folder: str = "blair-pa"):
    """
    Upload all PNG screenshots from the local directory to Supabase.

    Args:
        county_folder: Subfolder name in Supabase Storage
    """
    if not SCREENSHOTS_DIR.exists():
        print(f"Screenshots directory not found: {SCREENSHOTS_DIR}")
        return

    png_files = list(SCREENSHOTS_DIR.glob("*.png"))

    if not png_files:
        print("No PNG files found to upload")
        return

    print(f"Found {len(png_files)} screenshots to upload\n")

    success_count = 0
    fail_count = 0

    for file_path in png_files:
        filename = file_path.name
        storage_path = f"{county_folder}/{filename}"

        print(f"Uploading: {filename}")

        result = upload_to_supabase(file_path, storage_path)

        if result["success"]:
            print(f"  [OK] Uploaded to: {result['url']}")

            # Extract parcel_id from filename (remove .png)
            parcel_id = filename.replace(".png", "")

            # Update database with URL
            if update_screenshot_url(parcel_id, result["url"]):
                print(f"  [OK] Database updated")
            else:
                print(f"  [WARN] Database update failed (screenshot may not be in regrid_screenshots table)")

            success_count += 1
        else:
            print(f"  [FAIL] {result.get('error', 'Unknown error')}")
            fail_count += 1

        print()

    print("=" * 50)
    print(f"Upload complete: {success_count} succeeded, {fail_count} failed")


def upload_single_screenshot(filename: str, county_folder: str = "blair-pa"):
    """
    Upload a single screenshot by filename.

    Args:
        filename: Name of the file (e.g., "01.01-02..-148.00-000.png")
        county_folder: Subfolder name in Supabase Storage
    """
    file_path = SCREENSHOTS_DIR / filename

    if not file_path.exists():
        print(f"File not found: {file_path}")
        return None

    storage_path = f"{county_folder}/{filename}"
    result = upload_to_supabase(file_path, storage_path)

    if result["success"]:
        print(f"[OK] Uploaded: {result['url']}")

        # Update database
        parcel_id = filename.replace(".png", "")
        update_screenshot_url(parcel_id, result["url"])

        return result["url"]
    else:
        print(f"[FAIL] {result.get('error')}")
        return None


if __name__ == "__main__":
    print("Supabase Screenshot Uploader")
    print("=" * 50)
    print(f"Source: {SCREENSHOTS_DIR}")
    print(f"Destination: {SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/")
    print("=" * 50)
    print()

    # Upload all screenshots
    upload_all_screenshots("blair-pa")
