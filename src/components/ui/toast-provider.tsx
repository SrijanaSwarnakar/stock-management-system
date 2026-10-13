"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} />,
  error:   <AlertCircle size={16} />,
  info:    <Info size={16} />,
  warning: <AlertTriangle size={16} />,
};

const COLORS: Record<ToastType, string> = {
  success: "#10b981",
  error:   "#ef4444",
  info:    "#3b82f6",
  warning: "#f59e0b",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const success = useCallback((t: string, m?: string) => toast("success", t, m), [toast]);
  const error   = useCallback((t: string, m?: string) => toast("error",   t, m), [toast]);
  const info    = useCallback((t: string, m?: string) => toast("info",    t, m), [toast]);
  const warning = useCallback((t: string, m?: string) => toast("warning", t, m), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, info, warning, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-in"
            style={{
              background: "white",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
              padding: "0.875rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem",
              minWidth: "280px",
              maxWidth: "380px",
              borderLeft: `4px solid ${COLORS[t.type]}`,
            }}
          >
            <span style={{ color: COLORS[t.type], flexShrink: 0, marginTop: "1px" }}>
              {ICONS[t.type]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>
                {t.title}
              </p>
              {t.message && (
                <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", color: "#6b7280" }}>
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px", flexShrink: 0 }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
