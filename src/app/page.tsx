'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import OkinawaMap from '@/components/OkinawaMap'
import PinModal from '@/components/PinModal'
import AddPinModal from '@/components/AddPinModal'
import EditPinModal from '@/components/EditPinModal'
import AuthModal from '@/components/AuthModal'
import { PinWithPhotos, User } from '@/lib/supabase'

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return typeof error === 'string' ? error : JSON.stringify(error)
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedPin, setSelectedPin] = useState<PinWithPhotos | null>(null)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [isAddPinModalOpen, setIsAddPinModalOpen] = useState(false)
  const [isEditPinModalOpen, setIsEditPinModalOpen] = useState(false)
  const [editingPin, setEditingPin] = useState<PinWithPhotos | null>(null)
  const [addPinLocation, setAddPinLocation] = useState({ lat: 0, lng: 0 })
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    // Check authentication state
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Get or create user profile in our database
        const { data: initialProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        let userProfile = initialProfile
        
        if (error && error.code === 'PGRST116') {
          // User doesn't exist in our database, create them
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email!,
              name: authUser.user_metadata?.full_name || 'User',
            })
            .select()
            .single()
          
          if (createError) {
            console.error('Error creating user profile:', createError)
          } else {
            userProfile = newProfile
          }
        }
        
        if (userProfile) {
          setUser(userProfile)
          setIsAdmin(true) // For now, any authenticated user can add pins
        }
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Get or create user profile
          const { data: initialProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          let userProfile = initialProfile
          
          if (error && error.code === 'PGRST116') {
            // Create user profile
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.full_name || 'User',
              })
              .select()
              .single()
            
            if (createError) {
              console.error('Error creating user profile:', createError)
            } else {
              userProfile = newProfile
            }
          }
          
          if (userProfile) {
            setUser(userProfile)
            setIsAdmin(true)
          }
        } else {
          setUser(null)
          setIsAdmin(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    console.log('[handleLogout] Logout button clicked')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[handleLogout] Sign out error:', error)
        throw error
      }
      console.log('[handleLogout] Sign out successful')
      setUser(null)
      setIsAdmin(false)
      window.location.reload() // Refresh to clear auth state
    } catch (error) {
      console.error('[handleLogout] Error during logout:', error)
    }
  }

  const handleAuth = async (data: { email: string; password: string; name?: string }) => {
    setAuthLoading(true)
    setAuthError('')

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
      } else {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
        
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: data.email,
              name: data.name || 'User',
            })
          
          if (profileError) {
            console.error('Error creating user profile:', profileError)
          }
        }
      }
      
      setIsAuthModalOpen(false)
      window.location.reload()
    } catch (error) {
      setAuthError(getErrorMessage(error))
    } finally {
      setAuthLoading(false)
    }
  }

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setIsAuthModalOpen(true)
    setAuthError('')
  }

  const handlePinClick = (pin: PinWithPhotos) => {
    setSelectedPin(pin)
    setIsPinModalOpen(true)
  }

  const handleAddPin = (lat: number, lng: number) => {
    setAddPinLocation({ lat, lng })
    setIsAddPinModalOpen(true)
  }

  const handlePinAdded = () => {
    // Refresh the map to show new pins
    window.location.reload()
  }

  const handleEditPin = (pin: PinWithPhotos) => {
    setEditingPin(pin)
    setIsPinModalOpen(false)
    setIsEditPinModalOpen(true)
  }

  const handlePinUpdated = () => {
    // Refresh the map to show updated pins
    window.location.reload()
  }

  const handleDeletePin = async (pinId: string) => {
    try {
      console.log('Starting delete for pin:', pinId)
      console.log('Current user:', user?.id)
      
      // Try delete without .select() first
      console.log('Attempting delete without select...')
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId)
      
      console.log('Delete response - error:', error)
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Delete successful!')
      // Refresh the map to show updated pins
      window.location.reload()
    } catch (error) {
      console.error('Error deleting pin:', error)
      alert(`Failed to delete pin: ${getErrorMessage(error)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Floating Authentication Buttons - Top Right Position */}
      {!isPinModalOpen && !isAddPinModalOpen && !isEditPinModalOpen && (
        <div className="fixed z-50 pointer-events-none" style={{ right: '1.5rem', top: '1.5rem', left: 'auto' }}>
        <div className="flex flex-row space-x-4 pointer-events-auto">
          {user ? (
            <button
              onClick={handleLogout}
              className="glass-button"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
            >
              Log out
            </button>
          ) : (
            <>
              <button
                onClick={() => openAuthModal('login')}
                className="glass-button"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
              >
                Log in
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="glass-button"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
      )}

      <Header />
      
      <div className="relative -mt-[40vh] sm:-mt-[50vh] md:-mt-[60vh]">
        <OkinawaMap
          onPinClick={handlePinClick}
          onAddPin={handleAddPin}
          isAdmin={isAdmin}
          isModalOpen={isPinModalOpen || isAddPinModalOpen || isEditPinModalOpen}
        />
      </div>

      {selectedPin && (
        <PinModal
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false)
            setSelectedPin(null)
          }}
          pin={selectedPin}
          isAdmin={isAdmin}
          onEditPin={handleEditPin}
          onDeletePin={handleDeletePin}
          currentUserId={user?.id}
        />
      )}

      <AddPinModal
        isOpen={isAddPinModalOpen}
        onClose={() => setIsAddPinModalOpen(false)}
        lat={addPinLocation.lat}
        lng={addPinLocation.lng}
        onPinAdded={handlePinAdded}
      />

      {editingPin && (
        <EditPinModal
          isOpen={isEditPinModalOpen}
          onClose={() => {
            setIsEditPinModalOpen(false)
            setEditingPin(null)
          }}
          pin={editingPin}
          onPinUpdated={handlePinUpdated}
          onDeletePin={handleDeletePin}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false)
          setAuthError('')
        }}
        mode={authMode}
        onSubmit={handleAuth}
        loading={authLoading}
        error={authError}
      />
    </div>
  )
} 