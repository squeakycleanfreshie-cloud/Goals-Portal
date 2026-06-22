import { useState } from 'react';
import { Sparkles, X, RefreshCw } from 'lucide-react';

type SmartFields = {
  title: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  time_based: string;
  deadline: string;
};

type Suggestion = {
  field: keyof SmartFields | 'general';
  label: string;
  tip: string;
};

function analyse(fields: SmartFields): Suggestion[] {
  const tips: Suggestion[] = [];

  // Title
  if (fields.title.length > 0 && fields.title.length < 8) {
    tips.push({ field: 'title', label: 'Goal title', tip: 'Your title is quite short. Try being more descriptive, e.g. "Improve my algebra grade this term".' });
  }
  if (/^(be|get|do|have)\b/i.test(fields.title.trim())) {
    tips.push({ field: 'title', label: 'Goal title', tip: 'Starting with a strong action verb makes your goal clearer. Try "Improve", "Complete", "Achieve", or "Learn" instead.' });
  }

  // Specific
  if (fields.specific.trim().length > 0 && fields.specific.trim().length < 30) {
    tips.push({ field: 'specific', label: 'Specific', tip: 'Add more detail here. Answer: what exactly will you do, where, and how often?' });
  }
  if (/\b(maybe|try to|hopefully|might)\b/i.test(fields.specific)) {
    tips.push({ field: 'specific', label: 'Specific', tip: 'Avoid uncertain words like "maybe" or "try to". Use firm language: "I will complete…"' });
  }

  // Measurable
  if (fields.measurable.trim().length > 0 && !/\d/.test(fields.measurable)) {
    tips.push({ field: 'measurable', label: 'Measurable', tip: 'Great goals include a number. E.g. "3 worksheets per week" or "score above 75%".' });
  }
  if (fields.measurable.trim().length < 20 && fields.measurable.trim().length > 0) {
    tips.push({ field: 'measurable', label: 'Measurable', tip: 'Describe how you\'ll track success: a score, count, grade, or observable outcome.' });
  }

  // Achievable
  if (fields.achievable.trim().length > 0 && !/(\d+\s*(min|hour|h|minute|day|week|session))/i.test(fields.achievable)) {
    tips.push({ field: 'achievable', label: 'Achievable', tip: 'Mention a specific time commitment, e.g. "20 minutes each day" or "two sessions per week".' });
  }

  // Relevant
  if (fields.relevant.trim().length > 0 && !/\b(because|so that|to|improve|help|will|want)\b/i.test(fields.relevant)) {
    tips.push({ field: 'relevant', label: 'Relevant', tip: 'Explain WHY this matters to you personally. Start with "because" or "so that" to connect it to something bigger.' });
  }

  // Time-based
  if (fields.time_based.trim().length > 0 && !/\b(term|week|month|by|end|date|january|february|march|april|may|june|july|august|september|october|november|december|\d{4})\b/i.test(fields.time_based)) {
    tips.push({ field: 'time_based', label: 'Time-based', tip: 'Reference a real deadline: "By the end of Term 2" or "By 30 June 2025".' });
  }

  // Deadline
  if (!fields.deadline && fields.time_based.trim().length > 0) {
    tips.push({ field: 'deadline', label: 'Deadline', tip: 'You\'ve written a timeframe — set a calendar deadline too so the portal can track it for you!' });
  }

  // General encouragement if everything looks good
  if (tips.length === 0 && fields.specific.trim().length > 0) {
    tips.push({ field: 'general', label: 'Looking great!', tip: 'Your SMART goal is well-written. Remember to add milestones to track smaller steps along the way.' });
  }

  return tips.slice(0, 4);
}

const FIELD_COLORS: Record<string, string> = {
  title: 'bg-brand-50 text-brand-700 border-brand-200',
  specific: 'bg-success-50 text-success-800 border-success-200',
  measurable: 'bg-warning-50 text-warning-800 border-warning-200',
  achievable: 'bg-ink-100 text-ink-800 border-ink-200',
  relevant: 'bg-brand-50 text-brand-700 border-brand-200',
  time_based: 'bg-error-50 text-error-700 border-error-200',
  deadline: 'bg-warning-50 text-warning-800 border-warning-200',
  general: 'bg-success-50 text-success-800 border-success-200',
};

export function AiSuggestions({ fields }: { fields: SmartFields }) {
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const filledCount = [fields.title, fields.specific, fields.measurable, fields.achievable, fields.relevant, fields.time_based]
    .filter((v) => v.trim().length > 3).length;

  if (filledCount < 2) return null;

  const suggestions = analyse(fields);

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <Sparkles size={15} className="text-brand-500" />
          Get AI writing tips
          {suggestions.length > 0 && (
            <span className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {suggestions.length}
            </span>
          )}
        </button>
      ) : (
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 animate-slideIn">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-600" />
              <span className="text-sm font-bold text-ink-900">Smart writing tips</span>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setRefresh((r) => r + 1)}
                className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                aria-label="Refresh"
                title="Re-analyse"
              >
                <RefreshCw size={13} className={refresh > 0 ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                aria-label="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <p className="text-sm text-ink-500">Fill in more fields above to get suggestions.</p>
          ) : (
            <ul className="space-y-2.5">
              {suggestions.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${FIELD_COLORS[s.field]}`}
                  >
                    {s.label}
                  </span>
                  <p className="text-sm text-ink-700">{s.tip}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
