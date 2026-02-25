'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'

const INACTIVITY_LIMIT = 5 * 60 * 1000 // 5 minutes
const STUCK_KEY_LIMIT = 10 * 60 * 1000 // 10 minutes
const REPEATED_KEY_LIMIT = 10 * 60 * 1000 // 10 minutes
const REPEATED_KEY_INTERVAL_THRESHOLD = 2500 // 2.5 seconds (around the 2s example)

export function ActivityMonitor() {
    const { user, logout } = useAuth()

    // Inactivity refs
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null)

    // Stuck key refs
    const pressedKey = useRef<string | null>(null)
    const keyPressStartTime = useRef<number | null>(null)

    // Repeated key refs
    const lastKeyClickTime = useRef<number>(0)
    const repeatedClickStartTime = useRef<number | null>(null)
    const clickIntervals = useRef<number[]>([])

    const reportSuspiciousActivity = async (type: 'stuck_key' | 'repeated_clicks') => {
        try {
            await fetch('/api/auth/report-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            })
        } catch (error) {
            console.error('Failed to report activity:', error)
        }
    }

    const triggerLogout = (reason: string) => {
        console.warn(`Logging out due to: ${reason}`)
        logout()
    }

    useEffect(() => {
        if (!user) return

        const resetInactivityTimer = () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
            inactivityTimer.current = setTimeout(() => {
                triggerLogout('Inactivity')
            }, INACTIVITY_LIMIT)
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            resetInactivityTimer()

            const now = Date.now()

            // --- Stuck Key Detection ---
            if (pressedKey.current === e.key) {
                if (keyPressStartTime.current) {
                    if (now - keyPressStartTime.current > STUCK_KEY_LIMIT) {
                        reportSuspiciousActivity('stuck_key')
                        triggerLogout('Stuck key detected')
                    }
                }
            } else {
                pressedKey.current = e.key
                keyPressStartTime.current = now
            }

            // --- Repeated Key Detection ---
            if (lastKeyClickTime.current > 0) {
                const interval = now - lastKeyClickTime.current

                // If it's a "regular" interval (e.g., every ~2 seconds)
                if (interval > 500 && interval < REPEATED_KEY_INTERVAL_THRESHOLD) {
                    if (!repeatedClickStartTime.current) {
                        repeatedClickStartTime.current = now
                    }

                    // Check if this behavior has persisted for 10 minutes
                    if (now - repeatedClickStartTime.current > REPEATED_KEY_LIMIT) {
                        reportSuspiciousActivity('repeated_clicks')
                        triggerLogout('Repeated key clicks detected')
                    }
                } else {
                    // Reset if interval is too long or too short (normal typing/burst)
                    repeatedClickStartTime.current = null
                }
            }
            lastKeyClickTime.current = now
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (pressedKey.current === e.key) {
                pressedKey.current = null
                keyPressStartTime.current = null
            }
        }

        const handleMouseMove = () => resetInactivityTimer()
        const handleClick = () => resetInactivityTimer()
        const handleScroll = () => resetInactivityTimer()

        // Initial set
        resetInactivityTimer()

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('click', handleClick)
        window.addEventListener('scroll', handleScroll)

        return () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('click', handleClick)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [user, logout])

    return null
}
