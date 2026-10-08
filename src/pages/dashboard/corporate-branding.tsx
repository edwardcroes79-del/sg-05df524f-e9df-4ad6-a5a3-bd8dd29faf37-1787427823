import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CorporateBrandingSettingsPanel } from "@/components/dashboard/CorporateBrandingSettingsPanel";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nProvider";
import { fetchCorporateBranding } from "@/contexts/CorporateBrandingContext";

type BrandingBusiness = {
  id: string;
  business_name?: string | null;
  logo?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export default function CorporateBrandingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BrandingBusiness | null>(null);

  useEffect(() => {
    void fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      const { data: workspaceRows, error: workspaceError } = await (supabase as any)
        .rpc("get_business_dashboard_access_status");

      if (workspaceError) throw workspaceError;

      const businessData = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;

      if (!businessData?.id) {
        router.push("/dashboard");
        return;
      }

      const brandingResult = await fetchCorporateBranding(businessData.id, session.access_token);

      if (brandingResult.status !== "available" || !brandingResult.can_manage) {
        router.push("/dashboard");
        return;
      }

      setBusiness({
        id: businessData.id,
        business_name: businessData.business_name,
        logo: brandingResult.branding.logo_url,
        primary_color: brandingResult.branding.primary_color,
        secondary_color: brandingResult.branding.secondary_color,
      });
    } catch (error) {
      console.error("Corporate branding page load error:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>{t("dashboard.corporateBranding.seoTitle")}</title>
      </Head>

      {loading || !business ? (
        <div className="flex h-full min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mx-auto max-w-5xl pb-20">
          <CorporateBrandingSettingsPanel business={business} onSaved={(branding) => {
            setBusiness((current) => current ? {
              ...current,
              logo: branding.logo_url,
              primary_color: branding.primary_color,
              secondary_color: branding.secondary_color,
            } : current);
          }} />
        </div>
      )}
    </DashboardLayout>
  );
}