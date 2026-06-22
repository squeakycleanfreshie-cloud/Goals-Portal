import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; type: ToastType; message: string };

const ToastContext = createContext<{
  push: (type: ToastType, message: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5">
        {toasts.map((t) => {
          const Icon =
            t.type === 'success'
              ? CheckCircle2
              : t.type === 'error'
              ? AlertCircle
              : Info;
          const tone =
            t.type === 'success'
              ? 'text-success-600 bg-success-50 border-success-200'
              : t.type === 'error'
              ? 'text-error-600 bg-error-50 border-error-200'
              : 'text-brand-600 bg-brand-50 border-brand-200';
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-pop animate-slideIn max-w-sm ${tone}`}
            >
              <Icon size={18} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-ink-800 flex-1">
                {t.message}
              </p>
              <button
                onClick={() =>
                  setToasts((list) => list.filter((x) => x.id !== t.id))
                }
                className="text-ink-400 hover:text-ink-700 transition-colors"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
