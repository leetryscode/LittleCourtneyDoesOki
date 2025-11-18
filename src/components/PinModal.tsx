'use client'

import { PinWithPhotos } from '@/lib/supabase'
import BaseModal from './BaseModal'
import CoordinatesDisplay from './CoordinatesDisplay'
import ImageCarousel from './ImageCarousel'

interface PinModalProps {
  isOpen: boolean
  onClose: () => void
  pin: PinWithPhotos
  isAdmin: boolean
  onEditPin?: (pin: PinWithPhotos) => void
  onDeletePin?: (pinId: string) => void
  currentUserId?: string
}

export default function PinModal({ 
  isOpen, 
  onClose, 
  pin, 
  isAdmin, 
  onEditPin, 
  onDeletePin, 
  currentUserId 
}: PinModalProps) {
  // Check if current user is the author of this pin
  const isAuthor = (pin?.author_id === currentUserId || pin?.created_by === currentUserId) && isAdmin
  
  // Debug logging
  console.log('PinModal - pin:', pin)
  console.log('PinModal - currentUserId:', currentUserId)
  console.log('PinModal - isAdmin:', isAdmin)
  console.log('PinModal - pin.created_by:', pin?.created_by)
  console.log('PinModal - isAuthor:', isAuthor)
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={pin?.title || 'Location Details'}
      maxWidth="32rem"
    >
      <div className="space-y-6">
        {/* Description */}
        <div className="text-center">
          <p className="text-gray-600 leading-relaxed">{pin?.description}</p>
        </div>
        
        {/* Rating */}
        <div className="flex justify-center">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`text-3xl ${
                  i < pin?.rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Category */}
        {pin?.category && (
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {pin.category}
            </span>
          </div>
        )}

        {/* Notes */}
        {pin?.notes && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Notes:</h4>
            <p className="text-gray-600 text-sm">{pin.notes}</p>
          </div>
        )}

        {/* Photos */}
        {pin?.photos && pin.photos.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Photos ({pin.photos.length}):</h4>
            <ImageCarousel
              images={[...pin.photos]
                .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                .map((photo) => ({
                  url: photo.url,
                  caption: photo.caption ?? undefined,
                  id: photo.id,
                }))}
            />
          </div>
        )}

        {/* Coordinates */}
        <div className="text-center text-sm">
          <CoordinatesDisplay lat={pin?.lat || 0} lng={pin?.lng || 0} />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center pt-4" style={{ gap: '1rem' }}>
          {isAuthor && onEditPin && (
            <button
              onClick={() => onEditPin(pin)}
              className="modal-button modal-button-primary"
              style={{ marginLeft: '0', marginRight: '0' }}
            >
              Edit
            </button>
          )}
          {isAuthor && onDeletePin && (
            <button
              onClick={() => onDeletePin(pin.id)}
              className="modal-button modal-button-secondary"
              style={{ 
                marginLeft: '0',
                marginRight: '0',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}
            >
              Delete
            </button>
          )}
          
          <button
            onClick={onClose}
            className="modal-button modal-button-secondary"
            style={{ marginLeft: '0', marginRight: '0' }}
          >
            Close
          </button>
        </div>
      </div>
    </BaseModal>
  )
} 