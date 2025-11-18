'use client'

import { useState, useRef, useEffect } from 'react'

interface ImageCarouselProps {
  images: Array<{
    url: string
    caption?: string
    id?: string
  }>
}

export default function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const carouselRef = useRef<HTMLDivElement>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }


  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1)
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [images.length])

  if (images.length === 0) return null

  return (
    <div className="relative w-full">
      <div
        ref={carouselRef}
        className="relative overflow-hidden rounded-lg bg-gray-100"
        style={{ aspectRatio: '4/3', maxHeight: '400px' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Images container */}
        <div
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {images.map((image, index) => (
            <div
              key={image.id || index}
              className="min-w-full h-full flex items-center justify-center relative"
            >
              {failedImages.has(index) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-gray-500 p-4">
                  <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-center">Image failed to load</p>
                </div>
              ) : (
                <>
                  <img
                    src={image.url}
                    alt={image.caption || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    onError={() => {
                      setFailedImages(prev => new Set(prev).add(index))
                    }}
                  />
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white text-sm text-center">{image.caption}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Progress bar indicator */}
      {images.length > 1 && (
        <div className="mt-4" style={{ padding: '0.5rem 0' }}>
          <div 
            className="w-full rounded-full overflow-hidden"
            style={{ 
              height: '6px',
              backgroundColor: 'rgba(75, 85, 99, 0.5)',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${((currentIndex + 1) / images.length) * 100}%`,
                background: 'linear-gradient(to right, #22d3ee, #14b8a6)',
                boxShadow: '0 0 10px rgba(34, 211, 238, 0.6)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
