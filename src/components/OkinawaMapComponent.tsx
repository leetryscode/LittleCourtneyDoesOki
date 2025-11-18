'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
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

const CATEGORY_FILTERS = [
  { value: null, label: 'All' },
  { value: 'Beach', label: 'Beaches' },
  { value: 'Restaurant', label: 'Restaurants' },
  { value: 'Activity', label: 'Activities' },
  { value: 'View', label: 'Views' },
  { value: 'Historical', label: 'Historical' },
  { value: 'General', label: 'General' },
] as const

type CategoryValue = (typeof CATEGORY_FILTERS)[number]['value']

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
  isModalOpen?: boolean
}

export default function OkinawaMapComponent({ onPinClick, onAddPin, isAdmin, isModalOpen = false }: OkinawaMapComponentProps) {
  const [pins, setPins] = useState<PinWithPhotos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryValue | null>(null)

  useEffect(() => {
    fetchPins()
  }, [])

  const fetchPins = async () => {
    try {
      setError(null)
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
        setError('Failed to load locations. Please check your connection and try again.')
        setPins([])
      } else {
        setPins(pinsData || [])
      }
    } catch (error: any) {
      console.error('Error fetching pins:', error)
      const errorMessage = error.message?.includes('fetch') || error.message?.includes('network')
        ? 'Network error. Please check your internet connection and try again.'
        : 'Failed to load locations. Please try again later.'
      setError(errorMessage)
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

  if (error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 font-semibold mb-2">Error Loading Map</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchPins}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const visiblePins = selectedCategory
    ? pins.filter((pin) => {
        if (!pin.category) return false
        return pin.category.trim().toLowerCase() === selectedCategory.toLowerCase()
      })
    : pins

  const handleCategorySelect = (category: CategoryValue) => {
    if (category === null) {
      setSelectedCategory(null)
    } else {
      setSelectedCategory((current) =>
        current?.toLowerCase() === category.toLowerCase() ? null : category
      )
    }
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
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          maxZoom={19}
        />

        <MapClickHandler onMapClick={handleMapClick} isAdmin={isAdmin} />

        {visiblePins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            eventHandlers={{
              click: () => onPinClick(pin),
            }}
          />
        ))}
      </MapContainer>

      {!isModalOpen && (
        <CategoryFilterBar
          selectedCategory={selectedCategory}
          onSelect={handleCategorySelect}
        />
      )}
    </div>
  )
}

interface CategoryFilterBarProps {
  selectedCategory: CategoryValue | null
  onSelect: (category: CategoryValue) => void
}

function CategoryFilterBar({ selectedCategory, onSelect }: CategoryFilterBarProps) {
  return (
    <div className="pointer-events-none fixed z-40 flex justify-center" style={{ bottom: '1.5rem', left: '1.5rem', right: '1.5rem' }}>
      <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap justify-center" style={{ gap: '0.25rem' }}>
        {CATEGORY_FILTERS.map((category) => {
          const isActive =
            category.value === null
              ? selectedCategory === null
              : selectedCategory?.toLowerCase() === category.value.toLowerCase()

          return (
            <button
              key={category.value ?? 'all'}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(category.value)}
              className={`glass-button flex items-center justify-center ${isActive ? 'glass-button--active' : ''}`}
              style={{ 
                padding: '0.25rem 0.5rem', 
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.85)'
              }}
            >
              <span className="whitespace-nowrap">{category.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}