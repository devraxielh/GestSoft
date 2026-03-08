import crypto from "crypto"

export function generateVerificationCode(data: Record<string, string>): string {
    const jsonString = JSON.stringify(data);
    const hash = crypto.createHash('sha256').update(jsonString).digest('hex').toUpperCase();
    return hash.substring(0, 16); // limit string size so it's readable in the certificate, instead of a full 64 chars.
}
