import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Building2, CheckCircle2, Edit3, Loader2, MapPin, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n, type TranslationKey } from "@/contexts/I18nProvider";

type LocationStatus = "active" | "temporarily_closed" | "inactive";

type BusinessLocation = {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  status: LocationStatus;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
};

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  email: "",
  manager_name: "",
  status: "active" as LocationStatus,
};

const statusTranslationKeys: Record<LocationStatus, TranslationKey> = {
  active: "dashboard.locations.status.active",
  temporarily_closed: "dashboard.locations.status.temporarilyClosed",
  inactive: "dashboard.locations.status.inactive",
};

function statusClass(status: LocationStatus) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "temporarily_closed") return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  return "border-muted bg-muted text-muted-foreground";
}

export default function LocationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [businessId, setBusinessId] = useState("");
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [maxLocations, setMaxLocations] = useState(0);
  const [activeLocationId, setActiveLocationId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const activeCount = useMemo(() => locations.filter((location) => location.status !== "inactive").length, [locations]);

  const getStatusLabel = (status: LocationStatus) => t(statusTranslationKeys[status]);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      throw new Error(t("dashboard.locations.notAuthenticated"));
    }

    return `Bearer ${session.access_token}`;
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      const authorization = await getAuthHeader();

      const { data: workspaceRows, error: workspaceError } = await (supabase as any).rpc("get_business_dashboard_access_status");
      if (workspaceError) throw workspaceError;

      const business = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;
      if (!business || business.subscription_plan !== "mega_plan" || business.owner_id !== (await supabase.auth.getUser()).data.user?.id) {
        setAccessDenied(true);
        return;
      }

      setBusinessId(business.id);
      const response = await fetch(`/api/business/locations?business_id=${business.id}`, {
        headers: { Authorization: authorization },
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || t("dashboard.locations.loadFailed"));

      setLocations(body.locations || []);
      setMaxLocations(Number(body.maxLocations || 0));

      const storedActiveId = window.localStorage.getItem(`active_location_${business.id}`) || "";
      if (storedActiveId && (body.locations || []).some((location: BusinessLocation) => location.id === storedActiveId && location.status !== "inactive")) {
        setActiveLocationId(storedActiveId);
      } else {
        setActiveLocationId("");
      }
    } catch (error: any) {
      toast({ title: t("dashboard.locations.unableToLoad"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLocations();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!businessId) return;

    try {
      setSaving(true);
      const authorization = await getAuthHeader();
      const response = await fetch("/api/business/locations", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          id: editingId || undefined,
          business_id: businessId,
        }),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || t("dashboard.locations.saveFailedFallback"));

      toast({
        title: editingId ? t("dashboard.locations.updatedTitle") : t("dashboard.locations.createdTitle"),
        description: t("dashboard.locations.statusDescription", {
          locationName: body.location.name,
          status: getStatusLabel(body.location.status as LocationStatus).toLowerCase(),
        }),
      });

      resetForm();
      await fetchLocations();
    } catch (error: any) {
      toast({ title: t("dashboard.locations.saveFailed"), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const editLocation = (location: BusinessLocation) => {
    setEditingId(location.id);
    setForm({
      name: location.name,
      address: location.address || "",
      phone: location.phone || "",
      email: location.email || "",
      manager_name: location.manager_name || "",
      status: location.status,
    });
  };

  const deactivateLocation = async (location: BusinessLocation) => {
    if (!businessId) return;

    try {
      setSaving(true);
      const authorization = await getAuthHeader();
      const response = await fetch("/api/business/locations", {
        method: "PATCH",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: location.id,
          business_id: businessId,
          status: "inactive",
        }),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || t("dashboard.locations.deactivationFailedFallback"));

      if (activeLocationId === location.id) {
        window.localStorage.removeItem(`active_location_${businessId}`);
        setActiveLocationId("");
      }

      toast({
        title: t("dashboard.locations.deactivatedTitle"),
        description: t("dashboard.locations.deactivatedDescription", { locationName: body.location.name }),
      });

      resetForm();
      await fetchLocations();
    } catch (error: any) {
      toast({ title: t("dashboard.locations.deactivationFailed"), description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectActiveLocation = (location: BusinessLocation) => {
    if (location.status === "inactive" || !businessId) return;
    window.localStorage.setItem(`active_location_${businessId}`, location.id);
    setActiveLocationId(location.id);
    toast({
      title: t("dashboard.locations.activeSelectedTitle"),
      description: t("dashboard.locations.activeSelectedDescription", { locationName: location.name }),
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (accessDenied) {
    return (
      <DashboardLayout>
        <Head><title>{t("dashboard.locations.seoTitle")}</title></Head>
        <Card className="mx-auto mt-12 max-w-lg border-destructive/20">
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <CardTitle>{t("dashboard.locations.accessRequiredTitle")}</CardTitle>
            <CardDescription>{t("dashboard.locations.accessRequiredDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push("/dashboard")}>{t("dashboard.locations.returnToDashboard")}</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>{t("dashboard.locations.seoTitle")}</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-heading font-bold text-foreground">
              <MapPin className="h-7 w-7 text-primary" /> {t("dashboard.locations.title")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("dashboard.locations.description")}</p>
          </div>
          <Button onClick={() => document.getElementById("location-form")?.scrollIntoView({ behavior: "smooth" })} className="gap-2">
            <Plus className="h-4 w-4" /> {t("dashboard.locations.createLocation")}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.locations.totalLocations")}</p><p className="mt-1 text-3xl font-bold">{locations.length}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.locations.activeCapacity")}</p><p className="mt-1 text-3xl font-bold">{activeCount}/{maxLocations}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("dashboard.locations.activeSelection")}</p><p className="mt-1 truncate text-lg font-semibold">{locations.find((location) => location.id === activeLocationId)?.name || t("dashboard.locations.allLocationsSelection")}</p></CardContent></Card>
        </div>

        <Card id="location-form">
          <CardHeader>
            <CardTitle>{editingId ? t("dashboard.locations.editLocation") : t("dashboard.locations.createLocation")}</CardTitle>
            <CardDescription>{t("dashboard.locations.formDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveLocation} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">{t("dashboard.locations.locationName")}</Label>
                <Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">{t("dashboard.locations.address")}</Label>
                <Textarea id="address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("dashboard.locations.contactPhone")}</Label>
                <Input id="phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("dashboard.locations.contactEmail")}</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">{t("dashboard.locations.contactPerson")}</Label>
                <Input id="manager" value={form.manager_name} onChange={(event) => setForm((current) => ({ ...current, manager_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{t("dashboard.locations.status")}</Label>
                <select id="status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LocationStatus }))}>
                  <option value="active">{t("dashboard.locations.status.active")}</option>
                  <option value="temporarily_closed">{t("dashboard.locations.status.temporarilyClosed")}</option>
                  <option value="inactive">{t("dashboard.locations.status.inactive")}</option>
                </select>
              </div>
              <div className="flex gap-3 md:col-span-2">
                <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{editingId ? t("dashboard.locations.saveChanges") : t("dashboard.locations.createLocation")}</Button>
                {editingId && <Button type="button" variant="outline" onClick={resetForm}>{t("dashboard.locations.cancel")}</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("dashboard.locations.allLocations")}</CardTitle>
              <CardDescription>{t("dashboard.locations.listDescription")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void fetchLocations()} className="gap-2"><RefreshCw className="h-4 w-4" /> {t("dashboard.locations.refresh")}</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {locations.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">{t("dashboard.locations.emptyTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("dashboard.locations.emptyDescription")}</p>
              </div>
            ) : locations.map((location) => (
              <div key={location.id} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{location.name}</h3>
                    <Badge variant="outline" className={statusClass(location.status)}>{getStatusLabel(location.status)}</Badge>
                    {location.id === activeLocationId && <Badge className="bg-primary text-primary-foreground">{t("dashboard.locations.activeSelectionBadge")}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{location.address || t("dashboard.locations.noAddress")}</p>
                  <p className="text-xs text-muted-foreground">{[location.phone, location.email, location.manager_name].filter(Boolean).join(" · ") || t("dashboard.locations.noContact")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => selectActiveLocation(location)} disabled={location.status === "inactive"}>{t("dashboard.locations.selectActive")}</Button>
                  <Button variant="outline" size="sm" onClick={() => editLocation(location)} className="gap-2"><Edit3 className="h-4 w-4" /> {t("dashboard.locations.edit")}</Button>
                  {location.status !== "inactive" && <Button variant="destructive" size="sm" onClick={() => void deactivateLocation(location)} disabled={saving}>{t("dashboard.locations.deactivate")}</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}