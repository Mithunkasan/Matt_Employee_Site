'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const STUCK_KEY_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const REPEATED_INTERVAL_TIMEOUT = 5 * 60 * 1000 // 5 minutes
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
        intervalMs: number
        patternStartAt: number
        triggered: boolean
    }>({
        key: '',
        lastEventAt: 0,
        intervalMs: 0,
        patternStartAt: 0,
        triggered: false,
    })

    const lastUpdateRef = useRef<number>(0)

    const updateActivity = async (payload: { isIdle: boolean; stuckKey: boolean; eventType: string }) => {
        if (!user) return

        const now = Date.now()
        if (!payload.stuckKey && !payload.isIdle && (now - lastUpdateRef.current < UPDATE_THROTTLE_MS)) {
            return
        }

        try {
            await fetch('/api/user/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            lastUpdateRef.current = now
        } catch {
            // Intentionally ignored to keep UX uninterrupted.
        }
    }

    const triggerAutoCheckout = (reason: 'idle' | 'suspicious') => {
        if (reason === 'suspicious') {
            if (suspiciousTriggeredRef.current) return
            suspiciousTriggeredRef.current = true
        }
        updateActivity({
            isIdle: reason === 'idle',
            stuckKey: reason === 'suspicious',
            eventType: reason === 'idle' ? 'idle_timeout' : 'suspicious_pattern',
        })

        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }

    const armIdleTimer = () => {
        if (hiddenRef.current) return
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

        idleTimerRef.current = setTimeout(() => {
            triggerAutoCheckout('idle')
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
            tracker.intervalMs = 0
            tracker.patternStartAt = 0
            tracker.triggered = false
            return
        }

        const currentInterval = now - tracker.lastEventAt
        const variance = 150

        if (tracker.intervalMs === 0) {
            tracker.intervalMs = currentInterval
            tracker.patternStartAt = tracker.lastEventAt
            tracker.lastEventAt = now
            return
        }

        if (Math.abs(currentInterval - tracker.intervalMs) <= variance) {
            if (!tracker.triggered && now - tracker.patternStartAt >= REPEATED_INTERVAL_TIMEOUT) {
                tracker.triggered = true
                triggerAutoCheckout('suspicious')
            }
        } else {
            tracker.intervalMs = currentInterval
            tracker.patternStartAt = tracker.lastEventAt
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
                triggerAutoCheckout('suspicious')
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
            updateActivity({ isIdle: false, stuckKey: false, eventType: 'session_start' })
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
