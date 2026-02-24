import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Firebase client-side SDK stores auth tokens in IndexedDB/localStorage,
// NOT in cookies — so cookie-based guards don't work here.
// Auth protection is handled client-side via onAuthStateChanged in each page.
export function middleware(req: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
