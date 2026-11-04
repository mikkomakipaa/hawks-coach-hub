-- Verification script for question_sets status backfill
-- Run this in Supabase SQL Editor after applying migrations

-- 1. Check if status column exists
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'question_sets' AND column_name = 'status';

-- 2. Verify all question sets have published status
SELECT
  status,
  COUNT(*) as count
FROM question_sets
GROUP BY status;

-- 3. Sample a few question sets to verify they're published
SELECT
  code,
  name,
  difficulty,
  status,
  created_at
FROM question_sets
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verify RLS policy is in place
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'question_sets'
  AND policyname = 'Enable read access for published question sets';

-- Expected results:
-- 1. status column should exist with type question_set_status, default 'created'
-- 2. All existing sets should show status = 'published'
-- 3. Sample sets should all have status = 'published'
-- 4. RLS policy should exist with qual = (status = 'published'::question_set_status)
