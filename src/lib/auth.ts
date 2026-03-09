import { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { roles: { include: { permissions: true } } }
                })

                if (!user || !user.active) return null

                const isValid = await bcrypt.compare(credentials.password, user.password)
                if (!isValid) return null

                const rolesConcat = user.roles.map(r => r.name).join(", ")
                const allPermissions = Array.from(new Set(user.roles.flatMap(r => r.permissions.map(p => p.name))))

                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.name,
                    role: rolesConcat,
                    permissions: allPermissions,
                    image: user.image
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role
                token.permissions = user.permissions
                token.id = user.id
                token.image = user.image
            }
            if (trigger === "update" && session) {
                if (session.user?.name) token.name = session.user.name
                if (session.user?.email) token.email = session.user.email
                if (session.user?.image) token.image = session.user.image
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string
                session.user.permissions = token.permissions as string[]
                session.user.id = token.id as string
                session.user.image = token.image as string
            }
            return session
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
}
