const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export function roundHours(hours: number): number {
    return Math.round(hours * 100) / 100
}

export function getISTStartOfDayUTC(reference: Date = new Date()): Date {
    const shifted = new Date(reference.getTime() + IST_OFFSET_MS)
    return new Date(Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
        0,
        0,
        0,
        0
    ))
}

export function getISTOvertimeThresholdUTC(reference: Date | string): Date {
    const date = new Date(reference)
    const shifted = new Date(date.getTime() + IST_OFFSET_MS)

    // 5:30 PM IST is 12:00 PM UTC for the same IST calendar day.
    return new Date(Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
        12,
        0,
        0,
        0
    ))
}

export function calculateOvertimeHours(checkIn: Date | string, checkOut: Date | string): number {
    const checkInMs = new Date(checkIn).getTime()
    const checkOutMs = new Date(checkOut).getTime()

    if (checkOutMs <= checkInMs) return 0

    const thresholdMs = getISTOvertimeThresholdUTC(checkIn).getTime()
    const overtimeMs = checkOutMs - Math.max(checkInMs, thresholdMs)

    if (overtimeMs <= 0) return 0
    return roundHours(overtimeMs / HOUR_MS)
}
