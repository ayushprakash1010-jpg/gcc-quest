import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import LinkedIn from "next-auth/providers/linkedin";
import apiClient from "./src/lib/api/api-client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          // This calls the NestJS API
          const res = await apiClient.post("/auth/login", {
            email: credentials.email,
            password: credentials.password,
          });

          if (res.data?.accessToken) {
            // Fetch profile
            const profileRes = await apiClient.get("/auth/me", {
              headers: { Authorization: `Bearer ${res.data.accessToken}` },
            });

            return {
              id: profileRes.data?.id,
              name: profileRes.data?.name,
              email: profileRes.data?.email,
              role: profileRes.data?.role,
              accessToken: res.data.accessToken,
            };
          }

          return null;
        } catch (_e) {
          console.error("Authorize Error:", _e);
          return null;
        }
      },
    }),
    LinkedIn({
      clientId: process.env.AUTH_LINKEDIN_ID,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET,
      authorization: {
        params: { scope: "openid profile email w_member_social" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && (user as { accessToken?: string }).accessToken) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.role = (user as { role?: string }).role;
      }

      if (account && account.provider === "linkedin") {
        try {
          // Sync the LinkedIn token with our NestJS backend
          await apiClient.post(
            "/auth/oauth-connect",
            {
              provider: "linkedin",
              providerAccountId: account.providerAccountId,
              accessToken: account.access_token,
              expiresAt: account.expires_at,
            },
            {
              headers: { Authorization: `Bearer ${token.accessToken}` },
            },
          );
        } catch (e) {
          console.error("Failed to link LinkedIn account to backend:", e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session as { accessToken?: unknown }).accessToken = token.accessToken;
      if (session.user) {
        (session.user as { role?: unknown }).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
