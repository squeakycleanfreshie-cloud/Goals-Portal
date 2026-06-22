import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/ui';
import { AiSuggestions } from '../components/AiSuggestions';
import { checkAndAwardBadges } from '../lib/badges';
import { ArrowLeft, ArrowRight, Check, Calendar, Sparkles, Plus } from 'lucide-react';

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { key: 'title', label: 'Goal title', prompt: 'What do you want to call this goal?', hint: 'Give it a short, memorable name.', placeholder: 'e.g. Improve my essay writing', field: 'title' as const },
  { key: 'specific', label: 'Specific', prompt: 'What exactly do you want to achieve?', hint: 'Be precise. Avoid vague words like "be better".', placeholder: 'e.g. Complete extra algebra practice each week', field: 'specific' as const },
  { key: 'measurable', label: 'Measurable', prompt: 'How will you measure success?', hint: 'Use numbers, counts, grades, or observable outcomes.', placeholder: 'e.g. Complete 3 worksheets per week', field: 'measurable' as const },
  { key: 'achievable', label: 'Achievable', prompt: 'What steps will you take?', hint: 'List concrete actions you can realistically do.', placeholder: 'e.g. Spend 20 minutes after school every day', field: 'achievable' as const },
  { key: 'relevant', label: 'Relevant', prompt: 'Why does this matter to you?', hint: 'Explain how this goal helps you grow.', placeholder: 'e.g. Improve my test results this term', field: 'relevant' as const },
];

export function CreateGoalPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState({ title: '', specific: '', measurable: '', achievable: '', relevant: '', time_based: '', deadline: '' });
  const [milestones, setMilestones] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const current = STEPS[step];
  const isFinalStep = step === 5;
  const currentValue = step < 5 ? (form[current.field as keyof typeof form] as string) : '';
  const canContinue = step < 5 ? currentValue.trim().length >= 3 : form.time_based.trim().length >= 3 || form.deadline !== '';

  async function submit() {
    if (!profile) return;
    setSubmitting(true);
    try {
      const payload = {
        student_id: profile.id,
        title: form.title.trim(),
        specific: form.specific.trim(),
        measurable: form.measurable.trim(),
        achievable: form.achievable.trim(),
        relevant: form.relevant.trim(),
        time_based: form.time_based.trim() || form.deadline,
        deadline: form.deadline ? new Date(form.deadline + 'T23:59:59').toISOString() : null,
        progress: 0,
        status: 'active',
      };
      const { data, error } = await supabase.from('goals').insert(payload).select().single();
      if (error) throw error;
      const goal = data as { id: string };

      const validMilestones = milestones.map((m) => m.trim()).filter((m) => m.length > 0);
      if (validMilestones.length > 0) {
        await supabase.from('milestones').insert(
          validMilestones.map((title, i) => ({ goal_id: goal.id, title, completed: false, position: i }))
        );
      }

      // Count goals to check for badges
      const { count } = await supabase.from('goals').select('id', { count: 'exact', head: true }).eq('student_id', profile.id);
      const awarded = await checkAndAwardBadges(profile.id, {
        goalCreated: true,
        goalId: goal.id,
        totalGoals: count ?? 1,
      });
      for (const b of awarded) {
        const labels: Record<string, string> = { first_goal: '🎯 Goal Setter badge unlocked!', five_goals: '🌟 Ambitious badge unlocked!' };
        toast.push('success', labels[b] ?? `Badge: ${b}!`);
      }

      toast.push('success', 'Goal created!');
      navigate({ name: 'student-goal', id: goal.id });
    } catch (err: unknown) {
      toast.push('error', err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <button onClick={() => navigate({ name: 'student-goals' })} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800">
          <ArrowLeft size={15} /> Back to goals
        </button>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Create a SMART goal</h1>
        <p className="mt-1 text-sm text-ink-500">Work through each letter of SMART to build a goal you can actually reach.</p>
      </header>

      {/* Stepper */}
      <ol className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.key} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => i <= step && setStep(i as Step)}
                className={`flex items-center gap-2 ${active ? 'opacity-100' : done ? 'opacity-80' : 'opacity-50'}`}
              >
                <span className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-xs font-bold transition-all ${done ? 'bg-success-500 text-white' : active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}`}>
                  {done ? <Check size={13} /> : i + 1}
                </span>
                <span className={`hidden text-xs font-semibold sm:inline ${active ? 'text-ink-900' : 'text-ink-500'}`}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`mx-1.5 h-0.5 flex-1 rounded-full ${i < step ? 'bg-success-500' : 'bg-ink-100'}`} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="card p-6 sm:p-7 animate-fadeIn" key={step}>
        {!isFinalStep ? (
          <div>
            <div className="mb-1">
              <span className="badge bg-brand-50 text-brand-700 uppercase tracking-wide">{current.label}</span>
            </div>
            <h2 className="text-xl font-bold text-ink-900">{current.prompt}</h2>
            <p className="mt-1 text-sm text-ink-500">{current.hint}</p>
            <textarea
              autoFocus
              value={currentValue}
              onChange={(e) => update(current.field, e.target.value)}
              placeholder={current.placeholder}
              rows={4}
              className="input mt-4 resize-none"
            />
            <div className="mt-2 text-right text-[11px] text-ink-400">{currentValue.trim().length} characters</div>

            {/* AI suggestions panel — shows when enough content is filled */}
            <AiSuggestions fields={form} />
          </div>
        ) : (
          <div>
            <div className="mb-1">
              <span className="badge bg-brand-50 text-brand-700 uppercase tracking-wide">
                <Calendar size={11} /> Time-based
              </span>
            </div>
            <h2 className="text-xl font-bold text-ink-900">When will you complete this goal?</h2>
            <p className="mt-1 text-sm text-ink-500">Set a target completion date and describe the timeframe.</p>

            <label className="label mt-4">Target date</label>
            <input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} className="input" />

            <label className="label mt-4">Describe the timeframe</label>
            <textarea value={form.time_based} onChange={(e) => update('time_based', e.target.value)} placeholder="e.g. By the end of Term 2" rows={2} className="input resize-none" />

            <AiSuggestions fields={form} />

            <div className="mt-6 border-t border-ink-100 pt-5">
              <label className="label flex items-center gap-1.5">
                <Plus size={14} /> Milestones <span className="font-normal text-ink-400">(optional)</span>
              </label>
              <p className="mb-3 text-xs text-ink-500">Add checkpoints so you can track smaller wins along the way.</p>
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={m}
                      onChange={(e) => setMilestones((list) => list.map((x, idx) => idx === i ? e.target.value : x))}
                      placeholder={`Milestone ${i + 1}`}
                      className="input"
                    />
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMilestones((list) => list.filter((_, idx) => idx !== i))}
                        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-error-50 hover:text-error-600"
                        aria-label="Remove milestone"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setMilestones((list) => [...list, ''])} className="btn-secondary mt-1">
                  <Plus size={15} /> Add milestone
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(s - 1, 0) as Step)} disabled={step === 0} className="btn-ghost">
          <ArrowLeft size={16} /> Back
        </button>
        {!isFinalStep ? (
          <button onClick={() => setStep((s) => Math.min(s + 1, 5) as Step)} disabled={!canContinue} className="btn-primary">
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={submit} disabled={submitting} className="btn-success">
            {submitting ? <Spinner className="text-white" /> : <Sparkles size={16} />}
            Create goal
          </button>
        )}
      </div>
    </div>
  );
}
