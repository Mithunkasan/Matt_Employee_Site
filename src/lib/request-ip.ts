export function getClientIpFromHeaders(headers: Headers): string {
    const forwardedFor = headers.get('x-forwarded-for')
    if (forwardedFor) {
        const firstIp = forwardedFor.split(',')[0]?.trim()
        if (firstIp) return firstIp
    }

    const realIp = headers.get('x-real-ip')?.trim()
    if (realIp) return realIp

    const cfIp = headers.get('cf-connecting-ip')?.trim()
    if (cfIp) return cfIp

    return 'unknown'
}
