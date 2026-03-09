import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    permissions: string[];
    image?: string | null;
  }

  interface Session {
    user: User & {
      id: string;
      role: string;
      permissions: string[];
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    permissions: string[];
    image?: string | null;
  }
}
