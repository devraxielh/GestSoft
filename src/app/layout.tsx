import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"
import AuthProvider from "@/components/AuthProvider"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })

export const metadata: Metadata = {
  title: "Certificados Online",
  description: "Sistema de gestión de certificados",
}

import { Toaster } from "react-hot-toast"
import DynamicTheme from "@/components/DynamicTheme"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${outfit.variable} font-outfit antialiased`}>
        <DynamicTheme />
        <AuthProvider>
          <Toaster position="top-right" containerStyle={{ zIndex: 9999999 }} toastOptions={{ duration: 4000, style: { fontSize: '14px' } }} />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
