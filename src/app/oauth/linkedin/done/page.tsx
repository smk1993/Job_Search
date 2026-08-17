"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function LinkedInOAuthDonePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const imported = searchParams.get("imported");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      if (window.opener) {
        window.opener.postMessage(
          { type: "LINKEDIN_ERROR", error },
          window.location.origin
        );
      }
      // Close popup after a brief delay so user can see the error
      setTimeout(() => window.close(), 2000);
      return;
    }

    setStatus("success");
    if (window.opener) {
      window.opener.postMessage(
        { type: "LINKEDIN_CONNECTED", imported: imported ?? "" },
        window.location.origin
      );
    }
    // Close popup automatically
    setTimeout(() => window.close(), 800);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3 p-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
            <p className="text-sm font-medium">LinkedIn connected!</p>
            <p className="text-xs text-muted-foreground">You can close this window.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm font-medium">Connection failed</p>
            <p className="text-xs text-muted-foreground">Closing this window…</p>
          </>
        )}
      </div>
    </div>
  );
}
