import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
}

interface LinkedInMeResponse {
  vanityName?: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = (session.user as { id?: string }).id!;

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const doneBase = new URL("/oauth/linkedin/done", req.url);

  // User denied access
  if (error || !code) {
    doneBase.searchParams.set("error", "linkedin_denied");
    return NextResponse.redirect(doneBase.toString());
  }

  // Verify CSRF state
  const storedState = req.cookies.get("linkedin_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    doneBase.searchParams.set("error", "linkedin_state_mismatch");
    return NextResponse.redirect(doneBase.toString());
  }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`;

    // Exchange auth code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Fetch LinkedIn profile via OpenID Connect userinfo endpoint
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      throw new Error(`Profile fetch failed: ${profileRes.status}`);
    }

    const profile = await profileRes.json() as LinkedInUserInfo;

    const updateData: Record<string, string | null> = {};

    // Always update profile photo from LinkedIn
    if (profile.picture) {
      updateData.image = profile.picture;
    }

    // Always update name from LinkedIn
    if (profile.name) {
      updateData.name = profile.name;
    }

    // Try to fetch LinkedIn profile URL via vanity name
    try {
      const meRes = await fetch("https://api.linkedin.com/v2/me?projection=(id,vanityName)", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json() as LinkedInMeResponse;
        if (meData.vanityName) {
          updateData.linkedinUrl = `https://www.linkedin.com/in/${meData.vanityName}`;
        }
      }
    } catch {
      // vanity name fetch is optional — ignore failures
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updateData });
    }

    // Redirect the popup to the done page with what was imported
    const imported: string[] = [];
    if (updateData.image) imported.push("photo");
    if (updateData.name) imported.push("name");
    if (updateData.linkedinUrl) imported.push("LinkedIn URL");

    const doneUrl = new URL("/oauth/linkedin/done", req.url);
    if (imported.length) doneUrl.searchParams.set("imported", imported.join(","));

    const response = NextResponse.redirect(doneUrl.toString());
    response.cookies.delete("linkedin_oauth_state");
    return response;
  } catch (err) {
    console.error("LinkedIn OAuth error:", err);
    const doneUrl = new URL("/oauth/linkedin/done", req.url);
    doneUrl.searchParams.set("error", "linkedin_failed");
    return NextResponse.redirect(doneUrl.toString());
  }
}
