import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            permissions: string[]
            image?: string | null
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        id: string
        role: string
        permissions: string[]
        image?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string
        role: string
        permissions: string[]
        image?: string | null
    }
}
