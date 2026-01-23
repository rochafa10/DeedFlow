"""
Neighborhood Enrichment Orchestrator
Comprehensive neighborhood analysis including crime, demographics, access, schools, and amenities.

Usage:
    python neighborhood_enrichment.py --help
    python neighborhood_enrichment.py --property-id <uuid>
    python neighborhood_enrichment.py --county Blair --state PA --limit 10
    python neighborhood_enrichment.py --property-id test-uuid --dry-run

This script orchestrates multiple data sources to create a complete neighborhood profile:
1. Crime statistics (FBI Crime Data API - state level)
2. Demographics (Census API - county level)
3. Road access analysis (OpenStreetMap via osm_access_analyzer.py)
4. School ratings (placeholder for future API integration)
5. Amenity distances (OpenStreetMap POI data)
6. Comprehensive neighborhood score calculation
"""

import argparse
import requests
import math
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# Add scripts directory to path to import osm_access_analyzer
sys.path.insert(0, str(Path(__file__).parent))
from osm_access_analyzer import analyze_road_access, get_property_coordinates

# Supabase Configuration
SUPABASE_URL = "https://oiiwlzobizftprqspbzt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9paXdsem9iaXpmdHBycXNwYnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNDc4MzUsImV4cCI6MjA3MDYyMzgzNX0.idwK7IxweMNK64lOGZlWUFV9pA9zljZmZY65rAiDFzg"

# FBI Crime API Configuration
FBI_API_BASE = "https://api.usa.gov/crime/fbi/cde"
FBI_API_KEY = ""  # Public API - key optional

# Census API Configuration
CENSUS_GEO_API = "https://geocoding.geo.census.gov"
CENSUS_DATA_API = "https://api.census.gov/data"
CENSUS_API_KEY = ""  # Optional for most endpoints

# Overpass API for amenities
OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"

# State FIPS codes
STATE_FIPS = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09', 'DE': '10',
    'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20',
    'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
    'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36',
    'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
    'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
    'WI': '55', 'WY': '56', 'DC': '11',
}

# National crime rate averages (per 100,000 population, 2022)
NATIONAL_CRIME_AVERAGES = {
    'violent_crime_rate': 380,
    'property_crime_rate': 1954,
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth (in meters).
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


def meters_to_miles(meters: float) -> float:
    """Convert meters to miles."""
    return meters * 0.000621371


def fetch_crime_statistics(state_code: str) -> Optional[Dict]:
    """
    Fetch state-level crime statistics from FBI Crime Data API.

    Args:
        state_code: Two-letter state code (e.g., 'PA')

    Returns:
        Dict with crime statistics or None if unavailable
    """
    state_code = state_code.upper()
    if state_code not in STATE_FIPS:
        return None

    current_year = datetime.now().year
    from_year = current_year - 5

    endpoint = f"{FBI_API_BASE}/estimates/states/{state_code}"
    params = {
        'from': from_year,
        'to': current_year - 1,  # Data lags by 1-2 years
    }

    if FBI_API_KEY:
        params['api_key'] = FBI_API_KEY

    try:
        response = requests.get(endpoint, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        results = data.get('results', [])
        if not results:
            return None

        # Get most recent year
        latest = results[-1]
        population = latest.get('population', 1)

        violent_crime = latest.get('violent_crime', 0)
        property_crime = latest.get('property_crime', 0)

        violent_crime_rate = (violent_crime / population) * 100000 if population > 0 else 0
        property_crime_rate = (property_crime / population) * 100000 if population > 0 else 0

        # Calculate safety rating (0-10 scale, inverse of crime rate)
        # Lower crime = higher safety score
        violent_ratio = violent_crime_rate / NATIONAL_CRIME_AVERAGES['violent_crime_rate']
        property_ratio = property_crime_rate / NATIONAL_CRIME_AVERAGES['property_crime_rate']
        avg_ratio = (violent_ratio + property_ratio) / 2

        # Convert to 0-10 safety score (higher is safer)
        # If ratio is 0.5 (half national avg) = 10/10 safety
        # If ratio is 1.0 (national avg) = 5/10 safety
        # If ratio is 2.0 (double national avg) = 0/10 safety
        safety_rating = max(0, min(10, 10 - (avg_ratio * 5)))

        return {
            'violent_crime_rate': round(violent_crime_rate, 2),
            'property_crime_rate': round(property_crime_rate, 2),
            'safety_rating': round(safety_rating, 2),
            'data_year': latest.get('year'),
            'state_name': latest.get('state_name'),
            'population': population,
        }
    except requests.RequestException as e:
        return None


def fetch_demographics(latitude: float, longitude: float) -> Optional[Dict]:
    """
    Fetch county-level demographics from Census API.

    Args:
        latitude: Property latitude
        longitude: Property longitude

    Returns:
        Dict with demographics or None if unavailable
    """
    # Step 1: Get FIPS code from coordinates
    geo_endpoint = f"{CENSUS_GEO_API}/geocoder/geographies/coordinates"
    geo_params = {
        'x': longitude,
        'y': latitude,
        'benchmark': 'Public_AR_Current',
        'vintage': 'Current_Current',
        'layers': 'all',
        'format': 'json',
    }

    try:
        geo_response = requests.get(geo_endpoint, params=geo_params, timeout=30)
        geo_response.raise_for_status()
        geo_data = geo_response.json()

        geographies = geo_data.get('result', {}).get('geographies', {})
        counties = geographies.get('Counties', []) or geographies.get('2020 Census Counties', [])
        states = geographies.get('States', []) or geographies.get('2020 Census State', [])

        if not counties or not states:
            return None

        state_fips = states[0].get('STATE', '')
        county_fips = counties[0].get('COUNTY', '')
        county_name = counties[0].get('NAME', '')

        # Step 2: Fetch ACS demographic data
        # Try years in order (most recent first)
        for year in [2023, 2022, 2021]:
            acs_endpoint = f"{CENSUS_DATA_API}/{year}/acs/acs5"

            variables = [
                'NAME',
                'B01003_001E',  # Total Population
                'B19013_001E',  # Median Household Income
                'B17001_002E',  # Population Below Poverty Level
                'B01002_001E',  # Median Age
                'B15003_022E',  # Bachelor's Degree
            ]

            acs_params = {
                'get': ','.join(variables),
                'for': f'county:{county_fips}',
                'in': f'state:{state_fips}',
            }

            if CENSUS_API_KEY:
                acs_params['key'] = CENSUS_API_KEY

            try:
                acs_response = requests.get(acs_endpoint, params=acs_params, timeout=30)
                acs_response.raise_for_status()
                acs_data = acs_response.json()

                if len(acs_data) < 2:
                    continue  # Try next year

                headers = acs_data[0]
                values = acs_data[1]

                # Create header index map
                header_map = {header: idx for idx, header in enumerate(headers)}

                def get_value(var: str, default=0):
                    idx = header_map.get(var)
                    if idx is None:
                        return default
                    try:
                        val = float(values[idx])
                        return val if val >= 0 else default
                    except (ValueError, IndexError):
                        return default

                population = get_value('B01003_001E')
                median_income = get_value('B19013_001E')
                poverty_pop = get_value('B17001_002E')
                median_age = get_value('B01002_001E')
                bachelors = get_value('B15003_022E')

                poverty_rate = (poverty_pop / population * 100) if population > 0 else 0
                education_level = (bachelors / (population * 0.75) * 100) if population > 0 else 0

                return {
                    'population': int(population),
                    'median_income': int(median_income),
                    'poverty_rate': round(poverty_rate, 2),
                    'median_age': round(median_age, 1),
                    'education_level': round(min(100, education_level), 2),
                    'county_name': county_name,
                    'data_year': year,
                }
            except requests.RequestException:
                continue  # Try next year

        return None  # All years failed
    except requests.RequestException:
        return None


def fetch_amenity_distances(latitude: float, longitude: float) -> Optional[Dict]:
    """
    Fetch distances to key amenities using OpenStreetMap Overpass API.

    Args:
        latitude: Property latitude
        longitude: Property longitude

    Returns:
        Dict with amenity distances in miles
    """
    # Define amenity types to search for
    amenity_queries = {
        'grocery': 'node["shop"="supermarket"](around:8000,{lat},{lon});',
        'hospital': 'node["amenity"="hospital"](around:16000,{lat},{lon});',
        'shopping': 'node["shop"="mall"](around:16000,{lat},{lon});',
        'park': 'node["leisure"="park"](around:8000,{lat},{lon});',
        'school': 'node["amenity"="school"](around:8000,{lat},{lon});',
    }

    distances = {}

    for amenity_type, query_template in amenity_queries.items():
        query = query_template.format(lat=latitude, lon=longitude)
        overpass_query = f"""
        [out:json][timeout:25];
        (
          {query}
        );
        out body;
        """

        try:
            response = requests.post(
                OVERPASS_API_URL,
                data={'data': overpass_query},
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            elements = data.get('elements', [])
            if elements:
                # Find nearest amenity
                min_distance = float('inf')
                for element in elements:
                    elem_lat = element.get('lat')
                    elem_lon = element.get('lon')
                    if elem_lat and elem_lon:
                        distance_meters = haversine_distance(latitude, longitude, elem_lat, elem_lon)
                        min_distance = min(min_distance, distance_meters)

                if min_distance != float('inf'):
                    distances[f'{amenity_type}_mi'] = round(meters_to_miles(min_distance), 2)
                else:
                    distances[f'{amenity_type}_mi'] = None
            else:
                distances[f'{amenity_type}_mi'] = None

        except requests.RequestException:
            distances[f'{amenity_type}_mi'] = None

    return distances


def calculate_neighborhood_score(
    crime_stats: Optional[Dict],
    demographics: Optional[Dict],
    access_data: Optional[Dict],
    amenity_distances: Optional[Dict]
) -> Dict:
    """
    Calculate comprehensive neighborhood score and component scores.

    Returns:
        Dict with neighborhood_score, safety_score, walkability_score, access_score
    """
    scores = {
        'neighborhood_score': None,
        'safety_score': None,
        'walkability_score': None,
        'school_score': None,
        'access_score': None,
    }

    # Safety Score (0-10 based on crime data)
    if crime_stats:
        scores['safety_score'] = crime_stats.get('safety_rating', 5.0)

    # Access Score (0-10 based on road access)
    if access_data:
        landlocked = access_data.get('landlocked', False)
        road_type = access_data.get('road_access_type', 'unknown')

        if landlocked or road_type == 'none':
            scores['access_score'] = 0.0
        elif road_type == 'public':
            scores['access_score'] = 10.0
        elif road_type == 'service':
            scores['access_score'] = 7.0
        elif road_type == 'private':
            scores['access_score'] = 5.0
        else:
            scores['access_score'] = 5.0

    # Walkability Score (0-10 based on amenity distances)
    if amenity_distances:
        # Score based on average distance to amenities
        # < 1 mile = excellent (10)
        # 1-3 miles = good (7)
        # 3-5 miles = moderate (5)
        # 5-10 miles = poor (3)
        # > 10 miles = very poor (1)

        valid_distances = [
            d for d in amenity_distances.values()
            if d is not None and isinstance(d, (int, float))
        ]

        if valid_distances:
            avg_distance = sum(valid_distances) / len(valid_distances)

            if avg_distance < 1:
                scores['walkability_score'] = 10.0
            elif avg_distance < 3:
                scores['walkability_score'] = 7.0
            elif avg_distance < 5:
                scores['walkability_score'] = 5.0
            elif avg_distance < 10:
                scores['walkability_score'] = 3.0
            else:
                scores['walkability_score'] = 1.0

    # Overall Neighborhood Score (weighted average)
    component_scores = []
    weights = []

    if scores['safety_score'] is not None:
        component_scores.append(scores['safety_score'])
        weights.append(0.35)  # Safety is 35%

    if scores['access_score'] is not None:
        component_scores.append(scores['access_score'])
        weights.append(0.30)  # Access is 30%

    if scores['walkability_score'] is not None:
        component_scores.append(scores['walkability_score'])
        weights.append(0.20)  # Walkability is 20%

    if scores['school_score'] is not None:
        component_scores.append(scores['school_score'])
        weights.append(0.15)  # Schools are 15%

    if component_scores:
        total_weight = sum(weights)
        weighted_sum = sum(score * weight for score, weight in zip(component_scores, weights))
        scores['neighborhood_score'] = round(weighted_sum / total_weight, 2)

    # Round all scores
    for key in scores:
        if scores[key] is not None:
            scores[key] = round(scores[key], 2)

    return scores


def calculate_data_completeness(
    crime_stats: Optional[Dict],
    demographics: Optional[Dict],
    access_data: Optional[Dict],
    amenity_distances: Optional[Dict],
    school_ratings: Optional[Dict]
) -> float:
    """Calculate percentage of data fields populated (0.00 to 1.00)."""
    total_sections = 5
    populated_sections = 0

    if crime_stats:
        populated_sections += 1
    if demographics:
        populated_sections += 1
    if access_data:
        populated_sections += 1
    if amenity_distances and any(v is not None for v in amenity_distances.values()):
        populated_sections += 1
    if school_ratings:
        populated_sections += 1

    return round(populated_sections / total_sections, 2)


def store_neighborhood_analysis(
    property_id: str,
    crime_stats: Optional[Dict],
    demographics: Optional[Dict],
    access_data: Optional[Dict],
    amenity_distances: Optional[Dict],
    school_ratings: Optional[Dict],
    scores: Dict,
    data_completeness: float
) -> bool:
    """
    Store neighborhood analysis in the database.

    Args:
        property_id: UUID of the property
        crime_stats: Crime statistics dict
        demographics: Demographics dict
        access_data: Road access analysis dict
        amenity_distances: Amenity distances dict
        school_ratings: School ratings dict (placeholder)
        scores: Calculated scores dict
        data_completeness: Data completeness percentage

    Returns:
        bool: Success status
    """
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }

    # Convert distance from meters to feet if present
    distance_to_public_road_ft = None
    if access_data and access_data.get('distance_to_public_road'):
        distance_to_public_road_ft = round(access_data['distance_to_public_road'] * 3.28084, 2)

    # Build road access data
    road_access_data = None
    if access_data:
        road_access_data = {
            'distance_to_public_road': access_data.get('distance_to_public_road'),
            'nearest_road_name': access_data.get('nearest_road_name'),
            'road_types_nearby': access_data.get('road_types_nearby', [])
        }

    # Prepare data for upsert function
    data = {
        'p_property_id': property_id,
        'p_crime_statistics': crime_stats,
        'p_crime_data_source': 'fbi_ucr' if crime_stats else None,
        'p_demographics': demographics,
        'p_demographics_source': 'census_acs' if demographics else None,
        'p_landlocked_status': access_data.get('landlocked', False) if access_data else False,
        'p_road_access_type': access_data.get('road_access_type') if access_data else None,
        'p_distance_to_public_road_ft': distance_to_public_road_ft,
        'p_access_notes': f"Analysis via OpenStreetMap. Road access data: {road_access_data}" if road_access_data else None,
        'p_school_ratings': school_ratings,
        'p_school_data_source': None,  # Placeholder for future integration
        'p_amenity_distances': amenity_distances,
        'p_amenity_data_source': 'osm' if amenity_distances else None,
        'p_neighborhood_score': scores.get('neighborhood_score'),
        'p_safety_score': scores.get('safety_score'),
        'p_walkability_score': scores.get('walkability_score'),
        'p_school_score': scores.get('school_score'),
        'p_access_score': scores.get('access_score'),
        'p_data_completeness': data_completeness,
        'p_analysis_confidence': data_completeness,  # Use completeness as confidence proxy
    }

    # Call the upsert function
    rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/upsert_neighborhood_analysis"

    try:
        response = requests.post(rpc_url, headers=headers, json=data)
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        return False


def enrich_property(property_id: str, dry_run: bool = False) -> Dict:
    """
    Run complete neighborhood enrichment for a single property.

    Args:
        property_id: UUID of the property
        dry_run: If True, don't store results in database

    Returns:
        Dict with enrichment results
    """
    result = {
        'property_id': property_id,
        'success': False,
        'error': None,
        'data': {}
    }

    # Get property coordinates
    coords = get_property_coordinates(property_id)
    if not coords:
        result['error'] = "Could not find property coordinates. Ensure property has Regrid data."
        return result

    latitude, longitude = coords

    # Get state code from database
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }

    props_url = f"{SUPABASE_URL}/rest/v1/properties"
    params = {
        "id": f"eq.{property_id}",
        "select": "state_code"
    }

    try:
        response = requests.get(props_url, headers=headers, params=params)
        response.raise_for_status()
        prop_data = response.json()
        if not prop_data:
            result['error'] = "Property not found in database"
            return result
        state_code = prop_data[0].get('state_code', 'PA')
    except requests.RequestException:
        state_code = 'PA'  # Default fallback

    # Fetch all data sources
    crime_stats = fetch_crime_statistics(state_code)
    demographics = fetch_demographics(latitude, longitude)
    access_data = analyze_road_access(latitude, longitude)
    amenity_distances = fetch_amenity_distances(latitude, longitude)
    school_ratings = None  # Placeholder for future school API integration

    # Calculate scores
    scores = calculate_neighborhood_score(crime_stats, demographics, access_data, amenity_distances)
    data_completeness = calculate_data_completeness(
        crime_stats, demographics, access_data, amenity_distances, school_ratings
    )

    # Store results (unless dry run)
    if not dry_run:
        success = store_neighborhood_analysis(
            property_id,
            crime_stats,
            demographics,
            access_data,
            amenity_distances,
            school_ratings,
            scores,
            data_completeness
        )
        result['success'] = success
    else:
        result['success'] = True  # Dry run always succeeds if we got here

    result['data'] = {
        'coordinates': {'latitude': latitude, 'longitude': longitude},
        'crime_statistics': crime_stats,
        'demographics': demographics,
        'access_data': access_data,
        'amenity_distances': amenity_distances,
        'school_ratings': school_ratings,
        'scores': scores,
        'data_completeness': data_completeness,
    }

    return result


def get_properties_needing_enrichment(county_name: str = "Blair", state_code: str = "PA", limit: int = 10) -> List[Dict]:
    """
    Get properties that need neighborhood enrichment.

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

        # Call the helper function to get properties needing analysis
        rpc_url = f"{SUPABASE_URL}/rest/v1/rpc/get_properties_needing_neighborhood_analysis"
        rpc_data = {
            "p_county_id": county_id,
            "p_limit": limit
        }

        response = requests.post(rpc_url, headers=headers, json=rpc_data)
        response.raise_for_status()

        return response.json()
    except requests.RequestException as e:
        return []


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Comprehensive neighborhood enrichment orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Enrich a specific property by ID
  python neighborhood_enrichment.py --property-id 550e8400-e29b-41d4-a716-446655440000

  # Dry run (don't store results)
  python neighborhood_enrichment.py --property-id test-uuid --dry-run

  # Batch enrich properties in a county
  python neighborhood_enrichment.py --county Blair --state PA --limit 10

  # Get list of properties needing enrichment
  python neighborhood_enrichment.py --list-pending --county Blair --state PA
        """
    )

    parser.add_argument('--property-id', help='Property UUID to enrich')
    parser.add_argument('--county', default='Blair', help='County name (default: Blair)')
    parser.add_argument('--state', default='PA', help='State code (default: PA)')
    parser.add_argument('--limit', type=int, default=10, help='Number of properties to process (default: 10)')
    parser.add_argument('--list-pending', action='store_true', help='List properties needing enrichment')
    parser.add_argument('--dry-run', action='store_true', help='Dry run - don\'t store results')

    args = parser.parse_args()

    # Mode 1: List pending properties
    if args.list_pending:
        properties = get_properties_needing_enrichment(args.county, args.state, args.limit)
        print(f"\nFound {len(properties)} properties needing neighborhood enrichment in {args.county}, {args.state}:\n")
        for prop in properties:
            print(f"  Property ID: {prop['property_id']}")
            print(f"  Parcel: {prop['parcel_id']}")
            print(f"  Address: {prop['property_address']}")
            print(f"  Coordinates: {prop['latitude']}, {prop['longitude']}\n")
        return

    # Mode 2: Enrich specific property by ID
    if args.property_id:
        print(f"\n{'='*60}")
        print(f"Enriching property {args.property_id}")
        if args.dry_run:
            print("DRY RUN MODE - Results will not be stored")
        print(f"{'='*60}\n")

        result = enrich_property(args.property_id, args.dry_run)

        if result['error']:
            print(f"✗ Error: {result['error']}")
            return

        data = result['data']

        print("📍 Location:")
        coords = data.get('coordinates', {})
        print(f"  Coordinates: {coords.get('latitude')}, {coords.get('longitude')}\n")

        print("🚨 Crime Statistics:")
        crime = data.get('crime_statistics')
        if crime:
            print(f"  State: {crime.get('state_name')}")
            print(f"  Violent Crime Rate: {crime.get('violent_crime_rate')}/100k")
            print(f"  Property Crime Rate: {crime.get('property_crime_rate')}/100k")
            print(f"  Safety Rating: {crime.get('safety_rating')}/10")
            print(f"  Data Year: {crime.get('data_year')}")
        else:
            print("  No crime data available")
        print()

        print("👥 Demographics:")
        demo = data.get('demographics')
        if demo:
            print(f"  County: {demo.get('county_name')}")
            print(f"  Population: {demo.get('population'):,}")
            print(f"  Median Income: ${demo.get('median_income'):,}")
            print(f"  Poverty Rate: {demo.get('poverty_rate')}%")
            print(f"  Median Age: {demo.get('median_age')}")
            print(f"  Education Level: {demo.get('education_level')}%")
            print(f"  Data Year: {demo.get('data_year')}")
        else:
            print("  No demographic data available")
        print()

        print("🛣️  Road Access:")
        access = data.get('access_data')
        if access:
            landlocked = access.get('landlocked', False)
            print(f"  Landlocked: {'YES ⚠️' if landlocked else 'NO ✓'}")
            print(f"  Access Type: {access.get('road_access_type')}")
            print(f"  Nearest Public Road: {access.get('distance_to_public_road')}m")
            print(f"  Road Name: {access.get('nearest_road_name')}")
        else:
            print("  No access data available")
        print()

        print("🏪 Amenity Distances:")
        amenities = data.get('amenity_distances')
        if amenities:
            for amenity, distance in amenities.items():
                name = amenity.replace('_mi', '').replace('_', ' ').title()
                dist_str = f"{distance} miles" if distance else "Not found"
                print(f"  {name}: {dist_str}")
        else:
            print("  No amenity data available")
        print()

        print("📊 Scores:")
        scores = data.get('scores', {})
        print(f"  Overall Neighborhood Score: {scores.get('neighborhood_score', 'N/A')}/10")
        print(f"  Safety Score: {scores.get('safety_score', 'N/A')}/10")
        print(f"  Access Score: {scores.get('access_score', 'N/A')}/10")
        print(f"  Walkability Score: {scores.get('walkability_score', 'N/A')}/10")
        print(f"  School Score: {scores.get('school_score', 'N/A')}/10")
        print()

        print(f"Data Completeness: {data.get('data_completeness', 0) * 100:.0f}%")
        print()

        if result['success']:
            if args.dry_run:
                print("✓ Dry run completed successfully (no data stored)")
            else:
                print("✓ Neighborhood analysis stored successfully")
        else:
            print("✗ Failed to store neighborhood analysis")

        return

    # Mode 3: Batch process properties
    print(f"\nFetching {args.limit} properties from {args.county}, {args.state}...\n")
    properties = get_properties_needing_enrichment(args.county, args.state, args.limit)

    if not properties:
        print("No properties found needing neighborhood enrichment.")
        return

    print(f"Processing {len(properties)} properties...\n")

    for i, prop in enumerate(properties, 1):
        property_id = prop['property_id']
        parcel_id = prop['parcel_id']

        print(f"[{i}/{len(properties)}] {parcel_id}")

        result = enrich_property(property_id, args.dry_run)

        if result['error']:
            print(f"  ✗ Error: {result['error']}")
            continue

        scores = result['data'].get('scores', {})
        neighborhood_score = scores.get('neighborhood_score', 'N/A')

        print(f"  Neighborhood Score: {neighborhood_score}/10")

        if result['success']:
            print(f"  ✓ {'Analyzed (dry run)' if args.dry_run else 'Stored'}")
        else:
            print(f"  ✗ Failed to store")

        print()


if __name__ == "__main__":
    main()
