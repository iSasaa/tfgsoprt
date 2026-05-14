import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MOBILE_UA_REGEX =
    /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/dashboard")) {
        const ua = request.headers.get("user-agent") ?? "";
        if (MOBILE_UA_REGEX.test(ua)) {
            const url = request.nextUrl.clone();
            url.pathname = "/mobile-not-supported";
            return NextResponse.redirect(url);
        }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", request.nextUrl.pathname);

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
