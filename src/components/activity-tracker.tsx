'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'

const IDLE_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const STUCK_KEY_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const REPEATED_INTERVAL_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const REPEATED_KEY_MIN_INTERVAL_MS = 80
const REPEATED_KEY_MAX_INTERVAL_MS = 400 // very short interval spam
const UPDATE_THROTTLE_MS = 60 * 1000 // 1 minute

export function ActivityTracker() {
    const { user } = useAuth()
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const hiddenRef = useRef<boolean>(false)
    const suspiciousTriggeredRef = useRef<boolean>(false)
    const keyPressRef = useRef<{ [key: string]: number }>({})

    // Repeated fixed-interval key press detection
    const repeatedKeyTrackerRef = useRef<{
        key: string
        lastEventAt: number
        patternStartAt: number
        triggered: boolean
    }>({
        key: '',
        lastEventAt: 0,
        patternStartAt: 0,
        triggered: false,
    })

    const lastUpdateRef = useRef<number>(0)

    const updateActivity = async (payload: { isIdle: boolean; stuckKey: boolean; eventType: string }) => {
        if (!user) return

        const now = Date.now()
        if (!payload.stuckKey && !payload.isIdle && (now - lastUpdateRef.current < UPDATE_THROTTLE_MS)) {
            return { success: true, checkedOut: false }
        }

        try {
            const response = await fetch('/api/user/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await response.json().catch(() => ({ success: false, checkedOut: false }))
            lastUpdateRef.current = now
            return data
        } catch {
            return { success: false, checkedOut: false }
        }
    }

    const triggerAutoCheckout = async (reason: 'idle' | 'long_press' | 'repeated_key') => {
        if (reason !== 'idle') {
            if (suspiciousTriggeredRef.current) return
            suspiciousTriggeredRef.current = true
        }
        await updateActivity({
            isIdle: reason === 'idle',
            stuckKey: reason !== 'idle',
            eventType:
                reason === 'idle'
                    ? 'idle_timeout'
                    : reason === 'long_press'
                        ? 'long_press_timeout'
                        : 'repeated_key_pattern',
        })

        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        // Auto-checkout should not force logout.
        // Employee can manually check in again later.
    }

    const armIdleTimer = () => {
        if (hiddenRef.current) return
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

        idleTimerRef.current = setTimeout(() => {
            void triggerAutoCheckout('idle')
        }, IDLE_TIMEOUT)
    }

    const markActive = () => {
        if (hiddenRef.current || !user) return
        if (suspiciousTriggeredRef.current) {
            suspiciousTriggeredRef.current = false
        }

        updateActivity({ isIdle: false, stuckKey: false, eventType: 'active' })
        armIdleTimer()
    }

    const checkRepeatedSameKeyPattern = (key: string) => {
        const now = Date.now()
        const tracker = repeatedKeyTrackerRef.current

        if (tracker.key !== key) {
            tracker.key = key
            tracker.lastEventAt = now
            tracker.patternStartAt = now
            tracker.triggered = false
            return
        }

        const currentInterval = now - tracker.lastEventAt
        if (currentInterval >= REPEATED_KEY_MIN_INTERVAL_MS && currentInterval <= REPEATED_KEY_MAX_INTERVAL_MS) {
            if (!tracker.triggered && now - tracker.patternStartAt >= REPEATED_INTERVAL_TIMEOUT) {
                tracker.triggered = true
                void triggerAutoCheckout('repeated_key')
            }
        } else {
            tracker.patternStartAt = now
            tracker.triggered = false
        }

        tracker.lastEventAt = now
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (hiddenRef.current) return
        markActive()
        checkRepeatedSameKeyPattern(e.code || e.key)

        const now = Date.now()
        if (!keyPressRef.current[e.key]) {
            keyPressRef.current[e.key] = now
        } else {
            const duration = now - keyPressRef.current[e.key]
            if (duration > STUCK_KEY_TIMEOUT) {
                void triggerAutoCheckout('long_press')
            }
        }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
        delete keyPressRef.current[e.key]
    }

    useEffect(() => {
        if (!user) return

        const handleActivity = () => {
            const now = Date.now()
            if (now - lastUpdateRef.current > 1000) {
                markActive()
            }
        }

        const handleVisibilityChange = () => {
            hiddenRef.current = document.hidden
            if (document.hidden) {
                if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
                return
            }

            markActive()
            armIdleTimer()
        }

        const handleWindowBlur = () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        }

        const handleWindowFocus = () => {
            if (document.hidden) return
            markActive()
            armIdleTimer()
        }

        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('mousedown', handleActivity)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        window.addEventListener('touchstart', handleActivity)
        window.addEventListener('scroll', handleActivity)
        window.addEventListener('blur', handleWindowBlur)
        window.addEventListener('focus', handleWindowFocus)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        hiddenRef.current = document.hidden
        if (!hiddenRef.current) {
            void updateActivity({ isIdle: false, stuckKey: false, eventType: 'session_start' })
            armIdleTimer()
        }

        return () => {
            window.removeEventListener('mousemove', handleActivity)
            window.removeEventListener('mousedown', handleActivity)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            window.removeEventListener('touchstart', handleActivity)
            window.removeEventListener('scroll', handleActivity)
            window.removeEventListener('blur', handleWindowBlur)
            window.removeEventListener('focus', handleWindowFocus)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        }
    }, [user])

    return null
}
