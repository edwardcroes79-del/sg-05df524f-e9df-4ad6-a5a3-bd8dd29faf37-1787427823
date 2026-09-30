import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, PlusSquare, Smartphone } from "lucide-react";
import { useI18n } from "@/contexts/I18nProvider";

export function PWAInstallPrompt() {
  const { t } = useI18n();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    
    // Check if user previously dismissed
    const isDismissed = localStorage.getItem("pwa_install_dismissed") === "true";

    if (isStandalone || isDismissed) {
      return;
    }

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIosDevice) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    // Android/Desktop Chrome native prompt detection
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      // We no longer need the prompt.  Clear it up.
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 shadow-sm relative overflow-hidden">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-start gap-4 pr-6">
        <div className="h-12 w-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border overflow-hidden">
          <img src="/PWA_logo.png" alt="Royalty Stamp" className="h-full w-full object-cover" />
        </div>
        
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-foreground flex items-center gap-1.5">
            <Smartphone className="h-4 w-4 text-primary" />
            {t("customer.pwa.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("customer.pwa.description")}
          </p>

          {isIOS ? (
            <div className="mt-3 bg-white/50 rounded-lg p-3 text-xs text-foreground space-y-2 border border-primary/10">
              <p className="font-medium">{t("customer.pwa.iosTitle")}</p>
              <ol className="space-y-1.5 pl-1">
                <li className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  <span><Share className="h-3 w-3 inline mx-0.5 text-primary" /> {t("customer.pwa.iosStepShare")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  <span><PlusSquare className="h-3 w-3 inline mx-0.5 text-primary" /> {t("customer.pwa.iosStepAddHome")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                  {t("customer.pwa.iosStepAdd")}
                </li>
              </ol>
            </div>
          ) : (
            <Button 
              size="sm" 
              className="mt-3 w-full sm:w-auto"
              onClick={handleInstallClick}
              disabled={!deferredPrompt}
            >
              {t("customer.pwa.installApp")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}