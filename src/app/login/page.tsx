import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: `Sign In | ${APP_NAME}`,
  description: "Secure role-based sign in for wholesale operations and stock management.",
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
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background radial effects */}
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

      {/* Login Card */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "1.5rem",
          backdropFilter: "blur(20px)",
          padding: "2.5rem",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Company Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "1rem",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.375rem",
              fontWeight: 800,
              color: "white",
              margin: "0 auto 1rem",
              boxShadow: "0 8px 24px rgba(99,102,241,0.5)",
            }}
          >
            SG
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
            {APP_NAME}
          </h1>
          <p
            style={{
              margin: "0.375rem 0 0",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Wholesale Trading & Inventory Portal
          </p>
        </div>

        {/* Interactive Client Login Form */}
        <LoginForm />

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Protected by role-based access control • Kalimati, Kathmandu
        </div>
      </div>
    </div>
  );
}
