import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    clientId?: string;
    role?: Role;
  }

  interface Session {
    user: {
      id: string;
      clientId: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    clientId?: string;
    role?: Role;
  }
}
