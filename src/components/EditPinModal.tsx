'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BaseModal from './BaseModal'
import CoordinatesDisplay from './CoordinatesDisplay'
import { PinWithPhotos } from '@/lib/supabase'

interface EditPinModalProps {
  isOpen: boolean
  onClose: () => void
  pin: PinWithPhotos
  onPinUpdated: () => void
}

interface PhotoPreview {
  file?: File
  preview: string
  caption: string
  id?: string
  url?: string
  isExisting?: boolean
}

export default function EditPinModal({ isOpen, onClose, pin, onPinUpdated }: EditPinModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    rating: 5,
  })
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Initialize form data when pin changes
  useEffect(() => {
    if (pin) {
      setFormData({
        title: pin.title || '',
        description: pin.description || '',
        category: pin.category || '',
        rating: pin.rating || 5,
      })

      // Load existing photos
      if (pin.photos && pin.photos.length > 0) {
        const existingPhotos: PhotoPreview[] = [...pin.photos]
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((photo) => ({
            preview: photo.url,
            caption: photo.caption || '',
            id: photo.id,
            url: photo.url,
            isExisting: true,
          }))
        setPhotos(existingPhotos)
      } else {
        setPhotos([])
      }
    }
  }, [pin])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPhotos: PhotoPreview[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      isExisting: false,
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => {
      const photo = prev[index]
      // Only revoke object URL for new photos (not existing ones)
      if (photo.file && photo.preview && !photo.isExisting) {
        URL.revokeObjectURL(photo.preview)
      }
      return prev.filter((_, i) => i !== index)
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

      // Update the pin
      const { error: updateError } = await supabase
        .from('pins')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category || 'General',
          rating: formData.rating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pin.id)

      if (updateError) throw updateError

      // Get existing photo IDs to track what to delete
      const existingPhotoIds = pin.photos?.map(p => p.id) || []
      const photosToKeep = photos.filter(p => p.isExisting && p.id)
      const photosToDeleteIds = existingPhotoIds.filter(
        id => !photosToKeep.some(p => p.id === id)
      )

      // Delete removed photos from database and storage
      if (photosToDeleteIds.length > 0) {
        // Get photo URLs before deleting for storage cleanup
        const { data: photosToDelete } = await supabase
          .from('photos')
          .select('url')
          .in('id', photosToDeleteIds)

        // Delete from database
        const { error: deleteError } = await supabase
          .from('photos')
          .delete()
          .in('id', photosToDeleteIds)

        if (deleteError) throw deleteError

        // Optionally delete from storage (uncomment if you want to clean up storage)
        // Note: This requires parsing the URL to get the file path
        // if (photosToDelete) {
        //   for (const photo of photosToDelete) {
        //     // Extract path from URL and delete from storage
        //   }
        // }
      }

      // Update existing photos (captions and order)
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        if (photo.isExisting && photo.id) {
          await supabase
            .from('photos')
            .update({
              caption: photo.caption || null,
              order_index: i,
            })
            .eq('id', photo.id)
        }
      }

      // Upload new photos
      const newPhotos = photos.filter(p => !p.isExisting && p.file)
      if (newPhotos.length > 0) {
        const photoPromises = newPhotos.map(async (photo, index) => {
          const url = await uploadPhotoToStorage(photo.file!, pin.id, index)
          return {
            pin_id: pin.id,
            url,
            caption: photo.caption || null,
            order_index: photos.indexOf(photo),
          }
        })

        const photoRecords = await Promise.all(photoPromises)

        const { error: photosError } = await supabase
          .from('photos')
          .insert(photoRecords)

        if (photosError) throw photosError
      }

      // Clean up object URLs for new photos
      photos.forEach(photo => {
        if (photo.file && photo.preview && !photo.isExisting) {
          URL.revokeObjectURL(photo.preview)
        }
      })

      onPinUpdated()
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Clean up object URLs when component unmounts or modal closes
  const handleClose = () => {
    photos.forEach(photo => {
      if (photo.file && photo.preview && !photo.isExisting) {
        URL.revokeObjectURL(photo.preview)
      }
    })
    setPhotos([])
    onClose()
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Location"
      subtitle={<CoordinatesDisplay lat={pin?.lat || 0} lng={pin?.lng || 0} />}
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
            Photos
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </BaseModal>
  )
}
