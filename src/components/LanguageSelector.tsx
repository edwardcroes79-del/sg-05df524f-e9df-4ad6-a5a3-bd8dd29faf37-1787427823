import { Globe2 } from "lucide-react";
import { languages, useI18n } from "@/contexts/I18nProvider";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({ compact = false, className }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className={cn("flex items-center gap-2 text-sm font-medium text-muted-foreground", className)}>
      <Globe2 className="h-4 w-4 text-primary" />
      {!compact && <span>{t("language.selector.label")}</span>}
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as keyof typeof languages)}
        aria-label={t("language.selector.label")}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="en">{t("language.selector.english")}</option>
        <option value="es">{t("language.selector.spanish")}</option>
      </select>
    </label>
  );
}