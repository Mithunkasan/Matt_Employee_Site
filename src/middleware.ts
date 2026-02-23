import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt, SessionPayload } from '@/lib/auth'

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login']

// Role-based route access
const roleRoutes: Record<string, string[]> = {
    '/employees': ['ADMIN', 'HR'],
    '/api/users': ['ADMIN', 'HR', 'BA', 'PA', 'EMPLOYEE', 'MANAGER', 'TEAM_LEADER', 'TEAM_COORDINATOR', 'INTERN'],
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // Check for session
    const token = request.cookies.get('session')?.value

    if (!token) {
        // Redirect to login for page requests, return 401 for API
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verify session
    const session = await decrypt(token)

    if (!session) {
        // Invalid token
        const response = pathname.startsWith('/api/')
            ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            : NextResponse.redirect(new URL('/login', request.url))

        response.cookies.delete('session')
        return response
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
        const response = pathname.startsWith('/api/')
            ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
            : NextResponse.redirect(new URL('/login', request.url))

        response.cookies.delete('session')
        return response
    }

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route)) {
            if (!allowedRoles.includes(session.role)) {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }
    }

    // Add user info to headers for API routes
    const response = NextResponse.next()
    response.headers.set('x-user-id', session.userId)
    response.headers.set('x-user-role', session.role)

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
}
