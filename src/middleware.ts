import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    "/api/credentials/:path*",
    "/api/events/:path*",
    "/api/chat/:path*",
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
}; 