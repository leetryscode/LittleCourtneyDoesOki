'use client'

import { useState } from 'react'
import BaseModal from './BaseModal'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'signup'
  onSubmit: (data: { email: string; password: string; name?: string }) => Promise<void>
  loading?: boolean
  error?: string
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  mode, 
  onSubmit, 
  loading = false, 
  error 
}: AuthModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const isLogin = mode === 'login'
  const title = isLogin ? 'Welcome Back' : 'Join the Adventure'
  const buttonText = loading 
    ? (isLogin ? 'Signing in...' : 'Creating account...')
    : (isLogin ? 'Sign In' : 'Create Account')

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={isLogin ? 'Sign in to continue your journey' : 'Start sharing your Okinawa adventures'}
    >
      <form onSubmit={handleSubmit} className="modal-form">
        {!isLogin && (
          <div className="form-field">
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange('name')}
              className="form-input"
              placeholder="Your full name"
              required={!isLogin}
              disabled={loading}
            />
          </div>
        )}
        
        <div className="form-field">
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            className="form-input"
            placeholder={isLogin ? 'Enter your email' : 'Enter your email'}
            required
            disabled={loading}
          />
        </div>
        
        <div className="form-field">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            className="form-input"
            placeholder={isLogin ? 'Enter your password' : 'Create a password'}
            required
            disabled={loading}
          />
        </div>
        
        {error && (
          <div className="form-error">
            <p className="form-error-text">{error}</p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="modal-button modal-button-primary"
        >
          {loading && <div className="modal-spinner" />}
          {buttonText}
        </button>
      </form>
    </BaseModal>
  )
}
