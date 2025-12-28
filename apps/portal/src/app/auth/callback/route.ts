import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Default to dashboard
    const next = '/portal/dashboard'

    if (code) {
        const cookieStore = await cookies()

        // Using credentials from src/lib/supabase.ts
        const supabaseUrl = 'https://dafdejwjgieiuazxmzba.supabase.co'
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZmRlandqZ2llaXVhenhtemJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNDI2NjIsImV4cCI6MjA4MDYxODY2Mn0.S9vZtPjkT4mPqJESsCKUTVZZHay6FpbnB0jIw4pQ6jE'

        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    },
                },
            }
        )
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Auth check error:', error)
            return NextResponse.redirect(`${origin}/portal/login?error=${encodeURIComponent(error.message)}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/portal/login?error=No code provided`)
}
