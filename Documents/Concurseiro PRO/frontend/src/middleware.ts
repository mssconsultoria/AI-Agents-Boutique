import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isTrialActive, canAccessRoute } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/login(.*)",
  "/signup(.*)",
  "/blog(.*)",
  "/editais(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  const session = await auth();
  if (!session.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const metadata = session.sessionClaims?.publicMetadata as {
    plan?: PlanId;
    trialEndsAt?: string;
  } | undefined;

  const plan: PlanId = metadata?.plan ?? "gratis";
  const trialActive = isTrialActive(metadata?.trialEndsAt);
  const pathname = request.nextUrl.pathname;

  if (!canAccessRoute(plan, trialActive, pathname)) {
    if (pathname.startsWith("/analytics")) {
      return NextResponse.next(); // page will show inline paywall
    }
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
