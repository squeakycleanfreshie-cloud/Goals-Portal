import { supabase } from './supabase';
import type { BadgeType } from './types';

export type BadgeDef = {
  type: BadgeType;
  label: string;
  description: string;
  emoji: string;
  color: string; // tailwind bg color
};

export const BADGE_DEFS: Record<BadgeType, BadgeDef> = {
  first_goal: {
    type: 'first_goal',
    label: 'Goal Setter',
    description: 'Created your first SMART goal',
    emoji: '🎯',
    color: 'bg-brand-100 text-brand-800 border-brand-200',
  },
  goal_complete: {
    type: 'goal_complete',
    label: 'Achiever',
    description: 'Completed a goal at 100%',
    emoji: '🏆',
    color: 'bg-warning-50 text-warning-800 border-warning-200',
  },
  halfway: {
    type: 'halfway',
    label: 'Halfway There',
    description: 'Reached 50% progress on a goal',
    emoji: '⚡',
    color: 'bg-success-50 text-success-800 border-success-200',
  },
  streak_3: {
    type: 'streak_3',
    label: 'On a Roll',
    description: 'Wrote journal entries 3 days in a row',
    emoji: '🔥',
    color: 'bg-error-50 text-error-800 border-error-200',
  },
  five_goals: {
    type: 'five_goals',
    label: 'Ambitious',
    description: 'Created 5 SMART goals',
    emoji: '🌟',
    color: 'bg-warning-50 text-warning-800 border-warning-200',
  },
  all_milestones: {
    type: 'all_milestones',
    label: 'Milestone Crusher',
    description: 'Completed all milestones on a goal',
    emoji: '✅',
    color: 'bg-success-50 text-success-800 border-success-200',
  },
  first_journal: {
    type: 'first_journal',
    label: 'Journal Starter',
    description: 'Wrote your first journal entry',
    emoji: '📓',
    color: 'bg-ink-100 text-ink-800 border-ink-200',
  },
  ten_journals: {
    type: 'ten_journals',
    label: 'Dedicated Writer',
    description: 'Wrote 10 journal entries',
    emoji: '📚',
    color: 'bg-brand-50 text-brand-800 border-brand-200',
  },
  reflection_writer: {
    type: 'reflection_writer',
    label: 'Deep Thinker',
    description: 'Submitted 3 goal reflections',
    emoji: '💭',
    color: 'bg-ink-100 text-ink-800 border-ink-200',
  },
};

export async function awardBadge(
  studentId: string,
  type: BadgeType,
  goalId?: string
): Promise<boolean> {
  const { error } = await supabase.from('badges').insert({
    student_id: studentId,
    type,
    goal_id: goalId ?? null,
  });
  // unique constraint will silently fail on duplicates
  return !error || error.code === '23505';
}

export async function checkAndAwardBadges(
  studentId: string,
  context: {
    goalCreated?: boolean;
    goalId?: string;
    newProgress?: number;
    oldProgress?: number;
    totalGoals?: number;
    allMilestonesComplete?: boolean;
    journalCount?: number;
    reflectionCount?: number;
    journalStreak?: number;
  }
): Promise<BadgeType[]> {
  const awarded: BadgeType[] = [];

  if (context.goalCreated && context.totalGoals === 1) {
    const ok = await awardBadge(studentId, 'first_goal', context.goalId);
    if (ok) awarded.push('first_goal');
  }

  if (context.goalCreated && (context.totalGoals ?? 0) >= 5) {
    const ok = await awardBadge(studentId, 'five_goals');
    if (ok) awarded.push('five_goals');
  }

  if (context.newProgress !== undefined && context.oldProgress !== undefined && context.goalId) {
    if (context.oldProgress < 50 && context.newProgress >= 50) {
      const ok = await awardBadge(studentId, 'halfway', context.goalId);
      if (ok) awarded.push('halfway');
    }
    if (context.oldProgress < 100 && context.newProgress === 100) {
      const ok = await awardBadge(studentId, 'goal_complete', context.goalId);
      if (ok) awarded.push('goal_complete');
    }
  }

  if (context.allMilestonesComplete && context.goalId) {
    const ok = await awardBadge(studentId, 'all_milestones', context.goalId);
    if (ok) awarded.push('all_milestones');
  }

  if (context.journalCount === 1) {
    const ok = await awardBadge(studentId, 'first_journal');
    if (ok) awarded.push('first_journal');
  }
  if ((context.journalCount ?? 0) >= 10) {
    const ok = await awardBadge(studentId, 'ten_journals');
    if (ok) awarded.push('ten_journals');
  }
  if ((context.journalStreak ?? 0) >= 3) {
    const ok = await awardBadge(studentId, 'streak_3');
    if (ok) awarded.push('streak_3');
  }
  if ((context.reflectionCount ?? 0) >= 3) {
    const ok = await awardBadge(studentId, 'reflection_writer');
    if (ok) awarded.push('reflection_writer');
  }

  return awarded;
}

export async function getJournalStreak(studentId: string): Promise<number> {
  const { data } = await supabase
    .from('journal_entries')
    .select('created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (!data || data.length === 0) return 0;

  const days = new Set(
    (data as { created_at: string }[]).map((e) =>
      new Date(e.created_at).toDateString()
    )
  );
  const sorted = Array.from(days).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  let streak = 0;
  const now = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date(now);
    expected.setDate(now.getDate() - i);
    if (sorted[i] === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
