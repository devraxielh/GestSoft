"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { SidebarProvider } from "@/context/SidebarContext"
import AppSidebar from "@/layout/AppSidebar"
import AppHeader from "@/layout/AppHeader"
import Backdrop from "@/layout/Backdrop"
import { useSidebar } from "@/context/SidebarContext"

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { isExpanded, isHovered } = useSidebar()

    return (
        <div className="flex h-screen overflow-hidden">
            <AppSidebar />
            <Backdrop />
            <div
                className={`relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden transition-all duration-300 ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
                    }`}
            >
                <AppHeader />
                <main className="p-6 mx-auto w-full max-w-[1440px] md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login")
        }
    }, [status, router])

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium text-sm">Cargando...</p>
                </div>
            </div>
        )
    }

    if (!session) return null

    return (
        <SidebarProvider>
            <DashboardContent>{children}</DashboardContent>
        </SidebarProvider>
    )
}
