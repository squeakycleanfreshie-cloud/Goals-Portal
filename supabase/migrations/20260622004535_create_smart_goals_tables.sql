/*
# SMART Goals Portal — Tables (Bally Boys)

## Overview
Creates all tables for the SMART Goals Portal. Policies are added in a separate
follow-up migration to avoid forward-reference ordering issues.

## New Tables
1. profiles — extends auth.users with role (student/teacher), name, class membership
2. classes — a class/group taught by a teacher
3. goals — a SMART goal owned by a student
4. milestones — checkpoints within a goal
5. reflections — student reflection entries (history kept)
6. feedback — teacher feedback on a goal
7. notifications — in-app notifications

## Notes
- All tables get RLS enabled here (locked down; policies added next).
- student_id / teacher_id / user_id default to auth.uid().
- A trigger auto-creates a profiles row on signup.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  class_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- GOALS
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  specific text NOT NULL DEFAULT '',
  measurable text NOT NULL DEFAULT '',
  achievable text NOT NULL DEFAULT '',
  relevant text NOT NULL DEFAULT '',
  time_based text NOT NULL DEFAULT '',
  deadline timestamptz,
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_student_id ON goals(student_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- MILESTONES
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- REFLECTIONS
CREATE TABLE IF NOT EXISTS reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  progress_made text NOT NULL DEFAULT '',
  challenges text NOT NULL DEFAULT '',
  next_steps text NOT NULL DEFAULT '',
  progress_at_time int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reflections_goal_id ON reflections(goal_id);
CREATE INDEX IF NOT EXISTS idx_reflections_student_id ON reflections(student_id);
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- FEEDBACK
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_goal_id ON feedback(goal_id);
CREATE INDEX IF NOT EXISTS idx_feedback_teacher_id ON feedback(teacher_id);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('feedback', 'deadline', 'completion', 'review', 'overdue')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
