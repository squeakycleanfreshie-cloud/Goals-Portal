/*
# SMART Goals Portal — RLS Policies

## Overview
Adds row-level security policies to all tables. RLS was enabled (tables locked)
in the create_tables migration; this unlocks owner-scoped CRUD with teacher
read-access to students in their classes.

## Policy summary
- profiles: read own / teacher reads students in their classes; update own; insert own
- classes: teacher CRUD own; student reads own class
- goals: student CRUD own; teacher reads/updates reviewed flag on students' goals in their classes
- milestones: student CRUD on own goals; teacher reads
- reflections: student CRUD own; teacher reads those of students in their classes
- feedback: teacher inserts/updates/deletes own; student & teacher read where allowed
- notifications: user CRUD own; teacher can insert for students in their classes
*/

-- PROFILES
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.teacher_id = auth.uid() AND classes.id = profiles.class_id
    )
  );

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- CLASSES
DROP POLICY IF EXISTS "select_classes" ON classes;
CREATE POLICY "select_classes" ON classes FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.class_id = classes.id
    )
  );

DROP POLICY IF EXISTS "insert_own_classes" ON classes;
CREATE POLICY "insert_own_classes" ON classes FOR INSERT
  TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "update_own_classes" ON classes;
CREATE POLICY "update_own_classes" ON classes FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_classes" ON classes;
CREATE POLICY "delete_own_classes" ON classes FOR DELETE
  TO authenticated USING (teacher_id = auth.uid());

-- GOALS
DROP POLICY IF EXISTS "select_goals" ON goals;
CREATE POLICY "select_goals" ON goals FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = goals.student_id
      AND p.class_id IN (
        SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_goals" ON goals;
CREATE POLICY "insert_own_goals" ON goals FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "update_goals" ON goals;
CREATE POLICY "update_goals" ON goals FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = goals.student_id
      AND p.class_id IN (
        SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = goals.student_id
      AND p.class_id IN (
        SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "delete_own_goals" ON goals;
CREATE POLICY "delete_own_goals" ON goals FOR DELETE
  TO authenticated USING (student_id = auth.uid());

-- MILESTONES
DROP POLICY IF EXISTS "select_milestones" ON milestones;
CREATE POLICY "select_milestones" ON milestones FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = milestones.goal_id
      AND (
        g.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = g.student_id
          AND p.class_id IN (
            SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_milestones" ON milestones;
CREATE POLICY "insert_own_milestones" ON milestones FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = milestones.goal_id AND g.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_milestones" ON milestones;
CREATE POLICY "update_own_milestones" ON milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = milestones.goal_id AND g.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = milestones.goal_id AND g.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_milestones" ON milestones;
CREATE POLICY "delete_own_milestones" ON milestones FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = milestones.goal_id AND g.student_id = auth.uid()
    )
  );

-- REFLECTIONS
DROP POLICY IF EXISTS "select_reflections" ON reflections;
CREATE POLICY "select_reflections" ON reflections FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = reflections.student_id
      AND p.class_id IN (
        SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_reflections" ON reflections;
CREATE POLICY "insert_own_reflections" ON reflections FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "update_own_reflections" ON reflections;
CREATE POLICY "update_own_reflections" ON reflections FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_reflections" ON reflections;
CREATE POLICY "delete_own_reflections" ON reflections FOR DELETE
  TO authenticated USING (student_id = auth.uid());

-- FEEDBACK
DROP POLICY IF EXISTS "select_feedback" ON feedback;
CREATE POLICY "select_feedback" ON feedback FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = feedback.goal_id AND g.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = feedback.goal_id
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = g.student_id
        AND p.class_id IN (
          SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "insert_teacher_feedback" ON feedback;
CREATE POLICY "insert_teacher_feedback" ON feedback FOR INSERT
  TO authenticated WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = feedback.goal_id
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = g.student_id
        AND p.class_id IN (
          SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "update_own_feedback" ON feedback;
CREATE POLICY "update_own_feedback" ON feedback FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_feedback" ON feedback;
CREATE POLICY "delete_own_feedback" ON feedback FOR DELETE
  TO authenticated USING (teacher_id = auth.uid());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = notifications.user_id
      AND p.class_id IN (
        SELECT classes.id FROM classes WHERE classes.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());
