'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PinWithPhotos } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom zoom control component - REMOVED
// function CustomZoomControl() {
//   const map = useMap()
//   
//   const zoomIn = () => map.zoomIn()
//   const zoomOut = () => map.zoomOut()
//   
//   return (
//     <div className="absolute top-20 right-4 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200">
//       <button
//         onClick={zoomIn}
//         className="block w-10 h-10 text-gray-700 hover:bg-gray-100 border-b border-gray-200 rounded-t-lg transition-colors duration-200"
//         title="Zoom in"
//       >
//         +
//       </button>
//       <button
//         onClick={zoomOut}
//         className="block w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-b-lg transition-colors duration-200"
//         title="Zoom out"
//       >
//         −
//       </button>
//     </div>
//   )
// }

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void
  isAdmin: boolean
}

function MapClickHandler({ onMapClick, isAdmin }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      if (isAdmin) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

interface OkinawaMapComponentProps {
  onPinClick: (pin: PinWithPhotos) => void
  onAddPin: (lat: number, lng: number) => void
  isAdmin: boolean
}

export default function OkinawaMapComponent({ onPinClick, onAddPin, isAdmin }: OkinawaMapComponentProps) {
  const [pins, setPins] = useState<PinWithPhotos[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPins()
  }, [])

  const fetchPins = async () => {
    try {
      const { data: pinsData, error } = await supabase
        .from('pins')
        .select(`
          *,
          photos (*)
        `)
        .order('created_at', { ascending: false })

      // Sort photos by order_index for each pin
      if (pinsData) {
        pinsData.forEach((pin: any) => {
          if (pin.photos && Array.isArray(pin.photos)) {
            pin.photos.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          }
        })
      }

      if (error) {
        console.error('Supabase error:', error)
        // Set empty pins array on error, but don't fail completely
        setPins([])
      } else {
        setPins(pinsData || [])
      }
    } catch (error) {
      console.error('Error fetching pins:', error)
      // Set empty pins array on error, but don't fail completely
      setPins([])
    } finally {
      setLoading(false)
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    onAddPin(lat, lng)
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg">Loading map...</div>
      </div>
    )
  }

    return (
    <div className="relative w-full h-screen">
      <MapContainer
        center={[26.65, 127.9764]}
        zoom={9}
        className="w-full h-screen"
        zoomControl={false}
        scrollWheelZoom={true}
      >
        {/* Pure satellite imagery - no obstructing tile layers */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={19}
        />

        <MapClickHandler onMapClick={handleMapClick} isAdmin={isAdmin} />
        
        {/* Custom zoom control removed */}
        
        {/* All custom city labels removed for clean map */}

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            eventHandlers={{
              click: () => onPinClick(pin),
            }}
          >
            <Popup>
              <div className="text-center">
                <h3 className="font-bold text-lg">{pin.title}</h3>
                <p className="text-sm text-gray-600">{pin.description}</p>
                <div className="flex justify-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < pin.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
} 