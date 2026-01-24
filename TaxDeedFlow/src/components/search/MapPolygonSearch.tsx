"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import type { Coordinate } from "@/types/search"

// Dynamically import the map to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const FeatureGroup = dynamic(
  () => import("react-leaflet").then((mod) => mod.FeatureGroup),
  { ssr: false }
)

// Import Leaflet CSS
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"

interface MapPolygonSearchProps {
  /** Callback when polygon is drawn with coordinates */
  onPolygonDrawn: (coordinates: Coordinate[]) => void
  /** Property count inside the drawn polygon */
  propertyCount?: number
  /** Initial center coordinates [lat, lng] */
  center?: [number, number]
  /** Initial zoom level */
  zoom?: number
  /** Optional className for styling */
  className?: string
}

/**
 * Map component with polygon drawing tools for geographic property search
 *
 * Features:
 * - Interactive map with drawing controls
 * - Polygon drawing tool for area selection
 * - Extracts coordinates for backend filtering
 * - Shows property count inside drawn polygon
 * - Edit and delete drawn polygons
 *
 * @example
 * ```tsx
 * <MapPolygonSearch
 *   onPolygonDrawn={(coords) => handleSearch(coords)}
 *   propertyCount={42}
 *   center={[40.5186, -78.3947]}
 *   zoom={8}
 * />
 * ```
 */
export function MapPolygonSearch({
  onPolygonDrawn,
  propertyCount = 0,
  center = [39.8283, -98.5795], // Center of US
  zoom = 5,
  className = "",
}: MapPolygonSearchProps) {
  const [isClient, setIsClient] = useState(false)
  const [drawControl, setDrawControl] = useState<any>(null)
  const featureGroupRef = useRef<any>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Dynamically import Leaflet Draw after client-side mount
    import("leaflet-draw").then(() => {
      import("leaflet").then((L) => {
        if (featureGroupRef.current) {
          // Create draw control
          const drawControlInstance = new (L as any).Control.Draw({
            position: "topright",
            draw: {
              polygon: {
                allowIntersection: false,
                showArea: true,
                metric: ["km", "m"],
                feet: false,
                shapeOptions: {
                  color: "#3b82f6",
                  weight: 2,
                  fillOpacity: 0.2,
                },
              },
              polyline: false,
              rectangle: {
                shapeOptions: {
                  color: "#3b82f6",
                  weight: 2,
                  fillOpacity: 0.2,
                },
              },
              circle: false,
              circlemarker: false,
              marker: false,
            },
            edit: {
              featureGroup: featureGroupRef.current,
              remove: true,
              edit: true,
            },
          })

          setDrawControl(drawControlInstance)
        }
      })
    })
  }, [isClient])

  // Handle draw events
  useEffect(() => {
    if (!isClient || !featureGroupRef.current) return

    const featureGroup = featureGroupRef.current

    // Listen for polygon creation
    const handleCreated = (e: any) => {
      const layer = e.layer
      featureGroup.clearLayers() // Clear previous polygons
      featureGroup.addLayer(layer)

      // Extract coordinates
      const latLngs = layer.getLatLngs()[0] // Get outer ring
      const coordinates: Coordinate[] = latLngs.map((latLng: any) => [
        latLng.lat,
        latLng.lng,
      ])

      // Emit coordinates
      onPolygonDrawn(coordinates)
    }

    // Listen for polygon edit
    const handleEdited = (e: any) => {
      const layers = e.layers
      layers.eachLayer((layer: any) => {
        const latLngs = layer.getLatLngs()[0]
        const coordinates: Coordinate[] = latLngs.map((latLng: any) => [
          latLng.lat,
          latLng.lng,
        ])
        onPolygonDrawn(coordinates)
      })
    }

    // Listen for polygon deletion
    const handleDeleted = () => {
      onPolygonDrawn([]) // Clear polygon
    }

    const map = featureGroup._map
    if (map) {
      map.on("draw:created", handleCreated)
      map.on("draw:edited", handleEdited)
      map.on("draw:deleted", handleDeleted)

      return () => {
        map.off("draw:created", handleCreated)
        map.off("draw:edited", handleEdited)
        map.off("draw:deleted", handleDeleted)
      }
    }
  }, [isClient, onPolygonDrawn])

  // Add draw control to map
  useEffect(() => {
    if (!isClient || !drawControl || !featureGroupRef.current) return

    const map = featureGroupRef.current._map
    if (map && !map.hasControl?.(drawControl)) {
      map.addControl(drawControl)

      return () => {
        map.removeControl(drawControl)
      }
    }
  }, [isClient, drawControl])

  if (!isClient) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-slate-500 text-sm">Loading map...</div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      {/* Property count badge */}
      {propertyCount > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-slate-200">
          <div className="text-sm font-medium text-slate-900">
            {propertyCount} {propertyCount === 1 ? "property" : "properties"} found
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", minHeight: "500px" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup ref={featureGroupRef} />
      </MapContainer>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-slate-200">
        <div className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">Draw a polygon:</span> Use the square or polygon tool in the top right to draw an area on the map. Properties within the area will be filtered.
        </div>
      </div>
    </div>
  )
}
