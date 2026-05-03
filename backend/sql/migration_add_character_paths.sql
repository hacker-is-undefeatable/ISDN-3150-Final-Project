-- Migration: Add model_path and image_path columns to characters table
-- Run this in Supabase SQL Editor directly

-- Step 1: Add columns if they don't exist (nullable first)
alter table public.characters
add column if not exists model_path text default 'model00000.vrm',
add column if not exists image_path text default '/character-img-00000.png';

-- Step 2: Update existing rows with correct model and image paths
update public.characters set
  model_path = case id
    when 1 then 'model00001.vrm'
    when 2 then 'model00010.vrm'
    when 3 then 'model00011.vrm'
    when 4 then 'model00100.vrm'
    when 5 then 'model00101.vrm'
    when 6 then 'model00110.vrm'
    when 7 then 'model00111.vrm'
    when 8 then 'model01000.vrm'
    when 9 then 'model01001.vrm'
    when 10 then 'model01010.vrm'
    when 11 then 'model00000.vrm'
    else 'model00000.vrm'
  end,
  image_path = case id
    when 1 then '/character-img-00001.png'
    when 2 then '/character-img-00010.png'
    when 3 then '/character-img-00011.png'
    when 4 then '/character-img-00100.png'
    when 5 then '/character-img-00101.png'
    when 6 then '/character-img-00110.png'
    when 7 then '/character-img-00111.png'
    when 8 then '/character-img-01000.png'
    when 9 then '/character-img-01001.png'
    when 10 then '/character-img-01010.png'
    when 11 then '/character-img-00000.png'
    else '/character-img-00000.png'
  end;

-- Step 3: Alter columns to NOT NULL
alter table public.characters
alter column model_path drop default;

alter table public.characters
alter column model_path set not null;

alter table public.characters
alter column image_path drop default;

alter table public.characters
alter column image_path set not null;
