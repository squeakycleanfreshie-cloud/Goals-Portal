import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import type { Goal, Milestone, Reflection, Feedback } from '../lib/types';
import { ProgressBar, EmptyState, Avatar, Spinner } from '../components/ui';
import {
  ArrowLeft,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  MessageSquareText,
  History,
  Target,
  Calendar,
  Clock,
  ClipboardCheck,
  Send,
  BookOpen,
} from 'lucide-react';
import { deadlineStatus, fmtDate, timeAgo } from '../lib/date';
import { checkAndAwardBadges } from '../lib/badges';

const PRESET_VALUES = [0, 25, 50, 75, 100];

export function GoalDetailPage({ goalId }: { goalId: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMilestone, setNewMilestone] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionForm, setReflectionForm] = useState({
    progress_made: '',
    challenges: '',
    next_steps: '',
  });
  const [savingReflection, setSavingReflection] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    const [g, m, r, f] = await Promise.all([
      supabase.from('goals').select('*').eq('id', goalId).maybeSingle(),
      supabase.from('milestones').select('*').eq('goal_id', goalId).order('position', { ascending: true }),
      supabase.from('reflections').select('*').eq('goal_id', goalId).order('created_at', { ascending: false }),
      supabase.from('feedback').select('*').eq('goal_id', goalId).order('created_at', { ascending: false }),
    ]);
    setGoal((g.data as Goal) || null);
    setMilestones((m.data as Milestone[]) || []);
    setReflections((r.data as Reflection[]) || []);
    setFeedback((f.data as Feedback[]) || []);
    setLoading(false);
  }, [goalId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function updateProgress(value: number) {
    if (!goal || !profile) return;
    const oldProgress = goal.progress;
    const newStatus = value === 100 ? 'completed' : 'active';
    const { error } = await supabase
      .from('goals')
      .update({ progress: value, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', goal.id);
    if (error) { toast.push('error', 'Failed to update progress'); return; }
    setGoal({ ...goal, progress: value, status: newStatus });

    // Award badges
    const awarded = await checkAndAwardBadges(profile.id, {
      goalId: goal.id,
      newProgress: value,
      oldProgress,
    });
    for (const b of awarded) {
      const labels: Record<string, string> = { halfway: '⚡ Halfway There!', goal_complete: '🏆 Goal Achiever!' };
      toast.push('success', labels[b] ?? `Badge unlocked: ${b}!`);
    }

    if (value === 100) {
      try {
        const { data: cls } = await supabase.from('profiles').select('class_id').eq('id', goal.student_id).maybeSingle();
        if (cls?.class_id) {
          const { data: clsRow } = await supabase.from('classes').select('teacher_id').eq('id', cls.class_id).maybeSingle();
          if (clsRow?.teacher_id) {
            await supabase.from('notifications').insert({
              user_id: clsRow.teacher_id,
              type: 'completion',
              title: 'Goal completed!',
              message: `${profile?.full_name || 'A student'} completed "${goal.title}".`,
              goal_id: goal.id,
            });
          }
        }
      } catch { /* best-effort */ }
      toast.push('success', 'Goal completed!');
    }
  }

  async function addMilestone() {
    if (!goal || !newMilestone.trim()) return;
    const pos = milestones.length;
    const { data, error } = await supabase
      .from('milestones').insert({ goal_id: goal.id, title: newMilestone.trim(), completed: false, position: pos })
      .select().single();
    if (error) { toast.push('error', 'Could not add milestone'); return; }
    setMilestones([...milestones, data as Milestone]);
    setNewMilestone('');
  }

  async function toggleMilestone(m: Milestone) {
    if (!profile) return;
    const { error } = await supabase.from('milestones').update({ completed: !m.completed }).eq('id', m.id);
    if (error) { toast.push('error', 'Could not update milestone'); return; }
    const updated = milestones.map((x) => x.id === m.id ? { ...x, completed: !x.completed } : x);
    setMilestones(updated);

    // Check if all milestones are now complete
    const allDone = updated.length > 0 && updated.every((x) => x.completed);
    if (allDone && !m.completed && goal) {
      const awarded = await checkAndAwardBadges(profile.id, { goalId: goal.id, allMilestonesComplete: true });
      for (const b of awarded) {
        if (b === 'all_milestones') toast.push('success', '✅ Milestone Crusher badge unlocked!');
      }
    }
  }

  async function deleteMilestone(m: Milestone) {
    const { error } = await supabase.from('milestones').delete().eq('id', m.id);
    if (error) { toast.push('error', 'Could not delete milestone'); return; }
    setMilestones(milestones.filter((x) => x.id !== m.id));
  }

  async function saveReflection() {
    if (!goal || !profile) return;
    if (!reflectionForm.progress_made.trim() && !reflectionForm.challenges.trim() && !reflectionForm.next_steps.trim()) {
      toast.push('error', 'Please answer at least one reflection question.');
      return;
    }
    setSavingReflection(true);
    const { data, error } = await supabase
      .from('reflections')
      .insert({
        goal_id: goal.id,
        student_id: profile.id,
        progress_made: reflectionForm.progress_made.trim(),
        challenges: reflectionForm.challenges.trim(),
        next_steps: reflectionForm.next_steps.trim(),
        progress_at_time: goal.progress,
      })
      .select().single();
    setSavingReflection(false);
    if (error) { toast.push('error', 'Could not save reflection'); return; }
    const newReflections = [data as Reflection, ...reflections];
    setReflections(newReflections);
    setReflectionForm({ progress_made: '', challenges: '', next_steps: '' });
    setShowReflection(false);
    toast.push('success', 'Reflection saved');

    // Badge for reflections
    const awarded = await checkAndAwardBadges(profile.id, { reflectionCount: newReflections.length });
    for (const b of awarded) {
      if (b === 'reflection_writer') toast.push('success', '💭 Deep Thinker badge unlocked!');
    }
  }

  async function deleteGoal() {
    if (!goal) return;
    setDeleting(true);
    const { error } = await supabase.from('goals').delete().eq('id', goal.id);
    setDeleting(false);
    if (error) { toast.push('error', 'Could not delete goal'); return; }
    toast.push('success', 'Goal deleted');
    navigate({ name: 'student-goals' });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-ink-400"><Spinner /></div>;
  }

  if (!goal) {
    return (
      <div className="card">
        <EmptyState
          icon={<Target size={22} />}
          title="Goal not found"
          description="This goal may have been deleted."
          action={<button onClick={() => navigate({ name: 'student-goals' })} className="btn-primary">Back to goals</button>}
        />
      </div>
    );
  }

  const ds = deadlineStatus(goal.deadline);
  const smart = [
    { label: 'Specific', value: goal.specific, letter: 'S' },
    { label: 'Measurable', value: goal.measurable, letter: 'M' },
    { label: 'Achievable', value: goal.achievable, letter: 'A' },
    { label: 'Relevant', value: goal.relevant, letter: 'R' },
    { label: 'Time-based', value: goal.time_based || (goal.deadline ? fmtDate(goal.deadline) : ''), letter: 'T' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate({ name: 'student-goals' })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft size={15} /> Back to goals
      </button>

      <header className="card p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`badge ${goal.status === 'completed' ? 'bg-success-50 text-success-700' : 'bg-brand-50 text-brand-700'}`}>
                {goal.status === 'completed' ? <><CheckCircle2 size={11} /> Completed</> : <><Target size={11} /> Active</>}
              </span>
              {goal.reviewed && (
                <span className="badge bg-ink-100 text-ink-600"><ClipboardCheck size={11} /> Teacher reviewed</span>
              )}
              <span className={`badge ${ds.tone === 'error' ? 'bg-error-50 text-error-700' : ds.tone === 'warning' ? 'bg-warning-50 text-warning-700' : 'bg-ink-100 text-ink-600'}`}>
                <Clock size={11} /> {ds.label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{goal.title}</h1>
            {goal.deadline && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                <Calendar size={13} /> Due {fmtDate(goal.deadline)}
              </p>
            )}
          </div>
          <button
            onClick={deleteGoal}
            disabled={deleting}
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-error-50 hover:text-error-600"
            aria-label="Delete goal"
          >
            {deleting ? <Spinner className="h-4 w-4" /> : <Trash2 size={16} />}
          </button>
        </div>

        {/* Progress tracker */}
        <div className="mt-6 rounded-xl bg-ink-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-700">Progress tracker</span>
            <span className="text-lg font-bold text-brand-700">{goal.progress}%</span>
          </div>
          <ProgressBar value={goal.progress} tone={goal.progress === 100 ? 'success' : 'brand'} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {PRESET_VALUES.map((v) => (
              <button
                key={v}
                onClick={() => updateProgress(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  goal.progress === v && v === 100 ? 'bg-success-600 text-white'
                  : goal.progress === v ? 'bg-brand-600 text-white'
                  : 'bg-white text-ink-600 border border-ink-200 hover:border-brand-300'
                }`}
              >
                {v}%
              </button>
            ))}
            <div className="ml-2 flex-1">
              <input
                type="range" min={0} max={100} step={5} value={goal.progress}
                onChange={(e) => updateProgress(Number(e.target.value))}
                aria-label="Progress slider"
              />
            </div>
          </div>
        </div>

        {/* Journal shortcut */}
        <div className="mt-4">
          <button
            onClick={() => navigate({ name: 'student-journal', id: goal.id })}
            className="btn-secondary w-full justify-center"
          >
            <BookOpen size={16} /> Open journal for this goal
          </button>
        </div>
      </header>

      {/* SMART breakdown */}
      <section className="card p-6 sm:p-7">
        <h2 className="mb-4 text-base font-semibold text-ink-900">SMART breakdown</h2>
        <div className="space-y-4">
          {smart.map((s) => (
            <div key={s.label} className="flex gap-3">
              <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                {s.letter}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">{s.label}</div>
                <p className="mt-0.5 text-sm text-ink-700">
                  {s.value || <span className="italic text-ink-400">Not provided</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Milestones */}
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Milestones</h2>
            <span className="text-xs font-medium text-ink-400">
              {milestones.filter((m) => m.completed).length}/{milestones.length}
            </span>
          </div>
          {milestones.length === 0 ? (
            <p className="text-sm text-ink-400">No milestones yet. Add checkpoints to track smaller wins.</p>
          ) : (
            <ul className="space-y-1.5">
              {milestones.map((m) => (
                <li key={m.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-50">
                  <button onClick={() => toggleMilestone(m)} className="flex-shrink-0 hover:scale-110 transition-transform" aria-label={m.completed ? 'Mark incomplete' : 'Mark complete'}>
                    {m.completed ? <CheckCircle2 size={20} className="text-success-500" /> : <Circle size={20} className="text-ink-300" />}
                  </button>
                  <span className={`flex-1 text-sm ${m.completed ? 'text-ink-400 line-through' : 'text-ink-800'}`}>
                    {m.title}
                  </span>
                  <button onClick={() => deleteMilestone(m)} className="opacity-0 group-hover:opacity-100 text-ink-300 hover:text-error-500 transition" aria-label="Delete milestone">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
              placeholder="Add a milestone..."
              className="input py-2"
            />
            <button onClick={addMilestone} disabled={!newMilestone.trim()} className="btn-secondary flex-shrink-0 px-3" aria-label="Add milestone">
              <Plus size={16} />
            </button>
          </div>
        </section>

        {/* Feedback */}
        <section className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-ink-900">Teacher feedback</h2>
          {feedback.length === 0 ? (
            <EmptyState icon={<MessageSquareText size={20} />} title="No feedback yet" description="Your teacher's feedback will appear here." />
          ) : (
            <ul className="space-y-4">
              {feedback.map((f) => (
                <li key={f.id} className="flex gap-3">
                  <Avatar name="Teacher" size={32} className="mt-0.5" />
                  <div className="min-w-0 flex-1 rounded-xl bg-ink-50 px-3.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-ink-700">Teacher</span>
                      <span className="text-[11px] text-ink-400">{timeAgo(f.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-700">{f.comment}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Reflections */}
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-ink-900">Reflections</h2>
          </div>
          <button onClick={() => setShowReflection((v) => !v)} className="btn-secondary">
            <Plus size={15} /> New reflection
          </button>
        </div>

        {showReflection && (
          <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4 animate-slideIn">
            <p className="mb-3 text-sm font-medium text-ink-700">Take a moment to reflect on your progress.</p>
            <div className="space-y-3">
              {[
                { key: 'progress_made' as const, label: 'What progress have I made?' },
                { key: 'challenges' as const, label: 'What challenges have I faced?' },
                { key: 'next_steps' as const, label: 'What will I do next?' },
              ].map((q) => (
                <div key={q.key}>
                  <label className="label">{q.label}</label>
                  <textarea
                    value={reflectionForm[q.key]}
                    onChange={(e) => setReflectionForm((f) => ({ ...f, [q.key]: e.target.value }))}
                    rows={2}
                    className="input resize-none"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowReflection(false)} className="btn-ghost">Cancel</button>
                <button onClick={saveReflection} disabled={savingReflection} className="btn-primary">
                  {savingReflection ? <Spinner className="text-white" /> : <Send size={15} />}
                  Save reflection
                </button>
              </div>
            </div>
          </div>
        )}

        {reflections.length === 0 ? (
          <EmptyState icon={<History size={20} />} title="No reflections yet" description="Reflecting on your progress helps you grow over time." />
        ) : (
          <ol className="relative space-y-5 border-l border-ink-100 pl-5">
            {reflections.map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -left-[26px] top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-brand-500 ring-4 ring-brand-50" />
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-400">
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="badge bg-ink-100 text-ink-600">{r.progress_at_time}% at the time</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  {r.progress_made && <p><span className="font-semibold text-ink-700">Progress: </span><span className="text-ink-600">{r.progress_made}</span></p>}
                  {r.challenges && <p><span className="font-semibold text-ink-700">Challenges: </span><span className="text-ink-600">{r.challenges}</span></p>}
                  {r.next_steps && <p><span className="font-semibold text-ink-700">Next: </span><span className="text-ink-600">{r.next_steps}</span></p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
