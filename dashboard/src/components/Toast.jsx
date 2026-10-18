import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';

const iconMap   = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info };
const styleMap  = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200  bg-amber-50  text-amber-800',
  danger:  'border-red-200    bg-red-50    text-red-800',
  info:    'border-blue-200   bg-blue-50   text-blue-800',
};

export function Toast({ id, message, type = 'info', onRemove }) {
  const Icon  = iconMap[type]  || Info;
  const style = styleMap[type] || styleMap.info;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 4500);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-card animate-slide-in-right ${style}`}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="shrink-0 opacity-50 transition hover:opacity-100"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
