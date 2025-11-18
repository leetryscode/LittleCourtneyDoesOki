'use client'

import dynamic from 'next/dynamic'
import { PinWithPhotos } from '@/lib/supabase'

// Dynamically import the entire map component to avoid SSR issues
const OkinawaMapComponent = dynamic(
  () => import('./OkinawaMapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg">Loading map...</div>
      </div>
    )
  }
)

interface OkinawaMapProps {
  onPinClick: (pin: PinWithPhotos) => void
  onAddPin: (lat: number, lng: number) => void
  isAdmin: boolean
  isModalOpen?: boolean
}

export default function OkinawaMap(props: OkinawaMapProps) {
  return <OkinawaMapComponent {...props} />
} 