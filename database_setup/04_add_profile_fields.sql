-- Migration: Add profile fields to users table
-- Description: Adds phone and address columns to the public.users table

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update the comment on the table
COMMENT ON COLUMN public.users.phone IS 'User contact phone number';
COMMENT ON COLUMN public.users.address IS 'User physical address';
