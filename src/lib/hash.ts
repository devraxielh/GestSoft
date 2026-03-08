import CryptoJS from "crypto-js";

export function generateVerificationCode(data: Record<string, any>): string {
    // 1. Normalize and clean data
    const normalized: Record<string, string> = {};

    // Sort keys to ensure deterministic JSON.stringify
    const keys = Object.keys(data).sort();

    for (const key of keys) {
        let value = data[key];

        // Normalize Dates (issueDate, defenseDate, etc.)
        // We use UTC methods to avoid local timezone shifts (common in browser vs server)
        if (key.toLowerCase().includes('date') || key === 'issueDate') {
            try {
                if (value) {
                    const d = new Date(value);
                    if (!isNaN(d.getTime())) {
                        const year = d.getUTCFullYear();
                        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
                        const day = String(d.getUTCDate()).padStart(2, "0");
                        value = `${year}-${month}-${day}`;
                    }
                }
            } catch {
                // Keep as is if unparseable
            }
        }

        // Trim strings and convert to string
        normalized[key] = value !== null && value !== undefined ? String(value).trim() : "";
    }

    const jsonString = JSON.stringify(normalized);
    // Use CryptoJS for consistent synchronous hashing in browser and server
    const hash = CryptoJS.SHA256(jsonString).toString(CryptoJS.enc.Hex).toUpperCase();
    return hash.substring(0, 16);
}
