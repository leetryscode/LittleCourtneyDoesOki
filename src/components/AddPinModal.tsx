'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import BaseModal from './BaseModal'
import CoordinatesDisplay from './CoordinatesDisplay'
import ImageCropModal from './ImageCropModal'

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
}

type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>
type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>
type SupabaseAuthUser = GetUserResult['data']['user']

type StorageUploadResult = {
  data: { path: string } | null
  error: { message: string } | null
}

const AUTH_TIMEOUT_MS = 20000
const AUTH_MAX_ATTEMPTS = 2
const AUTH_RETRY_DELAY_MS = 1500

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return typeof error === 'string' ? error : JSON.stringify(error)
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
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [photoToCrop, setPhotoToCrop] = useState<{ file: File; preview: string; index?: number } | null>(null)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      // Open crop modal for the first file
      const file = files[0]
      const preview = URL.createObjectURL(file)
      setPhotoToCrop({ file, preview })
      setCropModalOpen(true)
      // Clear the input so the same file can be selected again
      e.target.value = ''
    }
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!photoToCrop) return

    // Create a File from the Blob
    const croppedFile = new File([croppedImageBlob], photoToCrop.file.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })

    // Create preview URL
    const preview = URL.createObjectURL(croppedFile)

    // If there's an index, replace the photo at that index, otherwise add new
    if (photoToCrop.index !== undefined) {
      setPhotos(prev => {
        const updated = [...prev]
        // Revoke old preview URL
        URL.revokeObjectURL(prev[photoToCrop.index!].preview)
        updated[photoToCrop.index!] = {
          file: croppedFile,
          preview,
        }
        return updated
      })
    } else {
      setPhotos(prev => [...prev, { file: croppedFile, preview }])
    }

    // Clean up
    URL.revokeObjectURL(photoToCrop.preview)
    setPhotoToCrop(null)
    setCropModalOpen(false)
  }

  const handleEditPhoto = (index: number) => {
    const photo = photos[index]
    setPhotoToCrop({ file: photo.file, preview: photo.preview, index })
    setCropModalOpen(true)
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Revoke object URL to prevent memory leak
      URL.revokeObjectURL(prev[index].preview)
      return updated
    })
  }

  const uploadPhotoToStorage = async (file: File, pinId: string, index: number): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${pinId}/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    console.log(`[AddPinModal] Uploading photo ${index + 1}: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
    
    // Add timeout to prevent hanging
    let timeoutId: NodeJS.Timeout | null = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Photo upload timeout after 30 seconds`))
      }, 30000)
    })

    try {
      const uploadPromise = supabase.storage
        .from('photos')
        .upload(fileName, file)

      const result = await Promise.race([uploadPromise, timeoutPromise]) as StorageUploadResult
      
      // Clear timeout if upload succeeded
      if (timeoutId) clearTimeout(timeoutId)

      const { error: uploadError } = result

      if (uploadError) {
        console.error(`[AddPinModal] Upload error for photo ${index + 1}:`, uploadError)
        throw new Error(`Failed to upload photo ${index + 1}: ${uploadError.message}`)
      }

      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)

      console.log(`[AddPinModal] Photo ${index + 1} uploaded successfully`)
      return data.publicUrl
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId)
      throw error
    }
  }

  const getUserFromSession = async (): Promise<SupabaseAuthUser | null> => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('refresh_token')) {
        await supabase.auth.signOut({ scope: 'local' })
        throw new Error('Session expired. Please sign in again.')
      }

      console.warn('[AddPinModal] getSession warning:', sessionError.message)
      return null
    }

    return sessionData?.session?.user ?? null
  }

  const getUserWithTimeout = async (): Promise<GetUserResult['data']['user'] | null> => {
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Authentication check timed out after ${AUTH_TIMEOUT_MS / 1000} seconds`)),
        AUTH_TIMEOUT_MS
      )
    })

    const getUserResult = await Promise.race([getUserPromise, timeoutPromise]) as GetUserResult

    if (getUserResult?.error) {
      if (getUserResult.error.message?.includes('Refresh Token') || getUserResult.error.message?.includes('refresh_token')) {
        await supabase.auth.signOut({ scope: 'local' })
        throw new Error('Session expired. Please sign in again.')
      }

      console.error('[AddPinModal] getUser error:', getUserResult.error)
      throw new Error(`Authentication error: ${getUserResult.error.message}`)
    }

    return getUserResult?.data?.user ?? null
  }

  const fetchAuthenticatedUser = async (attempt = 1): Promise<GetUserResult['data']['user']> => {
    try {
      const sessionUser = await getUserFromSession()
      if (sessionUser) {
        return sessionUser
      }

      const user = await getUserWithTimeout()
      if (!user) {
        throw new Error('User not authenticated')
      }

      return user
    } catch (error) {
      if (
        attempt < AUTH_MAX_ATTEMPTS &&
        error instanceof Error &&
        error.message.toLowerCase().includes('timed out')
      ) {
        console.warn(`[AddPinModal] Auth attempt ${attempt} timed out. Retrying...`)
        await new Promise(resolve => setTimeout(resolve, AUTH_RETRY_DELAY_MS))
        return fetchAuthenticatedUser(attempt + 1)
      }

      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('[AddPinModal] Start submit')

      console.log('[AddPinModal] Resolving authenticated user...')
      const user = await fetchAuthenticatedUser()
      console.log('[AddPinModal] User retrieved:', user ? user.id : 'null')

      if (!user) throw new Error('User not authenticated')

      // Create the pin first
      console.log('[AddPinModal] Inserting pin')
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
        console.log('[AddPinModal] Uploading photos:', photos.length)
        
        // Upload photos with individual error handling
        const photoRecords = []
        for (let i = 0; i < photos.length; i++) {
          try {
            console.log(`[AddPinModal] Starting upload for photo ${i + 1}/${photos.length}`)
            const url = await uploadPhotoToStorage(photos[i].file, pinData.id, i)
            photoRecords.push({
              pin_id: pinData.id,
              url,
              caption: null,
              order_index: i,
            })
            console.log(`[AddPinModal] Photo ${i + 1} processed successfully`)
          } catch (photoError) {
            console.error(`[AddPinModal] Failed to upload photo ${i + 1}:`, photoError)
            // Continue with other photos, but throw error at the end
            throw new Error(`Failed to upload photo ${i + 1} (${photos[i].file.name}): ${getErrorMessage(photoError)}`)
          }
        }

        if (photoRecords.length > 0) {
          console.log('[AddPinModal] Inserting photo records:', photoRecords.length)
          const { error: photosError } = await supabase
            .from('photos')
            .insert(photoRecords)

          if (photosError) {
            console.error('[AddPinModal] Error inserting photo records:', photosError)
            throw new Error(`Failed to save photos: ${photosError.message}`)
          }
          console.log('[AddPinModal] Photo records inserted successfully')
        }
      }

      // Clean up object URLs
      console.log('[AddPinModal] Cleaning up and closing')
      photos.forEach(photo => URL.revokeObjectURL(photo.preview))

      setFormData({ title: '', description: '', category: '', rating: 5 })
      setPhotos([])
      onPinAdded()
      onClose()
    } catch (error) {
      console.error('[AddPinModal] Error:', error)
      setError(getErrorMessage(error))
    } finally {
      console.log('[AddPinModal] Finished submit')
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
    <>
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
          <div className="relative">
            <input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={loading}
            />
            <button
              type="button"
              className="modal-button modal-button-secondary w-full"
              style={{ marginTop: '0' }}
              disabled={loading}
              onClick={() => document.getElementById('photos')?.click()}
            >
              Choose Photos
            </button>
          </div>
          {photos.length > 0 && (
            <div className="mt-4 space-y-4">
              {photos.map((photo, index) => (
                <div key={index} className="w-full">
                  <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: '300px' }}>
                    <Image
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 600px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="mt-2 mb-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditPhoto(index)}
                      className="modal-button modal-button-secondary"
                      style={{ 
                        marginTop: '0',
                        padding: '0.375rem 1rem',
                        fontSize: '0.875rem',
                        minHeight: 'auto'
                      }}
                      disabled={loading}
                    >
                      Crop/Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="modal-button modal-button-secondary"
                      style={{ 
                        marginTop: '0',
                        padding: '0.375rem 1rem',
                        fontSize: '0.875rem',
                        minHeight: 'auto'
                      }}
                      disabled={loading}
                    >
                      Remove
                    </button>
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

    {photoToCrop && (
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false)
          if (photoToCrop && photoToCrop.index === undefined) {
            // If it was a new photo (not editing existing), clean up the preview
            URL.revokeObjectURL(photoToCrop.preview)
          }
          setPhotoToCrop(null)
        }}
        imageSrc={photoToCrop.preview}
        aspectRatio={4 / 3}
        onCropComplete={handleCropComplete}
      />
    )}
    </>
  )
} 