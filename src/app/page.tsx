'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import OkinawaMap from '@/components/OkinawaMap'
import PinModal from '@/components/PinModal'
import AddPinModal from '@/components/AddPinModal'
import { PinWithPhotos, User } from '@/lib/supabase'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedPin, setSelectedPin] = useState<PinWithPhotos | null>(null)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [isAddPinModalOpen, setIsAddPinModalOpen] = useState(false)
  const [addPinLocation, setAddPinLocation] = useState({ lat: 0, lng: 0 })

  useEffect(() => {
    // Check authentication state
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // Get or create user profile in our database
        let { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
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
          let { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
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
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  const handlePinClick = (pin: PinWithPhotos) => {
    setSelectedPin(pin)
    setIsPinModalOpen(true)
  }

  const handleAddPin = (lat: number, lng: number) => {
    setAddPinLocation({ lat, lng })
    setIsAddPinModalOpen(true)
  }

  const handlePinUpdate = () => {
    // Refresh the map to show updated pins
    window.location.reload()
  }

  const handlePinAdded = () => {
    // Refresh the map to show new pins
    window.location.reload()
  }

  const handleEditPin = (pin: PinWithPhotos) => {
    // For now, just close the modal - we'll implement edit modal later
    console.log('Edit pin:', pin.title)
    // TODO: Open edit modal
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
      alert(`Failed to delete pin: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Header
        isAuthenticated={!!user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onAddPin={() => setIsAddPinModalOpen(true)}
      />
      
      <div className="relative -mt-[40vh] sm:-mt-[50vh] md:-mt-[60vh]">
        <OkinawaMap
          onPinClick={handlePinClick}
          onAddPin={handleAddPin}
          isAdmin={isAdmin}
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
          onPinUpdate={handlePinUpdate}
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
    </div>
  )
} 