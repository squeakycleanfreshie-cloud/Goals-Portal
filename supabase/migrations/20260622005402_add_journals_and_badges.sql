/*
# SMART Goals Portal — Journals, Badges, Teacher Code

## New Tables

1. `journal_entries` — freeform daily journal entries linked to a goal
   - `id` (uuid PK)
   - `goal_id` (uuid FK -> goals.id, cascade delete)
   - `student_id` (uuid FK -> profiles.id, default auth.uid())
   - `content` (text — the journal entry body)
   - `mood` (text: 'great' | 'good' | 'okay' | 'tough' | 'hard', nullable)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

2. `badges` — achievements earned by students
   - `id` (uuid PK)
   - `student_id` (uuid FK -> profiles.id, cascade delete)
   - `type` (text — badge slug, e.g. 'first_goal', 'halfway', 'goal_complete', 'streak_3', 'five_goals')
   - `goal_id` (uuid FK -> goals.id, nullable — the goal that triggered it)
   - `created_at` (timestamptz)
   - UNIQUE (student_id, type, goal_id) to prevent duplicates

## Security (RLS)
- journal_entries: students CRUD own; teachers read entries of students in their classes
- badges: students read own; system/students insert (so client can award); teachers read for students in their classes
*/

-- JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  mood text CHECK (mood IN ('great', 'good', 'okay', 'tough', 'hard')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_goal_id ON journal_entries(goal_id);
CREATE INDEX IF NOT EXISTS idx_journal_student_id ON journal_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(student_id, created_at DESC);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_journal" ON journal_entries;
CREATE POLICY "select_journal" ON journal_entries FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = journal_entries.student_id
      AND p.class_id IN (
        SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_journal" ON journal_entries;
CREATE POLICY "insert_own_journal" ON journal_entries FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "update_own_journal" ON journal_entries;
CREATE POLICY "update_own_journal" ON journal_entries FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_journal" ON journal_entries;
CREATE POLICY "delete_own_journal" ON journal_entries FOR DELETE
  TO authenticated USING (student_id = auth.uid());

-- BADGES
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, type, goal_id)
);

CREATE INDEX IF NOT EXISTS idx_badges_student_id ON badges(student_id);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_badges" ON badges;
CREATE POLICY "select_badges" ON badges FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = badges.student_id
      AND p.class_id IN (
        SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_badges" ON badges;
CREATE POLICY "insert_own_badges" ON badges FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_badges" ON badges;
CREATE POLICY "delete_own_badges" ON badges FOR DELETE
  TO authenticated USING (student_id = auth.uid());
