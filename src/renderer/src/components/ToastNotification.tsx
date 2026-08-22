import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: "success" | "info" | "error";
}

let toastListeners: Array<(toast: ToastMessage) => void> = [];

export const showToast = (title: string, message: string, type: "success" | "info" | "error" = "success") => {
  const toast: ToastMessage = {
    id: `toast_${Date.now()}_${Math.random()}`,
    title,
    message,
    type,
  };
  toastListeners.forEach((listener) => listener(toast));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleNewToast = (newToast: ToastMessage) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    toastListeners.push(handleNewToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== handleNewToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/95 border border-emerald-500/40 text-foreground shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="text-xs font-bold text-white">{toast.title}</h4>
            <p className="text-[11px] text-slate-300 leading-tight">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
