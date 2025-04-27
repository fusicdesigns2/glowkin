
-- Add whisper consent fields to profiles table
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS whisper_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whisper_consent_date timestamp with time zone;
