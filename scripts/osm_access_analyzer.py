"""
OSM Access Analyzer
Analyzes road access and landlocked status using OpenStreetMap data.

Usage:
    python osm_access_analyzer.py --help
    python osm_access_analyzer.py --property-id <uuid>
    python osm_access_analyzer.py --county Blair --state PA --limit 10
    python osm_access_analyzer.py --latitude 40.123 --longitude -78.456

This script queries OpenStreetMap Overpass API to determine:
1. Is the property landlocked?
2. What type of road access (public/private/easement)?
3. Distance to nearest public road
"""

import argparse
import requests
import math
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Supabase Configuration
SUPABASE_URL = "https://oiiwlzobizftprqspbzt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"

# Overpass API Configuration
OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
SEARCH_RADIUS_METERS = 500  # Search for roads within 500m

# Road access types (from OSM highway tags)
PUBLIC_ROAD_TYPES = [
    'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
    'unclassified', 'residential', 'motorway_link', 'trunk_link',
    'primary_link', 'secondary_link', 'tertiary_link'
]

PRIVATE_ROAD_TYPES = ['private', 'driveway']
SERVICE_ROAD_TYPES = ['service']


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth (in meters).

    Args:
        lat1, lon1: Coordinates of first point
        lat2, lon2: Coordinates of second point

    Returns:
        Distance in meters
    """
    R = 6371000  # Earth's radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def query_overpass_api(latitude: float, longitude: float, radius: int = SEARCH_RADIUS_METERS) -> Dict:
    """
    Query Overpass API for roads near the given coordinates.

    Args:
        latitude: Property latitude
        longitude: Property longitude
        radius: Search radius in meters

    Returns:
        Dict containing OSM data
    """
    # Overpass QL query to find all highways (roads) within radius
    overpass_query = f"""
    [out:json][timeout:25];
    (
      way["highway"](around:{radius},{latitude},{longitude});
    );
    out body;
    >;
    out skel qt;
    """

    try:
        response = requests.post(
            OVERPASS_API_URL,
            data={'data': overpass_query},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e), "elements": []}


def analyze_road_access(latitude: float, longitude: float) -> Dict:
    """
    Analyze road access for a property at given coordinates.

    Returns:
        Dict with:
        - landlocked: bool
        - road_access_type: str (public/private/service/none)
        - distance_to_public_road: float (meters)
        - nearest_road_name: str
        - road_types_nearby: list
    """
    osm_data = query_overpass_api(latitude, longitude)

    if "error" in osm_data:
        return {
            "landlocked": None,
            "road_access_type": "unknown",
            "distance_to_public_road": None,
            "nearest_road_name": None,
            "road_types_nearby": [],
            "error": osm_data["error"]
        }

    elements = osm_data.get("elements", [])

    # Separate nodes and ways
    nodes = {n['id']: n for n in elements if n['type'] == 'node'}
    ways = [w for w in elements if w['type'] == 'way']

    if not ways:
        # No roads found within radius - likely landlocked
        return {
            "landlocked": True,
            "road_access_type": "none",
            "distance_to_public_road": None,
            "nearest_road_name": None,
            "road_types_nearby": []
        }

    # Analyze each road
    public_roads = []
    private_roads = []
    service_roads = []

    for way in ways:
        highway_type = way.get('tags', {}).get('highway')
        if not highway_type:
            continue

        # Calculate distance to this road (using first node as approximation)
        way_nodes = way.get('nodes', [])
        if not way_nodes or way_nodes[0] not in nodes:
            continue

        node = nodes[way_nodes[0]]
        distance = haversine_distance(
            latitude, longitude,
            node['lat'], node['lon']
        )

        road_info = {
            'type': highway_type,
            'name': way.get('tags', {}).get('name', 'Unnamed'),
            'distance': distance,
            'access': way.get('tags', {}).get('access', 'public')
        }

        if highway_type in PUBLIC_ROAD_TYPES:
            public_roads.append(road_info)
        elif highway_type in PRIVATE_ROAD_TYPES:
            private_roads.append(road_info)
        elif highway_type in SERVICE_ROAD_TYPES:
            service_roads.append(road_info)

    # Determine access status
    if public_roads:
        nearest_public = min(public_roads, key=lambda x: x['distance'])
        return {
            "landlocked": False,
            "road_access_type": "public",
            "distance_to_public_road": round(nearest_public['distance'], 2),
            "nearest_road_name": nearest_public['name'],
            "road_types_nearby": list(set([r['type'] for r in public_roads]))
        }
    elif service_roads:
        nearest_service = min(service_roads, key=lambda x: x['distance'])
        return {
            "landlocked": False,
            "road_access_type": "service",
            "distance_to_public_road": round(nearest_service['distance'], 2),
            "nearest_road_name": nearest_service['name'],
            "road_types_nearby": list(set([r['type'] for r in service_roads]))
        }
    elif private_roads:
        nearest_private = min(private_roads, key=lambda x: x['distance'])
        return {
            "landlocked": False,
            "road_access_type": "private",
            "distance_to_public_road": round(nearest_private['distance'], 2),
            "nearest_road_name": nearest_private['name'],
            "road_types_nearby": list(set([r['type'] for r in private_roads]))
        }
    else:
        # Roads found but none classified - treat as unknown
        return {
            "landlocked": None,
            "road_access_type": "unknown",
            "distance_to_public_road": None,
            "nearest_road_name": None,
            "road_types_nearby": []
        }


def update_neighborhood_analysis(property_id: str, access_data: Dict) -> bool:
    """
    Update or insert access analysis data into neighborhood_analysis table.

    Args:
        property_id: UUID of the property
        access_data: Dict containing landlocked and road access data

    Returns:
        bool: Success status
    """
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    # Prepare data for upsert
    data = {
        "property_id": property_id,
        "landlocked_status": access_data.get("landlocked"),
        "road_access_type": access_data.get("road_access_type"),
        "road_access_data": {
            "distance_to_public_road": access_data.get("distance_to_public_road"),
            "nearest_road_name": access_data.get("nearest_road_name"),
            "road_types_nearby": access_data.get("road_types_nearby", [])
        }
    }

    # Call the upsert function
    rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/upsert_neighborhood_analysis"

    try:
        response = requests.post(rpc_url, headers=headers, json=data)
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"Error updating database: {e}")
        if hasattr(response, 'text'):
            print(f"Response: {response.text}")
        return False


def get_property_coordinates(property_id: str) -> Optional[Tuple[float, float]]:
    """
    Get property coordinates from the database.

    Args:
        property_id: UUID of the property

    Returns:
        Tuple of (latitude, longitude) or None if not found
    """
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }

    # First check regrid_data table for coordinates
    regrid_url = f"{SUPABASE_URL}/rest/v1/regrid_data"
    params = {
        "property_id": f"eq.{property_id}",
        "select": "latitude,longitude"
    }

    try:
        response = requests.get(regrid_url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        if data and data[0].get('latitude') and data[0].get('longitude'):
            return (data[0]['latitude'], data[0]['longitude'])
    except requests.RequestException:
        pass

    # Fallback: check properties table for address to geocode
    # (This would require a geocoding service - not implemented yet)

    return None


def get_properties_needing_access_analysis(county_name: str = "Blair", state_code: str = "PA", limit: int = 10) -> List[Dict]:
    """
    Get properties that need access analysis.

    Args:
        county_name: County name
        state_code: State code (2 letters)
        limit: Maximum number of properties to return

    Returns:
        List of property dicts
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

    try:
        response = requests.get(county_url, headers=headers, params=params)
        response.raise_for_status()
        county_data = response.json()

        if not county_data:
            return []

        county_id = county_data[0]["id"]

        # Get properties with regrid data but no access analysis
        query_url = f"{SUPABASE_URL}/rest/v1/regrid_data"
        params = {
            "select": "property_id,latitude,longitude,properties!inner(parcel_id,property_address)",
            "latitude": "not.is.null",
            "longitude": "not.is.null",
            "limit": limit
        }

        response = requests.get(query_url, headers=headers, params=params)
        response.raise_for_status()

        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching properties: {e}")
        return []


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Analyze road access and landlocked status using OpenStreetMap data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze a specific property by ID
  python osm_access_analyzer.py --property-id 550e8400-e29b-41d4-a716-446655440000

  # Analyze by coordinates
  python osm_access_analyzer.py --latitude 40.5186 --longitude -78.3947

  # Batch analyze properties in a county
  python osm_access_analyzer.py --county Blair --state PA --limit 10

  # Get list of properties needing analysis
  python osm_access_analyzer.py --list-pending --county Blair --state PA
        """
    )

    parser.add_argument('--property-id', help='Property UUID to analyze')
    parser.add_argument('--latitude', type=float, help='Property latitude')
    parser.add_argument('--longitude', type=float, help='Property longitude')
    parser.add_argument('--county', default='Blair', help='County name (default: Blair)')
    parser.add_argument('--state', default='PA', help='State code (default: PA)')
    parser.add_argument('--limit', type=int, default=10, help='Number of properties to process (default: 10)')
    parser.add_argument('--list-pending', action='store_true', help='List properties needing analysis')

    args = parser.parse_args()

    # Mode 1: List pending properties
    if args.list_pending:
        properties = get_properties_needing_access_analysis(args.county, args.state, args.limit)
        print(f"\nFound {len(properties)} properties needing access analysis in {args.county}, {args.state}:\n")
        for prop in properties:
            print(f"  Property ID: {prop['property_id']}")
            print(f"  Parcel: {prop['properties']['parcel_id']}")
            print(f"  Address: {prop['properties']['property_address']}")
            print(f"  Coordinates: {prop['latitude']}, {prop['longitude']}\n")
        return

    # Mode 2: Analyze specific property by ID
    if args.property_id:
        coords = get_property_coordinates(args.property_id)
        if not coords:
            print(f"Error: Could not find coordinates for property {args.property_id}")
            print("Make sure the property has Regrid data with latitude/longitude.")
            return

        latitude, longitude = coords
        print(f"\nAnalyzing property {args.property_id}")
        print(f"Coordinates: {latitude}, {longitude}\n")

        access_data = analyze_road_access(latitude, longitude)

        print("Access Analysis Results:")
        print(f"  Landlocked: {access_data['landlocked']}")
        print(f"  Road Access Type: {access_data['road_access_type']}")
        print(f"  Distance to Public Road: {access_data['distance_to_public_road']}m")
        print(f"  Nearest Road: {access_data['nearest_road_name']}")
        print(f"  Road Types Nearby: {', '.join(access_data['road_types_nearby'])}")

        if 'error' in access_data:
            print(f"  Error: {access_data['error']}")

        # Update database
        if update_neighborhood_analysis(args.property_id, access_data):
            print("\n✓ Database updated successfully")
        else:
            print("\n✗ Failed to update database")

        return

    # Mode 3: Analyze by coordinates
    if args.latitude and args.longitude:
        print(f"\nAnalyzing coordinates: {args.latitude}, {args.longitude}\n")

        access_data = analyze_road_access(args.latitude, args.longitude)

        print("Access Analysis Results:")
        print(f"  Landlocked: {access_data['landlocked']}")
        print(f"  Road Access Type: {access_data['road_access_type']}")
        print(f"  Distance to Public Road: {access_data['distance_to_public_road']}m")
        print(f"  Nearest Road: {access_data['nearest_road_name']}")
        print(f"  Road Types Nearby: {', '.join(access_data['road_types_nearby'])}")

        if 'error' in access_data:
            print(f"  Error: {access_data['error']}")

        return

    # Mode 4: Batch process properties
    print(f"\nFetching {args.limit} properties from {args.county}, {args.state}...\n")
    properties = get_properties_needing_access_analysis(args.county, args.state, args.limit)

    if not properties:
        print("No properties found needing access analysis.")
        return

    print(f"Processing {len(properties)} properties...\n")

    for i, prop in enumerate(properties, 1):
        property_id = prop['property_id']
        latitude = prop['latitude']
        longitude = prop['longitude']
        parcel_id = prop['properties']['parcel_id']

        print(f"[{i}/{len(properties)}] {parcel_id}")

        access_data = analyze_road_access(latitude, longitude)

        if 'error' in access_data:
            print(f"  ✗ Error: {access_data['error']}")
            continue

        print(f"  Landlocked: {access_data['landlocked']} | Access: {access_data['road_access_type']}")

        if update_neighborhood_analysis(property_id, access_data):
            print(f"  ✓ Updated")
        else:
            print(f"  ✗ Failed to update")

        print()


if __name__ == "__main__":
    main()
