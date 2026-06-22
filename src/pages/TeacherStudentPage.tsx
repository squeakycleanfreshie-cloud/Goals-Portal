import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import type { Goal, Reflection, Feedback, Profile, ClassRow, JournalEntry } from '../lib/types';
import { Avatar, EmptyState, ProgressBar, Spinner } from '../components/ui';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  Target,
  History,
  MessageSquareText,
  Send,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { deadlineStatus, fmtDate, fmtDateTime, timeAgo } from '../lib/date';

export function TeacherStudentPage({ studentId }: { studentId: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [student, setStudent] = useState<Profile | null>(null);
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [goals, setGoals] = useState<(Goal & { reflections: Reflection[]; feedback: Feedback[]; journals: JournalEntry[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [feedbackGoal, setFeedbackGoal] = useState<Goal | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: s } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();
    if (!s) {
      setLoading(false);
      return;
    }
    const studentData = s as Profile;
    setStudent(studentData);
    if (studentData.class_id) {
      const { data: c } = await supabase
        .from('classes')
        .select('*')
        .eq('id', studentData.class_id)
        .maybeSingle();
      setCls((c as ClassRow) || null);
    }

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    const goalsList = (goalsData as Goal[]) || [];
    const goalIds = goalsList.map((g) => g.id);

    const [reflections, feedback, journals] = await Promise.all([
      goalIds.length
        ? supabase.from('reflections').select('*').in('goal_id', goalIds).order('created_at', { ascending: false })
        : { data: [] as Reflection[] | null, error: null },
      goalIds.length
        ? supabase.from('feedback').select('*').in('goal_id', goalIds).order('created_at', { ascending: false })
        : { data: [] as Feedback[] | null, error: null },
      goalIds.length
        ? supabase.from('journal_entries').select('*').in('goal_id', goalIds).order('created_at', { ascending: false })
        : { data: [] as JournalEntry[] | null, error: null },
    ]);
    const reflectionsList = (reflections.data as Reflection[]) || [];
    const feedbackList = (feedback.data as Feedback[]) || [];
    const journalsList = (journals.data as JournalEntry[]) || [];

    const enriched = goalsList.map((g) => ({
      ...g,
      reflections: reflectionsList.filter((r) => r.goal_id === g.id),
      feedback: feedbackList.filter((f) => f.goal_id === g.id),
      journals: journalsList.filter((j) => j.goal_id === g.id),
    }));
    setGoals(enriched);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendFeedback() {
    if (!feedbackGoal || !profile) return;
    if (feedbackText.trim().length < 2) {
      toast.push('error', 'Please write a comment.');
      return;
    }
    setSendingFeedback(true);
    const { error } = await supabase.from('feedback').insert({
      goal_id: feedbackGoal.id,
      teacher_id: profile.id,
      comment: feedbackText.trim(),
    });
    // Notify the student
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: feedbackGoal.student_id,
        type: 'feedback',
        title: 'New teacher feedback',
        message: `Your teacher left feedback on "${feedbackGoal.title}".`,
        goal_id: feedbackGoal.id,
      });
    }
    setSendingFeedback(false);
    if (error) {
      toast.push('error', 'Could not send feedback');
      return;
    }
    toast.push('success', 'Feedback sent');
    setFeedbackGoal(null);
    setFeedbackText('');
    load();
  }

  async function toggleReviewed(goal: Goal) {
    setReviewing(goal.id);
    const { error } = await supabase
      .from('goals')
      .update({ reviewed: !goal.reviewed, updated_at: new Date().toISOString() })
      .eq('id', goal.id);
    setReviewing(null);
    if (error) {
      toast.push('error', 'Could not update review status');
      return;
    }
    if (!goal.reviewed) {
      await supabase.from('notifications').insert({
        user_id: goal.student_id,
        type: 'review',
        title: 'Goal reviewed by teacher',
        message: `Your teacher marked "${goal.title}" as reviewed.`,
        goal_id: goal.id,
      });
    }
    toast.push('success', goal.reviewed ? 'Marked as not reviewed' : 'Marked as reviewed');
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="card">
        <EmptyState
          icon={<Target size={22} />}
          title="Student not found"
          action={
            <button onClick={() => navigate({ name: 'teacher-classes' })} className="btn-primary">
              Back to classes
            </button>
          }
        />
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const avgProgress =
    goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => cls && navigate({ name: 'teacher-class', id: cls.id })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft size={15} /> Back to {cls?.name || 'class'}
      </button>

      <header className="card p-6">
        <div className="flex items-center gap-4">
          <Avatar name={student.full_name} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-ink-900 sm:text-2xl">
              {student.full_name || 'Unnamed student'}
            </h1>
            <p className="truncate text-sm text-ink-500">{student.email}</p>
            {cls && (
              <span className="badge mt-1.5 bg-brand-50 text-brand-700">{cls.name}</span>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total goals" value={goals.length} />
          <Stat label="Active" value={activeGoals.length} />
          <Stat label="Completed" value={completedGoals.length} />
          <Stat label="Avg progress" value={`${avgProgress}%`} highlight />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-900">Goals</h2>
        {goals.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Target size={22} />}
              title="No goals yet"
              description="This student hasn't created any goals."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const ds = deadlineStatus(g.deadline);
              const expanded = expandedGoal === g.id;
              return (
                <div key={g.id} className="card overflow-hidden">
                  <button
                    onClick={() => setExpandedGoal(expanded ? null : g.id)}
                    className="block w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          {g.status === 'completed' ? (
                            <span className="badge bg-success-50 text-success-700">
                              <CheckCircle2 size={11} /> Completed
                            </span>
                          ) : (
                            <span className="badge bg-brand-50 text-brand-700">
                              <Target size={11} /> Active
                            </span>
                          )}
                          {g.reviewed && (
                            <span className="badge bg-ink-100 text-ink-600">
                              <ClipboardCheck size={11} /> Reviewed
                            </span>
                          )}
                          <span
                            className={`badge ${
                              ds.tone === 'error'
                                ? 'bg-error-50 text-error-700'
                                : ds.tone === 'warning'
                                ? 'bg-warning-50 text-warning-700'
                                : 'bg-ink-100 text-ink-600'
                            }`}
                          >
                            <Clock size={11} /> {ds.label}
                          </span>
                        </div>
                        <h3 className="truncate font-semibold text-ink-900">{g.title}</h3>
                        <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">
                          {g.specific}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-brand-700">{g.progress}%</span>
                        {expanded ? <ChevronDown size={16} className="text-ink-400" /> : <ChevronRight size={16} className="text-ink-400" />}
                      </div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={g.progress} tone={g.progress === 100 ? 'success' : 'brand'} />
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-ink-100 p-4 animate-fadeIn">
                      {/* SMART */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { l: 'Specific', v: g.specific },
                          { l: 'Measurable', v: g.measurable },
                          { l: 'Achievable', v: g.achievable },
                          { l: 'Relevant', v: g.relevant },
                          { l: 'Time-based', v: g.time_based || (g.deadline ? fmtDate(g.deadline) : '') },
                        ].map((s) => (
                          <div key={s.l} className="rounded-lg bg-ink-50 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                              {s.l}
                            </div>
                            <p className="mt-0.5 text-sm text-ink-700">
                              {s.v || <span className="italic text-ink-400">Not provided</span>}
                            </p>
                          </div>
                        ))}
                      </div>

                      {g.deadline && (
                        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-500">
                          <Calendar size={13} /> Due {fmtDate(g.deadline)}
                        </p>
                      )}

                      {/* Reflections */}
                      <div className="mt-5">
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                          <History size={15} className="text-brand-600" /> Reflections ({g.reflections.length})
                        </h4>
                        {g.reflections.length === 0 ? (
                          <p className="text-sm text-ink-400">No reflections recorded.</p>
                        ) : (
                          <ol className="space-y-3 border-l border-ink-100 pl-4">
                            {g.reflections.map((r) => (
                              <li key={r.id} className="relative">
                                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-50" />
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-xs font-medium text-ink-400">
                                    {fmtDateTime(r.created_at)}
                                  </span>
                                  <span className="badge bg-ink-100 text-ink-600">
                                    {r.progress_at_time}%
                                  </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                  {r.progress_made && (
                                    <p className="text-ink-700">
                                      <span className="font-semibold">Progress: </span>
                                      {r.progress_made}
                                    </p>
                                  )}
                                  {r.challenges && (
                                    <p className="text-ink-700">
                                      <span className="font-semibold">Challenges: </span>
                                      {r.challenges}
                                    </p>
                                  )}
                                  {r.next_steps && (
                                    <p className="text-ink-700">
                                      <span className="font-semibold">Next: </span>
                                      {r.next_steps}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>

                      {/* Journal entries */}
                      <div className="mt-5">
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                          <BookOpen size={15} className="text-brand-600" /> Journal ({g.journals.length} entries)
                        </h4>
                        {g.journals.length === 0 ? (
                          <p className="text-sm text-ink-400">No journal entries yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {g.journals.slice(0, 3).map((j) => (
                              <li key={j.id} className="rounded-lg bg-brand-50/60 border border-brand-100 px-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base">{j.mood === 'great' ? '😄' : j.mood === 'good' ? '🙂' : j.mood === 'okay' ? '😐' : j.mood === 'tough' ? '😔' : j.mood === 'hard' ? '😤' : '📓'}</span>
                                  <span className="text-[11px] text-ink-400">{fmtDateTime(j.created_at)}</span>
                                </div>
                                <p className="text-sm text-ink-700 line-clamp-3">{j.content}</p>
                              </li>
                            ))}
                            {g.journals.length > 3 && (
                              <p className="text-xs text-ink-400">{g.journals.length - 3} more entries...</p>
                            )}
                          </ul>
                        )}
                      </div>

                      {/* Previous feedback */}
                      <div className="mt-5">
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                          <MessageSquareText size={15} className="text-brand-600" /> Your feedback ({g.feedback.length})
                        </h4>
                        {g.feedback.length === 0 ? (
                          <p className="text-sm text-ink-400">No feedback given yet.</p>
                        ) : (
                          <ul className="space-y-2">
                            {g.feedback.map((f) => (
                              <li key={f.id} className="rounded-lg bg-ink-50 px-3 py-2">
                                <p className="text-sm text-ink-700">{f.comment}</p>
                                <p className="mt-0.5 text-[11px] text-ink-400">
                                  {timeAgo(f.created_at)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setFeedbackGoal(g);
                            setFeedbackText('');
                          }}
                          className="btn-primary"
                        >
                          <MessageSquareText size={15} /> Leave feedback
                        </button>
                        <button
                          onClick={() => toggleReviewed(g)}
                          disabled={reviewing === g.id}
                          className={g.reviewed ? 'btn-success' : 'btn-secondary'}
                        >
                          {reviewing === g.id ? <Spinner className="h-4 w-4" /> : <ClipboardCheck size={15} />}
                          {g.reviewed ? 'Reviewed' : 'Mark as reviewed'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={!!feedbackGoal}
        onClose={() => setFeedbackGoal(null)}
        title={`Feedback${feedbackGoal ? ` on "${feedbackGoal.title}"` : ''}`}
      >
        <textarea
          autoFocus
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          rows={5}
          placeholder="Share encouragement, suggest improvements, or ask a guiding question..."
          className="input resize-none"
        />
        <p className="mt-2 text-xs text-ink-400">
          The student will receive a notification.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setFeedbackGoal(null)} className="btn-ghost">
            Cancel
          </button>
          <button onClick={sendFeedback} disabled={sendingFeedback} className="btn-primary">
            {sendingFeedback ? <Spinner className="text-white" /> : <Send size={15} />}
            Send feedback
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-brand-50' : 'bg-ink-50'}`}>
      <div className={`text-xl font-bold ${highlight ? 'text-brand-700' : 'text-ink-900'}`}>
        {value}
      </div>
      <div className="text-[11px] font-medium text-ink-500">{label}</div>
    </div>
  );
}
