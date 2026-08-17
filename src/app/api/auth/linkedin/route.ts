import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!process.env.LINKEDIN_CLIENT_ID) {
    // Redirect popup to the done page so it can send postMessage back to parent
    return NextResponse.redirect(new URL("/oauth/linkedin/done?error=linkedin_not_configured", req.url));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`;

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });
  return response;
}
