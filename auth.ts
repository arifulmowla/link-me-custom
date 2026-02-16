import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "development" ? "dev-only-insecure-auth-secret" : undefined);

export const authConfig = {
  adapter: PrismaAdapter(db),
  secret: authSecret,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "missing-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "missing-google-client-secret",
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
