import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  name: string
  created_at: string
  updated_at: string
}

export interface Pin {
  id: string
  title: string
  description: string
  category?: string | null
  lat: number
  lng: number
  author_id: string
  rating: number
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  pin_id: string
  url: string
  caption?: string
  order_index: number
  created_at: string
}

export interface PinWithPhotos extends Pin {
  photos: Photo[]
  author?: User
} 