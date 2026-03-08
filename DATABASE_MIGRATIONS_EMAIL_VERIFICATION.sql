-- Email Verification System - Database Schema
-- Supabase SQL Migration
-- Run this in your Supabase SQL Editor

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id 
  ON public.email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token 
  ON public.email_verification_tokens(token);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at 
  ON public.email_verification_tokens(expires_at);

-- Enable Row Level Security
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy 1: Allow system to read/write tokens (for operations)
CREATE POLICY "Service can manage verification tokens" 
  ON public.email_verification_tokens
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_verification_tokens TO service_role;

-- Add comment to table
COMMENT ON TABLE public.email_verification_tokens IS 'Stores email verification tokens for user registration flow. Tokens expire after 24 hours.';
COMMENT ON COLUMN public.email_verification_tokens.user_id IS 'Foreign key reference to users table. One token per user enforced by UNIQUE constraint.';
COMMENT ON COLUMN public.email_verification_tokens.token IS 'Cryptographically random verification token generated at registration.';
COMMENT ON COLUMN public.email_verification_tokens.expires_at IS 'Timestamp when token expires. Default: 24 hours from creation.';
