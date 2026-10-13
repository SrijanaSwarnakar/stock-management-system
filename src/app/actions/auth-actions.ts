"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password. Please check your credentials." };
        default:
          return { error: "Authentication failed. Please try again." };
      }
    }
    // Re-throw redirect errors so Next.js handles navigation
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
