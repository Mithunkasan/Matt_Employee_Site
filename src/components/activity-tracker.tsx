'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes of no movement = idle (offline)
const STUCK_KEY_TIMEOUT = 15 * 60 * 1000 // 15 minutes of continuous key press
const PING_INTERVAL = 2 * 60 * 1000 // 2 minutes periodic update

export function ActivityTracker() {
    const { user } = useAuth()
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const keyPressRef = useRef<{ [key: string]: number }>({})
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
            // After 5 mins of no activity, we don't send anything
            // The server will see lastActivityAt is old and mark as offline
            // But we can explicitly send an idle ping if we wanted
            updateActivity(true, stuckKeyAlertRef.current)
        }, IDLE_TIMEOUT)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!keyPressRef.current[e.key]) {
            keyPressRef.current[e.key] = Date.now()
        } else {
            const duration = Date.now() - keyPressRef.current[e.key]
            if (duration > STUCK_KEY_TIMEOUT && !stuckKeyAlertRef.current) {
                stuckKeyAlertRef.current = true
                updateActivity(false, true)
            }
        }
        resetIdleTimer()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
        delete keyPressRef.current[e.key]
        if (stuckKeyAlertRef.current) {
            const stillStuck = Object.values(keyPressRef.current).some(
                start => (Date.now() - start) > STUCK_KEY_TIMEOUT
            )
            if (!stillStuck) {
                stuckKeyAlertRef.current = false
                updateActivity(false, false)
            }
        }
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

        // Periodic ping to keep lastActivityAt fresh if user is active
        pingIntervalRef.current = setInterval(() => {
            // Only ping if we haven't hit the idle timeout yet
            // This is handled by resetIdleTimer logic
        }, PING_INTERVAL)

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
    }, [user])

    return null
}
