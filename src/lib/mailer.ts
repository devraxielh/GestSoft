import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export async function sendCertificateNotification(
    to: string,
    personName: string,
    eventName: string,
    participationType: string,
    consultaUrl: string
) {
    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #465fff 0%, #364bcc 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">🎓 Certificado Disponible</h1>
        </div>
        <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Hola <strong>${personName}</strong>,</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Nos complace informarte que tu certificado de participación como <strong>${participationType}</strong> en el evento <strong>"${eventName}"</strong> ya está disponible para consulta y descarga.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${consultaUrl}" style="display: inline-block; background: linear-gradient(135deg, #465fff 0%, #364bcc 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                    Ver mi Certificado
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #f3f4f6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                <a href="${consultaUrl}" style="color: #465fff; word-break: break-all;">${consultaUrl}</a>
            </p>
        </div>
        <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Certificados Online — Sistema de Gestión de Certificados</p>
        </div>
    </div>`

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `🎓 Tu certificado de "${eventName}" está disponible`,
        html,
    })
}
