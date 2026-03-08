"use client"
import { useEffect, useState } from "react"

export default function DynamicTheme() {
    const [color, setColor] = useState("#465fff")

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/configuracion")
                if (res.ok) {
                    const data = await res.json()
                    if (data.primaryColor) {
                        setColor(data.primaryColor)
                        document.documentElement.style.setProperty('--primary-color', data.primaryColor)
                    }
                    if (data.logoUrl) {
                        updateFavicon(data.logoUrl)
                    }
                    // Dispatch an event with the fetched configuration
                    window.dispatchEvent(new CustomEvent('config-updated', {
                        detail: { primaryColor: data.primaryColor, logoUrl: data.logoUrl }
                    }));
                }
            } catch (err) {
                console.error("Error loading dynamic theme:", err)
            }
        }
        fetchConfig()

        // Listen for internal configuration updates to sync instantly
        const handleConfigUpdate = (event: any) => {
            if (event.detail?.primaryColor) {
                setColor(event.detail.primaryColor)
                document.documentElement.style.setProperty('--primary-color', event.detail.primaryColor)
            }
            if (event.detail?.logoUrl) {
                updateFavicon(event.detail.logoUrl)
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
                --primary-color: ${color};
            }
        `}</style>
    )
}
