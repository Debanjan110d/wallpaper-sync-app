import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // We still run the Supabase middleware just in case
  const response = await updateSession(request)

  const { pathname } = request.nextUrl
  
  // Protect the dashboard root
  if (pathname === "/") {
    const session = request.cookies.get("admin_session")
    if (!session || session.value !== "true") {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  }

  // Prevent logged-in users from seeing the login page
  if (pathname === "/login") {
    const session = request.cookies.get("admin_session")
    if (session && session.value === "true") {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
