'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import BaseModal from './BaseModal'

interface AddPinModalProps {
  isOpen: boolean
  onClose: () => void
  lat: number
  lng: number
  onPinAdded: () => void
}

export default function AddPinModal({ isOpen, onClose, lat, lng, onPinAdded }: AddPinModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    rating: 5,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error: insertError } = await supabase
        .from('pins')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category || 'General',
          lat,
          lng,
          created_by: user.id,
          rating: formData.rating,
          notes: formData.notes,
        })

      if (insertError) throw insertError

      setFormData({ title: '', description: '', category: '', rating: 5, notes: '' })
      onPinAdded()
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Location"
      subtitle={`📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`}
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
            <option value="Hotel">🏨 Hotel</option>
            <option value="Historical">🏛️ Historical</option>
            <option value="Shopping">🛍️ Shopping</option>
            <option value="Transportation">🚗 Transportation</option>
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
          <label htmlFor="notes" className="form-label">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="form-input"
            rows={2}
            placeholder="Additional notes or tips"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="form-error">
            <p className="form-error-text">{error}</p>
          </div>
        )}

        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="modal-button modal-button-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="modal-button modal-button-primary flex-1"
          >
            {loading && <div className="modal-spinner" />}
            {loading ? 'Adding...' : 'Add Location'}
          </button>
        </div>
      </form>
    </BaseModal>
  )
} 