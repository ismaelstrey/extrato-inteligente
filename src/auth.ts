import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sendTwoFactorCodeEmail } from "@/server/email/sendTwoFactorCodeEmail";

function generateTwoFactorCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function hashTwoFactorCode(input: { userId: string; code: string }) {
  const secret = process.env["NEXTAUTH_SECRET"] ?? process.env["AUTH_SECRET"] ?? "";
  return crypto
    .createHash("sha256")
    .update(`${input.userId}|${input.code}|${secret}`)
    .digest("hex");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env["NEXTAUTH_SECRET"] ?? process.env["AUTH_SECRET"],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        twoFactorCode: { type: "text" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
            twoFactorCode: z.string().trim().min(1).max(12).optional(),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const email = parsed.data.email.trim();
        const password = parsed.data.password;

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (!user?.passwordHash) return null;
        if (!user.active) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        if (user.twoFactorEnabled) {
          const provided = parsed.data.twoFactorCode;
          if (!provided) {
            const code = generateTwoFactorCode();
            const identifier = `2fa:${user.id}`;
            const token = hashTwoFactorCode({ userId: user.id, code });
            const expires = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.verificationToken.deleteMany({ where: { identifier } });
            await prisma.verificationToken.create({ data: { identifier, token, expires } });

            try {
              await sendTwoFactorCodeEmail({ to: user.email, code });
            } catch (error) {
              await prisma.verificationToken.deleteMany({ where: { identifier } });
              if (String(error).includes("SMTP_NOT_CONFIGURED")) {
                throw new Error("2FA_UNAVAILABLE");
              }
              throw new Error("2FA_DELIVERY_FAILED");
            }

            throw new Error("2FA_REQUIRED");
          }

          const identifier = `2fa:${user.id}`;
          const token = hashTwoFactorCode({ userId: user.id, code: provided });
          const match = await prisma.verificationToken.findFirst({
            where: { identifier, token, expires: { gt: new Date() } },
            select: { token: true },
          });
          if (!match) throw new Error("2FA_INVALID");
          await prisma.verificationToken.deleteMany({ where: { identifier } });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.clientId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.clientId = user.clientId;
        token.role = user.role;
      }

      if (!token.id && token.sub) token.id = token.sub;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? token.sub) as string;
        session.user.clientId = token.clientId as string;
        session.user.role = token.role as Role;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
