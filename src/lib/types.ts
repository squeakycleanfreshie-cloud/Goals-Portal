export type Role = 'student' | 'teacher';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  class_id: string | null;
  created_at: string;
};

export type GoalStatus = 'active' | 'completed';

export type Goal = {
  id: string;
  student_id: string;
  title: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  time_based: string;
  deadline: string | null;
  progress: number;
  status: GoalStatus;
  reviewed: boolean;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
};

export type Reflection = {
  id: string;
  goal_id: string;
  student_id: string;
  progress_made: string;
  challenges: string;
  next_steps: string;
  progress_at_time: number;
  created_at: string;
};

export type Feedback = {
  id: string;
  goal_id: string;
  teacher_id: string;
  comment: string;
  created_at: string;
};

export type ClassRow = {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
};

export type NotificationType =
  | 'feedback'
  | 'deadline'
  | 'completion'
  | 'review'
  | 'overdue';

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  goal_id: string | null;
  created_at: string;
};

export type Mood = 'great' | 'good' | 'okay' | 'tough' | 'hard';

export type JournalEntry = {
  id: string;
  goal_id: string;
  student_id: string;
  content: string;
  mood: Mood | null;
  created_at: string;
  updated_at: string;
};

export type BadgeType =
  | 'first_goal'
  | 'goal_complete'
  | 'halfway'
  | 'streak_3'
  | 'five_goals'
  | 'all_milestones'
  | 'first_journal'
  | 'ten_journals'
  | 'reflection_writer';

export type Badge = {
  id: string;
  student_id: string;
  type: BadgeType;
  goal_id: string | null;
  created_at: string;
};
