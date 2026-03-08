import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get("file") as File | null

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

        const uploadDir = join(process.cwd(), "public/uploads")
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const path = join(uploadDir, filename)
        await writeFile(path, buffer)

        return NextResponse.json({ url: `/uploads/${filename}` })
    } catch (error: any) {
        console.error("Upload error:", error)
        return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 })
    }
}
