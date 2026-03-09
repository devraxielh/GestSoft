"use client"
import { useEffect, useState } from "react"

export default function DynamicTheme() {
    const [theme, setTheme] = useState({
        primaryColor: "#465fff",
        secondaryColor: "#475467",
        successColor: "#12b76a",
        confirmColor: "#f79009"
    })

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/configuracion")
                if (res.ok) {
                    const data = await res.json()
                    const newTheme = {
                        primaryColor: data.primaryColor || "#465fff",
                        secondaryColor: data.secondaryColor || "#475467",
                        successColor: data.successColor || "#12b76a",
                        confirmColor: data.confirmColor || "#f79009"
                    }
                    setTheme(newTheme)

                    document.documentElement.style.setProperty('--primary-color', newTheme.primaryColor)
                    document.documentElement.style.setProperty('--secondary-color', newTheme.secondaryColor)
                    document.documentElement.style.setProperty('--success-color', newTheme.successColor)
                    document.documentElement.style.setProperty('--confirm-color', newTheme.confirmColor)

                    if (data.logoUrl) {
                        updateFavicon(data.logoUrl)
                    }
                    // Dispatch an event with the fetched configuration
                    window.dispatchEvent(new CustomEvent('config-updated', {
                        detail: { ...newTheme, logoUrl: data.logoUrl }
                    }));
                }
            } catch (err) {
                console.error("Error loading dynamic theme:", err)
            }
        }
        fetchConfig()

        // Listen for internal configuration updates to sync instantly
        const handleConfigUpdate = (event: any) => {
            const updates = event.detail
            if (updates) {
                setTheme(prev => {
                    const next = { ...prev, ...updates }
                    if (updates.primaryColor) document.documentElement.style.setProperty('--primary-color', updates.primaryColor)
                    if (updates.secondaryColor) document.documentElement.style.setProperty('--secondary-color', updates.secondaryColor)
                    if (updates.successColor) document.documentElement.style.setProperty('--success-color', updates.successColor)
                    if (updates.confirmColor) document.documentElement.style.setProperty('--confirm-color', updates.confirmColor)
                    return next
                })
            }
            if (updates?.logoUrl) {
                updateFavicon(updates.logoUrl)
            }
        }

        const updateFavicon = (url: string) => {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
            if (!link) {
                link = document.createElement('link')
                link.rel = 'icon'
                document.getElementsByTagName('head')[0].appendChild(link)
            }
            link.href = url
        }

        window.addEventListener('config-updated', handleConfigUpdate as EventListener)
        return () => window.removeEventListener('config-updated', handleConfigUpdate as EventListener)
    }, [])

    return (
        <style jsx global>{`
            :root {
                --primary-color: ${theme.primaryColor};
                --secondary-color: ${theme.secondaryColor};
                --success-color: ${theme.successColor};
                --confirm-color: ${theme.confirmColor};
            }
        `}</style>
    )
}
