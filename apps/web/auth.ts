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
        params: {
          scope: "openid profile email w_member_social w_organization_social",
        },
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
          // FIX: NextAuth v5 clears the JWT when starting a new OAuth flow without a database.
          // We must manually extract our existing NestJS accessToken from the previous cookie!
          let existingAccessToken = token.accessToken;
          let existingRole = token.role;

          if (!existingAccessToken) {
            const { cookies } = await import("next/headers");
            const { decode } = await import("next-auth/jwt");
            const cookieStore = await cookies();
            const sessionToken =
              cookieStore.get("authjs.session-token")?.value ||
              cookieStore.get("__Secure-authjs.session-token")?.value ||
              cookieStore.get("next-auth.session-token")?.value ||
              cookieStore.get("__Secure-next-auth.session-token")?.value;

            if (sessionToken && process.env.AUTH_SECRET) {
              // Determine the exact cookie name that was found to use as the salt
              const cookieName = cookieStore.has(
                "__Secure-authjs.session-token",
              )
                ? "__Secure-authjs.session-token"
                : cookieStore.has("authjs.session-token")
                  ? "authjs.session-token"
                  : cookieStore.has("__Secure-next-auth.session-token")
                    ? "__Secure-next-auth.session-token"
                    : "next-auth.session-token";

              const decoded = await decode({
                token: sessionToken,
                secret: process.env.AUTH_SECRET,
                salt: cookieName,
              });
              if (decoded?.accessToken) {
                existingAccessToken = decoded.accessToken;
                existingRole = decoded.role;

                // Preserve them in the NEW token NextAuth is creating
                token.accessToken = existingAccessToken;
                token.role = existingRole;
              }
            }
          }

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
              headers: { Authorization: `Bearer ${existingAccessToken}` },
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
