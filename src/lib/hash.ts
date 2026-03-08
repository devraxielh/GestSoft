import crypto from "crypto"

export function generateVerificationCode(data: Record<string, any>): string {
    // 1. Normalize and clean data
    const normalized: Record<string, string> = {};

    // Sort keys to ensure deterministic JSON.stringify
    const keys = Object.keys(data).sort();

    for (const key of keys) {
        let value = data[key];

        // Normalize Dates (issueDate, defenseDate, etc.)
        if (key.toLowerCase().includes('date') || key === 'issueDate') {
            try {
                if (value) {
                    // Always use YYYY-MM-DD to avoid timezone/millisecond mismatches
                    value = new Date(value).toISOString().split('T')[0];
                }
            } catch {
                // Keep as is if unparseable
            }
        }

        // Trim strings and convert to string
        normalized[key] = value !== null && value !== undefined ? String(value).trim() : "";
    }

    const jsonString = JSON.stringify(normalized);
    const hash = crypto.createHash('sha256').update(jsonString).digest('hex').toUpperCase();
    return hash.substring(0, 16);
}
