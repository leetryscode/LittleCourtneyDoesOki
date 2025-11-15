'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import BaseModal from './BaseModal'
import CoordinatesDisplay from './CoordinatesDisplay'

interface AddPinModalProps {
  isOpen: boolean
  onClose: () => void
  lat: number
  lng: number
  onPinAdded: () => void
}

interface PhotoPreview {
  file: File
  preview: string
  caption: string
}

export default function AddPinModal({ isOpen, onClose, lat, lng, onPinAdded }: AddPinModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    rating: 5,
  })
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPhotos: PhotoPreview[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Revoke object URL to prevent memory leak
      URL.revokeObjectURL(prev[index].preview)
      return updated
    })
  }

  const handlePhotoCaptionChange = (index: number, caption: string) => {
    setPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, caption } : photo
    ))
  }

  const uploadPhotoToStorage = async (file: File, pinId: string, index: number): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${pinId}/${Date.now()}-${index}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create the pin first
      const { data: pinData, error: insertError } = await supabase
        .from('pins')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category || 'General',
          lat,
          lng,
          author_id: user.id,
          created_by: user.id, // Keep both for backward compatibility
          rating: formData.rating,
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (!pinData) throw new Error('Failed to create pin')

      // Upload photos and save to database
      if (photos.length > 0) {
        const photoPromises = photos.map(async (photo, index) => {
          const url = await uploadPhotoToStorage(photo.file, pinData.id, index)
          return {
            pin_id: pinData.id,
            url,
            caption: photo.caption || null,
            order_index: index,
          }
        })

        const photoRecords = await Promise.all(photoPromises)

        const { error: photosError } = await supabase
          .from('photos')
          .insert(photoRecords)

        if (photosError) throw photosError
      }

      // Clean up object URLs
      photos.forEach(photo => URL.revokeObjectURL(photo.preview))

      setFormData({ title: '', description: '', category: '', rating: 5 })
      setPhotos([])
      onPinAdded()
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Clean up object URLs when component unmounts or modal closes
  const handleClose = () => {
    photos.forEach(photo => URL.revokeObjectURL(photo.preview))
    setPhotos([])
    onClose()
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Location"
      subtitle={<CoordinatesDisplay lat={lat} lng={lng} />}
    >
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-field">
          <label htmlFor="title" className="form-label">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="form-input"
            placeholder="Enter location name"
            required
            disabled={loading}
          />
        </div>

        <div className="form-field">
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="form-input"
            rows={3}
            placeholder="Describe this location"
            required
            disabled={loading}
          />
        </div>

        <div className="form-field">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="form-input"
            disabled={loading}
          >
            <option value="">Select a category</option>
            <option value="Beach">🏖️ Beach</option>
            <option value="Restaurant">🍽️ Restaurant</option>
            <option value="Activity">🎯 Activity</option>
            <option value="View">🌅 View</option>
            <option value="Historical">🏛️ Historical</option>
            <option value="General">📍 General</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="rating" className="form-label">
            Rating
          </label>
          <select
            id="rating"
            value={formData.rating}
            onChange={(e) => setFormData(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
            className="form-input"
            disabled={loading}
          >
            {[1, 2, 3, 4, 5].map(rating => (
              <option key={rating} value={rating}>
                {'★'.repeat(rating)} ({rating} Star{rating !== 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="photos" className="form-label">
            Photos (Optional)
          </label>
          <input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="form-input"
            disabled={loading}
            style={{ padding: '0.5rem' }}
          />
          {photos.length > 0 && (
            <div className="mt-4 space-y-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <div className="flex gap-3">
                    <img
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-24 h-24 object-cover rounded"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Add caption (optional)"
                        value={photo.caption}
                        onChange={(e) => handlePhotoCaptionChange(index, e.target.value)}
                        className="form-input mb-2"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="text-red-600 text-sm hover:text-red-800"
                        disabled={loading}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="form-error">
            <p className="form-error-text">{error}</p>
          </div>
        )}

        <div className="flex pt-2" style={{ gap: '2rem' }}>
          <button
            type="button"
            onClick={handleClose}
            className="modal-button modal-button-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="modal-button modal-button-primary flex-1"
            style={{ marginLeft: '2rem' }}
          >
            {loading && <div className="modal-spinner" />}
            {loading ? 'Adding...' : 'Add Location'}
          </button>
        </div>
      </form>
    </BaseModal>
  )
} 