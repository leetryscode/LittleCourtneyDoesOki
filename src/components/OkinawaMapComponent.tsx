'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PinWithPhotos } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

// Fix for default markers in react-leaflet
type IconPrototype = typeof Icon.Default.prototype & {
  _getIconUrl?: () => string
}

const iconPrototype = Icon.Default.prototype as IconPrototype
delete iconPrototype._getIconUrl
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

// Component to ensure map is properly initialized and sized
function MapInitializer() {
  const map = useMap()
  
  useEffect(() => {
    // Ensure map is properly sized after initialization
    // This is critical for first load, especially when container becomes visible
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 100)
    
    // Also invalidate on window resize
    const handleResize = () => {
      map.invalidateSize()
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])
  
  return null
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
        .returns<PinWithPhotos[]>()

      // Sort photos by order_index for each pin
      if (error) {
        console.error('Supabase error:', error)
        setError('Failed to load locations. Please check your connection and try again.')
        setPins([])
      } else {
        const sortedPins = (pinsData ?? []).map((pin) => ({
          ...pin,
          photos: [...(pin.photos ?? [])].sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
          ),
        }))
        setPins(sortedPins)
      }
    } catch (error) {
      console.error('Error fetching pins:', error)
      const errorMessage = error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))
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

  // Render map immediately - don't wait for pins to load
  // This ensures Leaflet initializes properly on first load
  return (
    <div className="relative w-full h-screen">
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 rounded-lg p-4 max-w-md text-center shadow-lg">
          <p className="text-red-800 font-semibold mb-2">Error Loading Locations</p>
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={fetchPins}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      )}
      
      {loading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-2 shadow-lg">
          <div className="text-sm text-gray-700">Loading locations...</div>
        </div>
      )}
      
      <MapContainer
        center={[26.65, 127.9764]}
        zoom={9}
        className="w-full h-screen"
        zoomControl={false}
        scrollWheelZoom={true}
        key="okinawa-map" // Force remount if needed
      >
        <MapInitializer />
        
        <TileLayer
          url="https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={['0', '1', '2', '3']}
          attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
          maxZoom={21}
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