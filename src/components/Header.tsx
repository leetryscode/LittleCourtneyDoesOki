'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AuthModal from './AuthModal'

interface HeaderProps {
  isAuthenticated: boolean
  isAdmin: boolean
  onLogout: () => void
  onAddPin: () => void
}

export default function Header({ isAuthenticated, isAdmin, onLogout, onAddPin }: HeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scrollY, setScrollY] = useState(0)

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAuth = async (data: { email: string; password: string; name?: string }) => {
    setLoading(true)
    setError('')

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
      } else {
        // Sign up
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
        
        // Create user profile in our database
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
            // Don't throw here - user is still created in auth
          }
        }
      }
      
      setIsAuthModalOpen(false)
      window.location.reload() // Refresh to update auth state
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setIsAuthModalOpen(true)
    setError('') // Clear any previous errors
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
    setError('')
  }

  return (
    <>
      {/* Hero Header with Background Image */}
      <header className="relative min-h-[40vh] sm:min-h-[50vh] md:min-h-[60vh] overflow-hidden">
        {/* Background Image with Parallax */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80")',
            transform: `translateY(${scrollY * 0.5}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        />
        
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-blue-800/30 to-blue-900/50" />
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-center items-center min-h-[40vh] sm:min-h-[50vh] md:min-h-[60vh] px-4 sm:px-6 lg:px-8">
          {/* Main Title */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 leading-tight tracking-tight">
              <span className="block animate-slide-up">Little Courtney</span>
              <span className="block animate-slide-up animation-delay-200">Does Oki</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-cyan-200 max-w-2xl mx-auto animate-slide-up animation-delay-400">
              Little Courtney, big world
            </p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Floating Authentication Buttons - Bottom Position */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 auth-buttons-container">
        <div className="flex flex-row space-x-4">
          {isAuthenticated ? (
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-transparent border border-white/30 text-white/80 text-sm font-medium rounded-lg hover:bg-white/10 hover:border-white/50 hover:text-white transition-all duration-200 backdrop-blur-sm"
            >
              Log out
            </button>
          ) : (
            <>
              <button
                onClick={() => openAuthModal('login')}
                className="px-6 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg backdrop-blur-sm"
                style={{ backgroundColor: 'transparent', border: '2px solid white', color: 'white' }}
              >
                <span className="text-white font-semibold">Log in</span>
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="px-6 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg backdrop-blur-sm"
                style={{ backgroundColor: 'transparent', border: '2px solid white', color: 'white' }}
              >
                <span className="text-white font-semibold">Sign up</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        mode={authMode}
        onSubmit={handleAuth}
        loading={loading}
        error={error}
      />
    </>
  )
} 