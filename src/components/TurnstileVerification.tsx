import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/I18nProvider";

type TurnstileStatus = "idle" | "loading" | "ready" | "verified" | "expired" | "error" | "missing-site-key";

interface TurnstileVerificationProps {
  action: string;
  disabled?: boolean;
  resetSignal?: number;
  onTokenChange: (token: string) => void;
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
      theme: "light";
      size: "normal";
      appearance: "always";
      action: string;
    }
  ) => string | undefined;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileVerification({
  action,
  disabled = false,
  resetSignal = 0,
  onTokenChange,
}: TurnstileVerificationProps) {
  const { t } = useI18n();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
  const [turnstileScriptReady, setTurnstileScriptReady] = useState(false);
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>("idle");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef("");

  const resetTurnstileWidget = useCallback(() => {
    onTokenChange("");

    if (typeof window === "undefined" || !window.turnstile || !turnstileWidgetId.current) {
      setTurnstileStatus(turnstileSiteKey ? "loading" : "missing-site-key");
      return;
    }

    try {
      window.turnstile.reset(turnstileWidgetId.current);
      setTurnstileStatus("ready");
    } catch {
      turnstileWidgetId.current = "";
      setTurnstileStatus("error");
    }
  }, [onTokenChange, turnstileSiteKey]);

  const removeTurnstileWidget = useCallback(() => {
    onTokenChange("");

    if (typeof window !== "undefined" && window.turnstile && turnstileWidgetId.current) {
      try {
        window.turnstile.remove(turnstileWidgetId.current);
      } catch {
      }
    }

    turnstileWidgetId.current = "";
    setTurnstileStatus("idle");
  }, [onTokenChange]);

  const renderTurnstile = useCallback(() => {
    if (!turnstileSiteKey) {
      setTurnstileStatus("missing-site-key");
      return;
    }

    if (typeof window === "undefined" || !window.turnstile || !turnstileRef.current) {
      setTurnstileStatus("loading");
      return;
    }

    if (turnstileWidgetId.current) {
      return;
    }

    try {
      onTokenChange("");
      setTurnstileStatus("loading");

      const widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        theme: "light",
        size: "normal",
        appearance: "always",
        action,
        callback: (token: string) => {
          onTokenChange(token);
          setTurnstileStatus("verified");
        },
        "expired-callback": () => {
          onTokenChange("");
          setTurnstileStatus("expired");
        },
        "error-callback": () => {
          onTokenChange("");
          setTurnstileStatus("error");
        },
        "timeout-callback": () => {
          onTokenChange("");
          setTurnstileStatus("expired");
        },
      });

      if (widgetId) {
        turnstileWidgetId.current = widgetId;
        setTurnstileStatus("ready");
      } else {
        setTurnstileStatus("error");
      }
    } catch {
      onTokenChange("");
      setTurnstileStatus("error");
    }
  }, [action, onTokenChange, turnstileSiteKey]);

  const handleTurnstileRetry = () => {
    if (turnstileWidgetId.current) {
      resetTurnstileWidget();
      return;
    }

    renderTurnstile();
  };

  useEffect(() => {
    const renderTimer = window.setTimeout(() => {
      renderTurnstile();
    }, 0);

    return () => window.clearTimeout(renderTimer);
  }, [renderTurnstile, turnstileScriptReady]);

  useEffect(() => {
    if (resetSignal > 0) {
      resetTurnstileWidget();
    }
  }, [resetSignal, resetTurnstileWidget]);

  useEffect(() => {
    return () => {
      removeTurnstileWidget();
    };
  }, [removeTurnstileWidget]);

  const turnstileMessageKey =
    turnstileStatus === "verified"
      ? "auth.customer.turnstileVerified"
      : turnstileStatus === "expired"
        ? "auth.customer.turnstileExpired"
        : turnstileStatus === "error"
          ? "auth.customer.turnstileError"
          : turnstileStatus === "missing-site-key"
            ? "auth.customer.turnstileUnavailable"
            : turnstileStatus === "loading"
              ? "auth.customer.turnstileLoading"
              : "auth.customer.turnstilePrompt";

  return (
    <div className="space-y-2">
      <Label>{t("auth.customer.turnstileLabel")}</Label>
      <div className="rounded-md border bg-muted/20 p-3">
        <div className="flex min-h-[70px] items-center justify-center">
          {turnstileStatus === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("auth.customer.turnstileLoading")}
            </div>
          )}
          <div ref={turnstileRef} className={turnstileStatus === "loading" ? "hidden" : ""}></div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t(turnstileMessageKey)}</p>
          {(turnstileStatus === "expired" || turnstileStatus === "error" || turnstileStatus === "missing-site-key") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-2 text-xs"
              onClick={handleTurnstileRetry}
              disabled={disabled || turnstileStatus === "missing-site-key"}
            >
              <RefreshCw className="h-3 w-3" />
              {t("auth.customer.turnstileRetry")}
            </Button>
          )}
        </div>
      </div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          setTurnstileScriptReady(true);
          renderTurnstile();
        }}
        onError={() => {
          setTurnstileScriptReady(false);
          setTurnstileStatus("error");
          onTokenChange("");
        }}
      />
    </div>
  );
}