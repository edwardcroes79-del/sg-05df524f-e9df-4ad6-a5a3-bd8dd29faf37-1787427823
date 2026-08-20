import React, { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function LegacyJoinRedirect() {
  const router = useRouter();
  const { program_id } = router.query;

  useEffect(() => {
    if (!router.isReady) return;
    
    if (program_id) {
      // Preserve context for return after login
      if (typeof window !== "undefined") {
        localStorage.setItem("last_qr_path", `/join/${program_id}`);
      }
      
      // Redirect legacy poster QR codes to the new simplified route
      router.replace(`/join/${program_id}`);
    } else {
      router.replace("/");
    }
  }, [router.isReady, program_id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Head>
        <title>Redirecting... | Aruba Royalty Stamp</title>
      </Head>
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground font-medium">Loading program...</p>
      </div>
    </div>
  );
}