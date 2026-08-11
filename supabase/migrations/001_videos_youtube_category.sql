-- Migration: add youtube_url and category_id to videos table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.portfolio_categories(id) ON DELETE SET NULL;
