"use client";

import React, { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth-actions";
import { Lock, Mail, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, UserCheck, ShoppingBag, Boxes } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    role: "Admin",
    title: "Owner / Full Access",
    email: "admin@shreeganesh.com.np",
    password: "Admin@123Password",
    icon: ShieldCheck,
    color: "#6366f1",
  },
  {
    role: "Manager",
    title: "Operations & Reports",
    email: "manager@shreeganesh.com.np",
    password: "Manager@123Password",
    icon: UserCheck,
    color: "#10b981",
  },
  {
    role: "Sales",
    title: "Billing & Receipts",
    email: "sales@shreeganesh.com.np",
    password: "Sales@123Password",
    icon: ShoppingBag,
    color: "#f59e0b",
  },
  {
    role: "Inventory",
    title: "Stock & Purchases",
    email: "inventory@shreeganesh.com.np",
    password: "Inventory@123Password",
    icon: Boxes,
    color: "#8b5cf6",
  },
];

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    startTransition(async () => {
      try {
        const result = await loginAction(undefined, formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: any) {
        // Next.js redirect may throw an expected navigation error
        if (err?.message?.includes("NEXT_REDIRECT")) return;
        setError("An unexpected error occurred during sign in.");
      }
    });
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Quick-fill Demo Accounts Pills */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "rgba(255,255,255,0.6)",
            marginBottom: "0.5rem",
          }}
        >
          Quick Demo Accounts:
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
          }}
        >
          {DEMO_ACCOUNTS.map((acc) => {
            const Icon = acc.icon;
            const isSelected = email === acc.email;
            return (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleFillDemo(acc.email, acc.password)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.625rem",
                  borderRadius: "0.5rem",
                  background: isSelected ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.06)",
                  border: isSelected ? "1px solid #818cf8" : "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "0.375rem",
                    background: `${acc.color}20`,
                    color: acc.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.2 }}>{acc.role}</div>
                  <div style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {acc.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 0.875rem",
            borderRadius: "0.5rem",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
            fontSize: "0.8125rem",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label
            htmlFor="login-email"
            style={{
              display: "block",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.8)",
              marginBottom: "0.375rem",
            }}
          >
            Email Address
          </label>
          <div style={{ position: "relative" }}>
            <Mail
              size={16}
              style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)",
              }}
            />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@shreeganesh.com.np"
              required
              autoComplete="email"
              disabled={isPending}
              style={{
                width: "100%",
                padding: "0.6875rem 0.875rem 0.6875rem 2.5rem",
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: "0.625rem",
                color: "white",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="login-password"
            style={{
              display: "block",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.8)",
              marginBottom: "0.375rem",
            }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <Lock
              size={16}
              style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)",
              }}
            />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              disabled={isPending}
              style={{
                width: "100%",
                padding: "0.6875rem 2.5rem 0.6875rem 2.5rem",
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: "0.625rem",
                color: "white",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={isPending}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: "0.625rem",
            color: "white",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.75 : 1,
            transition: "opacity 0.15s, transform 0.15s",
            marginTop: "0.5rem",
            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          {isPending ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              <span>Signing In...</span>
            </>
          ) : (
            <span>Sign In to Dashboard</span>
          )}
        </button>
      </form>
    </div>
  );
}
