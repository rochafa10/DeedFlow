import json

# Read the current workflow
with open("n8n-workflows/TDF-Regrid-Scraper-V15-WORKFLOW.json", "r") as f:
    workflow = json.load(f)

# Fix the Split in Batches node to process 1 item at a time
for node in workflow["nodes"]:
    if node["name"] == "Split in Batches":
        # Set batch size to 1 to process one property at a time
        node["parameters"]["batchSize"] = 1
        print(f"Fixed Split in Batches: batchSize set to 1")
    
    # Also fix the Upload Screenshot URL to use .jpg extension (matching our JPEG output)
    if node["name"] == "Upload Screenshot to Supabase":
        node["parameters"]["url"] = "=https://oiiwlzobizftprqspbzt.supabase.co/storage/v1/object/screenshots/{{ $json.fileName }}"
        node["parameters"]["headerParameters"]["parameters"][1]["value"] = "image/jpeg"
        print(f"Fixed Upload Screenshot: URL uses $json.fileName, Content-Type is image/jpeg")
    
    if node["name"] == "Update Screenshot URL":
        node["parameters"]["jsonBody"] = '={"screenshot_url": "https://oiiwlzobizftprqspbzt.supabase.co/storage/v1/object/public/screenshots/{{ $json.fileName }}"}'
        print(f"Fixed Update Screenshot URL: uses $json.fileName")

# Save the fixed workflow
with open("temp/fixed_workflow_v4.json", "w") as f:
    json.dump(workflow, f, indent=2)

print("\nFixed workflow saved to temp/fixed_workflow_v4.json")
print("\nKey changes:")
print("1. Split in Batches: batchSize = 1 (process one property at a time)")
print("2. Upload Screenshot: Uses $json.fileName from Convert Screenshot node")
print("3. Update Screenshot URL: Uses $json.fileName for consistency")
