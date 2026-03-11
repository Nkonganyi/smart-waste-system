/**
 * Supabase SQL Migration
 * Create password reset tokens table
 */

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- Only one active reset token per user at a time
);

-- Enable RLS (Security)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated roles to read/write via service key or backend ONLY
-- Assuming backend connects with service_role key, it bypasses RLS anyway.
-- If backend uses anon key, we'd need policies, but it should be using service_role in a real app.
