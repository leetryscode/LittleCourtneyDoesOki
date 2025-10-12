'use client'

import BaseModal from './BaseModal'

interface PinModalProps {
  isOpen: boolean
  onClose: () => void
  pin: any
  isAdmin: boolean
  onPinUpdate: () => void
  onEditPin?: (pin: any) => void
  onDeletePin?: (pinId: string) => void
  currentUserId?: string
}

export default function PinModal({ 
  isOpen, 
  onClose, 
  pin, 
  isAdmin, 
  onPinUpdate, 
  onEditPin, 
  onDeletePin, 
  currentUserId 
}: PinModalProps) {
  // Check if current user is the author of this pin
  const isAuthor = pin?.created_by === currentUserId && isAdmin
  
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
        <div>
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
            <h4 className="font-semibold text-gray-700 mb-3">Photos:</h4>
            <div className="space-y-3">
              {pin.photos.map((photo: any, index: number) => (
                <div key={photo.id || index} className="relative">
                  <img
                    src={photo.url}
                    alt={photo.caption || pin.title}
                    className="w-full h-64 object-cover rounded-lg shadow-sm"
                  />
                  {photo.caption && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      {photo.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coordinates */}
        <div className="text-center text-sm text-gray-500">
          <p>📍 {pin?.lat?.toFixed(6)}, {pin?.lng?.toFixed(6)}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center pt-4 space-x-3">
          {isAuthor && onEditPin && (
            <button
              onClick={() => onEditPin(pin)}
              className="modal-button modal-button-primary"
            >
              Edit
            </button>
          )}
          
          {isAuthor && onDeletePin && (
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${pin?.title}"?`)) {
                  onDeletePin(pin.id)
                }
              }}
              className="modal-button modal-button-secondary"
              style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5'
              }}
            >
              Delete
            </button>
          )}
          
          <button
            onClick={onClose}
            className="modal-button modal-button-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </BaseModal>
  )
} 