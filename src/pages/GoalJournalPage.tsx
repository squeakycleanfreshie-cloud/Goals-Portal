import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import type { Goal, JournalEntry, Mood } from '../lib/types';
import { EmptyState, ProgressBar, Spinner } from '../components/ui';
import {
  BookOpen,
  PlusCircle,
  ArrowLeft,
  Send,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { checkAndAwardBadges, getJournalStreak } from '../lib/badges';
import { fmtDate, timeAgo } from '../lib/date';

const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great', color: 'bg-success-100 border-success-400 text-success-800' },
  { value: 'good', emoji: '🙂', label: 'Good', color: 'bg-brand-100 border-brand-400 text-brand-800' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'bg-ink-100 border-ink-300 text-ink-700' },
  { value: 'tough', emoji: '😔', label: 'Tough', color: 'bg-warning-100 border-warning-400 text-warning-800' },
  { value: 'hard', emoji: '😤', label: 'Hard', color: 'bg-error-100 border-error-400 text-error-800' },
];

function moodStyle(mood: Mood | null) {
  return MOODS.find((m) => m.value === mood) ?? MOODS[2];
}

export function GoalJournalPage({ goalId }: { goalId: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<Mood>('good');
  const [saving, setSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState<Mood>('good');
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const load = useCallback(async () => {
    const [g, e] = await Promise.all([
      supabase.from('goals').select('*').eq('id', goalId).maybeSingle(),
      supabase
        .from('journal_entries')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false }),
    ]);
    setGoal((g.data as Goal) ?? null);
    setEntries((e.data as JournalEntry[]) ?? []);
    setLoading(false);
  }, [goalId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEntry() {
    if (!profile || !goal) return;
    if (content.trim().length < 5) {
      toast.push('error', 'Entry is too short — write at least a few words.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('journal_entries').insert({
      goal_id: goal.id,
      student_id: profile.id,
      content: content.trim(),
      mood,
    });
    if (error) {
      toast.push('error', 'Could not save entry');
      setSaving(false);
      return;
    }

    // badge checks
    const newCount = entries.length + 1;
    const streak = await getJournalStreak(profile.id);
    const { data: reflData } = await supabase
      .from('reflections')
      .select('id')
      .eq('student_id', profile.id);
    const reflCount = (reflData?.length ?? 0);

    const awarded = await checkAndAwardBadges(profile.id, {
      journalCount: newCount,
      journalStreak: streak,
      reflectionCount: reflCount,
    });
    for (const b of awarded) {
      toast.push('success', `Badge unlocked: ${b.replace(/_/g, ' ')}!`);
    }

    setContent('');
    setMood('good');
    setShowCompose(false);
    setSaving(false);
    load();
  }

  async function startEdit(entry: JournalEntry) {
    setEditEntry(entry);
    setEditContent(entry.content);
    setEditMood((entry.mood as Mood) ?? 'good');
  }

  async function saveEdit() {
    if (!editEntry) return;
    if (editContent.trim().length < 5) {
      toast.push('error', 'Entry is too short.');
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from('journal_entries')
      .update({ content: editContent.trim(), mood: editMood, updated_at: new Date().toISOString() })
      .eq('id', editEntry.id);
    setSavingEdit(false);
    if (error) {
      toast.push('error', 'Could not save changes');
      return;
    }
    setEditEntry(null);
    load();
    toast.push('success', 'Entry updated');
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this journal entry?')) return;
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) {
      toast.push('error', 'Could not delete entry');
      return;
    }
    setEntries((list) => list.filter((e) => e.id !== id));
    toast.push('success', 'Entry deleted');
  }

  // group entries by date
  const grouped: { date: string; entries: JournalEntry[] }[] = [];
  for (const entry of entries) {
    const d = new Date(entry.created_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.entries.push(entry);
    } else {
      grouped.push({ date: d, entries: [entry] });
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  if (!goal) {
    return (
      <div className="card">
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Goal not found"
          action={<button onClick={() => navigate({ name: 'student-goals' })} className="btn-primary">Back to goals</button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => navigate({ name: 'student-goal', id: goalId })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft size={15} /> Back to goal
        </button>
      </div>

      {/* Goal header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="badge bg-brand-50 text-brand-700"><BookOpen size={11} /> Journal</span>
            </div>
            <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{goal.title}</h1>
            <p className="mt-1 text-sm text-ink-500">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              {goal.deadline ? ` · Due ${fmtDate(goal.deadline)}` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-brand-700">{goal.progress}%</div>
            <ProgressBar value={goal.progress} className="mt-1 w-24" tone={goal.progress === 100 ? 'success' : 'brand'} />
          </div>
        </div>
      </div>

      {/* Compose button / form */}
      {!showCompose ? (
        <button
          onClick={() => setShowCompose(true)}
          className="btn-primary w-full justify-center py-3"
        >
          <PlusCircle size={18} /> Write a journal entry
        </button>
      ) : (
        <div className="card p-5 animate-slideIn">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">New entry</h2>
            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              <Calendar size={13} />
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>

          <div className="mb-3">
            <label className="label text-xs">How are you feeling about this goal?</label>
            <div className="flex gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${
                    mood === m.value ? m.color + ' border-2' : 'border-ink-100 bg-white text-ink-500 hover:border-ink-200'
                  }`}
                  title={m.label}
                >
                  <span className="text-lg leading-none">{m.emoji}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Write about your progress on "${goal.title}" today... What did you work on? How did it go? What do you want to do next?`}
            rows={6}
            className="input resize-none"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
            <span>{content.length} characters</span>
            <span>Entries are private — only you and your teacher can read them.</span>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowCompose(false); setContent(''); }} className="btn-ghost">
              Cancel
            </button>
            <button onClick={saveEntry} disabled={saving || content.trim().length < 5} className="btn-primary">
              {saving ? <Spinner className="text-white" /> : <Send size={15} />}
              Save entry
            </button>
          </div>
        </div>
      )}

      {/* Entries timeline */}
      {entries.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen size={22} />}
            title="No entries yet"
            description="Start journaling to track your thoughts and progress day by day."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.date}>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-ink-100" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  {group.date}
                </span>
                <div className="h-px flex-1 bg-ink-100" />
              </div>
              <div className="space-y-3">
                {group.entries.map((entry) => {
                  const ms = moodStyle(entry.mood);
                  const isExpanded = expandedId === entry.id || group.entries.length === 1;
                  const isEditing = editEntry?.id === entry.id;

                  return (
                    <div key={entry.id} className="card overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded && group.entries.length > 1 ? null : entry.id)}
                        className="block w-full p-4 text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-base ${ms.color}`}
                              title={ms.label}
                            >
                              {ms.emoji}
                            </span>
                            <div>
                              <p className={`text-sm font-medium text-ink-800 ${!isExpanded ? 'line-clamp-1' : ''}`}>
                                {entry.content.split('\n')[0].slice(0, 80)}{entry.content.length > 80 && !isExpanded ? '…' : ''}
                              </p>
                              <p className="text-[11px] text-ink-400">{timeAgo(entry.created_at)}</p>
                            </div>
                          </div>
                          {group.entries.length > 1 && (
                            isExpanded
                              ? <ChevronDown size={15} className="flex-shrink-0 text-ink-400" />
                              : <ChevronRight size={15} className="flex-shrink-0 text-ink-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-ink-50 px-4 pb-4 animate-fadeIn">
                          {isEditing ? (
                            <div className="mt-3 space-y-3">
                              <div className="flex gap-2">
                                {MOODS.map((m) => (
                                  <button
                                    key={m.value}
                                    type="button"
                                    onClick={() => setEditMood(m.value)}
                                    className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-2 text-xs font-semibold transition-all ${
                                      editMood === m.value ? m.color : 'border-ink-100 bg-white text-ink-500'
                                    }`}
                                  >
                                    <span className="text-lg leading-none">{m.emoji}</span>
                                  </button>
                                ))}
                              </div>
                              <textarea
                                autoFocus
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={5}
                                className="input resize-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditEntry(null)} className="btn-ghost">Cancel</button>
                                <button onClick={saveEdit} disabled={savingEdit} className="btn-primary">
                                  {savingEdit ? <Spinner className="text-white" /> : <Send size={14} />}
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <p className="whitespace-pre-wrap text-sm text-ink-700">{entry.content}</p>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-[11px] text-ink-400">
                                  {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  {entry.updated_at !== entry.created_at ? ' · edited' : ''}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startEdit(entry)}
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-500 hover:bg-ink-100 hover:text-ink-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteEntry(entry.id)}
                                    className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-error-50 hover:text-error-600"
                                    aria-label="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
