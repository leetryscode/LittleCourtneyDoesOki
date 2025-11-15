-- Update existing tables to add missing columns
-- Migration: 20241201000001_update_existing_tables.sql

-- Add missing columns to pins table if they don't exist
DO $$ 
BEGIN
    -- Add author_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'author_id') THEN
        ALTER TABLE pins ADD COLUMN author_id UUID;
    END IF;
    
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'rating') THEN
        ALTER TABLE pins ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5) DEFAULT 5;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'updated_at') THEN
        ALTER TABLE pins ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add missing columns to photos table if they don't exist
DO $$ 
BEGIN
    -- Add order_index column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'order_index') THEN
        ALTER TABLE photos ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pins_author_id ON pins(author_id);
CREATE INDEX IF NOT EXISTS idx_pins_location ON pins(lat, lng);
CREATE INDEX IF NOT EXISTS idx_photos_pin_id ON photos(pin_id);
CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(pin_id, order_index);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at if they don't exist
DROP TRIGGER IF EXISTS update_pins_updated_at ON pins;
CREATE TRIGGER update_pins_updated_at BEFORE UPDATE ON pins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Anyone can view pins" ON pins;
DROP POLICY IF EXISTS "Authenticated users can create pins" ON pins;
DROP POLICY IF EXISTS "Authors can update their own pins" ON pins;
DROP POLICY IF EXISTS "Authors can delete their own pins" ON pins;

DROP POLICY IF EXISTS "Anyone can view photos" ON photos;
DROP POLICY IF EXISTS "Authenticated users can create photos" ON photos;
DROP POLICY IF EXISTS "Pin authors can update photos" ON photos;
DROP POLICY IF EXISTS "Pin authors can delete photos" ON photos;

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for pins table
CREATE POLICY "Anyone can view pins" ON pins
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create pins" ON pins
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can update their own pins" ON pins
    FOR UPDATE USING (auth.uid()::text = author_id::text);

CREATE POLICY "Authors can delete their own pins" ON pins
    FOR DELETE USING (auth.uid()::text = author_id::text);

-- RLS Policies for photos table
CREATE POLICY "Anyone can view photos" ON photos
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create photos" ON photos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Pin authors can update photos" ON photos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pins 
            WHERE pins.id = photos.pin_id 
            AND pins.author_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Pin authors can delete photos" ON photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pins 
            WHERE pins.id = photos.pin_id 
            AND pins.author_id::text = auth.uid()::text
        )
    );

-- Create storage bucket for photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- Storage policies for photos bucket
CREATE POLICY "Public read access" ON storage.objects
    FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'photos' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update own photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'photos' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete own photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'photos' 
        AND auth.uid() IS NOT NULL
    ); 