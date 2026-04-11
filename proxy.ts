import { auth } from "@/lib/auth/server"
import { NextResponse } from "next/server"

const protectedRoutes = ["/judge", "/athlete", "/admin"]
const authRoutes = ["/login"]

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const pathname = nextUrl.pathname

  if (authRoutes.some((route) => pathname.startsWith(route)) && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl))
  }

  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/judge/:path*", "/athlete/:path*", "/admin/:path*", "/login"],
}
