import { I18nProvider } from "@/contexts/I18nProvider";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.error("Service Worker registration failed: ", err);
        });
      });
    }
  }, []);

  return (
    <I18nProvider>
      <Component {...pageProps} />
      <Toaster />
    </I18nProvider>
  );
}
