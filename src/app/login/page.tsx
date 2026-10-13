import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sign In | ${APP_NAME}`,
  description: "Sign in to access the wholesale management system.",
};

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.3), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "10%",
          left: "-10%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(99,102,241,0.08)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "10%",
          right: "-10%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "rgba(139,92,246,0.08)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Login card */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "1.5rem",
          backdropFilter: "blur(20px)",
          padding: "2.5rem",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          position: "relative",
          zIndex: 1,
          animation: "fadeIn 0.3s ease-out",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "1rem",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "white",
              margin: "0 auto 1rem",
              boxShadow: "0 8px 24px rgba(99,102,241,0.5)",
            }}
            aria-label="Himalayan Traders logo"
          >
            HT
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.03em",
            }}
          >
            Himalayan Traders
          </h1>
          <p
            style={{
              margin: "0.375rem 0 0",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Wholesale Management System
          </p>
        </div>

        {/* Form */}
        <form
          aria-label="Sign in form"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              htmlFor="login-email"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                marginBottom: "0.375rem",
              }}
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="admin@himalayan.com"
              required
              style={{
                width: "100%",
                padding: "0.6875rem 0.875rem",
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: "0.625rem",
                color: "white",
                fontSize: "0.9375rem",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                marginBottom: "0.375rem",
              }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "0.6875rem 0.875rem",
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: "0.625rem",
                color: "white",
                fontSize: "0.9375rem",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Error placeholder */}
          <div
            id="login-error"
            role="alert"
            aria-live="polite"
            style={{ display: "none", color: "#fca5a5", fontSize: "0.8125rem", textAlign: "center" }}
          />

          <button
            id="login-submit"
            type="submit"
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              border: "none",
              borderRadius: "0.625rem",
              color: "white",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.15s",
              marginTop: "0.5rem",
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            }}
          >
            Sign In
          </button>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          Authentication will be wired in Phase 4
        </p>
      </div>
    </div>
  );
}
