"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import the map to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// Import Leaflet CSS
import "leaflet/dist/leaflet.css"

interface PropertyMapProps {
  latitude: number
  longitude: number
  address: string
  parcelId: string
  totalDue?: number
  className?: string
}

export function PropertyMap({
  latitude,
  longitude,
  address,
  parcelId,
  totalDue,
  className = "",
}: PropertyMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [icon, setIcon] = useState<L.Icon | null>(null)

  useEffect(() => {
    setIsClient(true)
    // Create custom icon after client-side mount
    import("leaflet").then((L) => {
      const customIcon = new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
      setIcon(customIcon)
    })
  }, [])

  if (!isClient || !icon) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-slate-500 text-sm">Loading map...</div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: "100%", width: "100%", minHeight: "300px" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={icon}>
          <Popup>
            <div className="p-1">
              <div className="font-semibold text-slate-900">{parcelId}</div>
              <div className="text-sm text-slate-600">{address}</div>
              {totalDue && (
                <div className="text-sm font-medium text-primary mt-1">
                  Total Due: ${totalDue.toLocaleString()}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
