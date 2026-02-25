'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes of no movement = logout
const STUCK_KEY_TIMEOUT = 10 * 60 * 1000 // 10 minutes of continuous key press = logout
const INTERVAL_KEY_TIMEOUT = 10 * 60 * 1000 // 10 minutes of repeated interval = logout
const PING_INTERVAL = 2 * 60 * 1000 // 2 minutes periodic update

export function ActivityTracker() {
    const { user, logout } = useAuth()
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const keyPressRef = useRef<{ [key: string]: number }>({})
    const intervalKeyRef = useRef<{
        lastKey: string,
        lastTime: number,
        interval: number,
        startTime: number,
        triggered: boolean
    }>({ lastKey: '', lastTime: 0, interval: 0, startTime: 0, triggered: false })
    const stuckKeyAlertRef = useRef<boolean>(false)
    const lastUpdateRef = useRef<number>(0)

    const updateActivity = async (isIdle: boolean, stuckKey: boolean) => {
        if (!user) return

        // Throttle updates unless it's a state change
        const now = Date.now()
        if (!stuckKey && !isIdle && (now - lastUpdateRef.current < 30000)) {
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

        // We are active now
        if (lastUpdateRef.current === 0 || (Date.now() - lastUpdateRef.current > 60000)) {
            updateActivity(false, stuckKeyAlertRef.current)
        }

        idleTimerRef.current = setTimeout(() => {
            console.warn('Logging out due to 5 minutes of inactivity')
            updateActivity(true, stuckKeyAlertRef.current)
            logout()
        }, IDLE_TIMEOUT)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        const now = Date.now()
        resetIdleTimer()

        // Tracked roles for suspicious activity reporting
        const trackedRoles = ['HR', 'BA', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE', 'INTERN']
        const shouldReport = user && trackedRoles.includes(user.role)

        // 1. Stuck Key Detection
        if (!keyPressRef.current[e.key]) {
            keyPressRef.current[e.key] = now
        } else {
            const duration = now - keyPressRef.current[e.key]
            if (duration > STUCK_KEY_TIMEOUT) {
                if (shouldReport && !stuckKeyAlertRef.current) {
                    stuckKeyAlertRef.current = true
                    updateActivity(false, true)
                }
                console.warn('Logging out due to stuck key detection')
                logout()
            }
        }

        // 2. Fixed Interval Detection
        const ik = intervalKeyRef.current
        if (ik.lastKey === e.key) {
            const currentInterval = now - ik.lastTime
            // Allow 50ms variance for network/browser jitter
            if (currentInterval > 500 && Math.abs(currentInterval - ik.interval) < 50) {
                if (now - ik.startTime > INTERVAL_KEY_TIMEOUT) {
                    if (shouldReport && !ik.triggered) {
                        ik.triggered = true
                        updateActivity(false, true)
                    }
                    console.warn('Logging out due to repeated key interval detection')
                    logout()
                }
            } else {
                ik.interval = currentInterval
                ik.startTime = now
            }
        } else {
            ik.lastKey = e.key
            ik.startTime = now
            ik.interval = 0
            ik.triggered = false
        }
        ik.lastTime = now
    }

    const handleKeyUp = (e: KeyboardEvent) => {
        delete keyPressRef.current[e.key]
    }

    useEffect(() => {
        if (!user) return

        // Throttle the activity handler to run at most once per second
        let lastActivityTime = 0
        const handleActivity = () => {
            const now = Date.now()
            if (now - lastActivityTime > 1000) {
                lastActivityTime = now
                resetIdleTimer()
            }
        }

        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('mousedown', handleActivity)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        window.addEventListener('touchstart', handleActivity)
        window.addEventListener('scroll', handleActivity)

        // Initial update
        updateActivity(false, false)

        resetIdleTimer()

        return () => {
            window.removeEventListener('mousemove', handleActivity)
            window.removeEventListener('mousedown', handleActivity)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            window.removeEventListener('touchstart', handleActivity)
            window.removeEventListener('scroll', handleActivity)
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
        }
    }, [user, logout])

    return null
}
