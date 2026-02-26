'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'

const IDLE_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const STUCK_KEY_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const INTERVAL_TIMEOUT = 10 * 60 * 1000 // 10 minutes
const PING_INTERVAL = 1 * 60 * 1000 // 1 minute periodic update

export function ActivityTracker() {
    const { user, logout } = useAuth()
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const keyPressRef = useRef<{ [key: string]: number }>({})
    const lastActivityRef = useRef<number>(Date.now())

    // Interval tracking for both keys and clicks
    const intervalTrackerRef = useRef<{
        lastActionTime: number,
        interval: number,
        startTime: number,
        type: 'none' | 'key' | 'click',
        triggered: boolean
    }>({ lastActionTime: 0, interval: 0, startTime: 0, type: 'none', triggered: false })

    const stuckKeyAlertRef = useRef<boolean>(false)
    const lastUpdateRef = useRef<number>(0)

    const updateActivity = async (isIdle: boolean, stuckKey: boolean) => {
        if (!user) return

        const now = Date.now()
        // Throttle updates unless it's a suspicious event or it's been a while
        if (!stuckKey && !isIdle && (now - lastUpdateRef.current < 60000)) {
            return
        }

        try {
            await fetch('/api/user/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isIdle, stuckKey }),
            })
            lastUpdateRef.current = now
        } catch (error) {
            // Silently fail activity updates
        }
    }

    const resetIdleTimer = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
        lastActivityRef.current = Date.now()

        // We are active now, update server if needed
        if (lastUpdateRef.current === 0 || (Date.now() - lastUpdateRef.current > 60000)) {
            updateActivity(false, stuckKeyAlertRef.current)
        }

        idleTimerRef.current = setTimeout(() => {
            console.warn('User marked as idle (10 minutes)')
            // The server will naturally show them as offline based on lastActivityAt
            updateActivity(true, stuckKeyAlertRef.current)
        }, IDLE_TIMEOUT)
    }

    const checkIntervalAction = (type: 'key' | 'click') => {
        const now = Date.now()
        const tracker = intervalTrackerRef.current

        if (tracker.type === type) {
            const currentInterval = now - tracker.lastActionTime

            // Checking for ~2 second interval (1.9s to 2.1s)
            const targetInterval = 2000
            const variance = 100

            if (Math.abs(currentInterval - targetInterval) < variance) {
                if (tracker.startTime === 0) {
                    tracker.startTime = tracker.lastActionTime
                }

                if (now - tracker.startTime > INTERVAL_TIMEOUT) {
                    if (!tracker.triggered) {
                        tracker.triggered = true
                        stuckKeyAlertRef.current = true
                        updateActivity(false, true)
                        console.warn(`Suspicious ${type} interval detected over 10 minutes`)
                    }
                }
            } else {
                // Interval broken
                tracker.startTime = 0
            }
        } else {
            tracker.type = type
            tracker.startTime = 0
            tracker.triggered = false
        }

        tracker.lastActionTime = now
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        const now = Date.now()
        resetIdleTimer()
        checkIntervalAction('key')

        const trackedRoles = ['HR', 'BA', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE', 'INTERN']
        const shouldReport = user && trackedRoles.includes(user.role)

        // Stuck Key Detection
        if (!keyPressRef.current[e.key]) {
            keyPressRef.current[e.key] = now
        } else {
            const duration = now - keyPressRef.current[e.key]
            if (duration > STUCK_KEY_TIMEOUT) {
                if (shouldReport && !stuckKeyAlertRef.current) {
                    stuckKeyAlertRef.current = true
                    updateActivity(false, true)
                    console.warn('Stuck key detected over 10 minutes')
                }
            }
        }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
        delete keyPressRef.current[e.key]
    }

    const handleMouseAction = () => {
        resetIdleTimer()
        checkIntervalAction('click')
    }

    useEffect(() => {
        if (!user) return

        let lastActivityTime = 0
        const handleActivity = () => {
            const now = Date.now()
            if (now - lastActivityTime > 1000) {
                lastActivityTime = now
                resetIdleTimer()
            }
        }

        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('mousedown', handleMouseAction)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        window.addEventListener('touchstart', handleActivity)
        window.addEventListener('scroll', handleActivity)

        updateActivity(false, false)
        resetIdleTimer()

        return () => {
            window.removeEventListener('mousemove', handleActivity)
            window.removeEventListener('mousedown', handleMouseAction)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            window.removeEventListener('touchstart', handleActivity)
            window.removeEventListener('scroll', handleActivity)
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
        }
    }, [user])

    return null
}
