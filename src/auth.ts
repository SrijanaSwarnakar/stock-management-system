import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";
import { Role } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const PRIMARY_ADMIN_EMAIL = "srijanashah47@gmail.com";
const PRIMARY_ADMIN_PASS = "$Tock234";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Primary Administrator authentication check
        if (normalizedEmail === PRIMARY_ADMIN_EMAIL && password === PRIMARY_ADMIN_PASS) {
          try {
            // Attempt to ensure user exists in DB for foreign key relationships
            const dbAdmin = await db.user.upsert({
              where: { email: PRIMARY_ADMIN_EMAIL },
              update: {
                isActive: true,
                role: Role.ADMIN,
              },
              create: {
                name: "Srijana Shah",
                email: PRIMARY_ADMIN_EMAIL,
                passwordHash: await bcrypt.hash(PRIMARY_ADMIN_PASS, 10),
                role: Role.ADMIN,
                phone: "+977-9851000000",
                isActive: true,
              },
            });

            return {
              id: dbAdmin.id,
              name: dbAdmin.name,
              email: dbAdmin.email,
              role: dbAdmin.role,
            };
          } catch (error) {
            console.warn("Database not accessible, logging in with system admin profile:", error);
            return {
              id: "usr_admin_srijana",
              name: "Srijana Shah",
              email: PRIMARY_ADMIN_EMAIL,
              role: Role.ADMIN,
            };
          }
        }

        // 2. Standard Database user lookup
        try {
          const user = await db.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (!user || !user.isActive) return null;

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth database authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
});
