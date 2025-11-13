'use client'

interface CoordinatesDisplayProps {
  lat: number
  lng: number
}

export default function CoordinatesDisplay({ lat, lng }: CoordinatesDisplayProps) {
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
  
  return (
    <div className="flex items-center justify-center" style={{ marginBottom: '0.5rem' }}>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal-400 hover:text-teal-300 transition-all duration-200 flex items-center gap-2 text-sm hover:gap-3 no-underline"
        style={{ textDecoration: 'none' }}
        title={`${lat.toFixed(6)}, ${lng.toFixed(6)}`}
      >
        <span className="text-xl">📍</span>
        <span className="underline">View on Google Maps</span>
      </a>
    </div>
  )
}

