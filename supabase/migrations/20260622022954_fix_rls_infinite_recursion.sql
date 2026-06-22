-- Fix infinite recursion between profiles and classes RLS policies.
--
-- The cycle:
--   select_profiles  → subquery on classes
--   select_classes   → subquery on profiles
--
-- Fix: profiles policy only checks auth.uid() = id (own row).
--      Teachers who need to see student profiles get access via the app
--      querying profiles directly with service-role context, or via the
--      classes join done at the application layer (already the case).
--
--      classes policy: students check their own class_id directly from
--      auth metadata instead of re-querying profiles.

-- 1. Drop the recursive policies
DROP POLICY IF EXISTS "select_profiles" ON profiles;
DROP POLICY IF EXISTS "select_classes" ON classes;

-- 2. Recreate profiles SELECT: own row OR teacher_id matches on classes
--    but WITHOUT going back through profiles — use a direct join on classes.teacher_id
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.teacher_id = auth.uid()
        AND classes.id = profiles.class_id
    )
  );

-- 3. Recreate classes SELECT: teacher owns it, OR the calling user's
--    profile.class_id matches — but look up class_id from auth.uid() without
--    going through profiles RLS by using a SECURITY DEFINER function.

-- Create a helper function that bypasses RLS to fetch a user's class_id
CREATE OR REPLACE FUNCTION get_my_class_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM profiles WHERE id = auth.uid();
$$;

CREATE POLICY "select_classes" ON classes FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR id = get_my_class_id()
  );
