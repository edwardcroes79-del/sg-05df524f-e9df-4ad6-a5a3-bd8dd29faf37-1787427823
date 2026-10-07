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

const statusLabels: Record<LocationStatus, string> = {
  active: "Active",
  temporarily_closed: "Temporarily closed",
  inactive: "Inactive",
};

function statusClass(status: LocationStatus) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "temporarily_closed") return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  return "border-muted bg-muted text-muted-foreground";
}

export default function LocationsPage() {
  const router = useRouter();
  const { toast } = useToast();
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

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/auth/login");
      throw new Error("Not authenticated");
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

      if (!response.ok) throw new Error(body.error || "Failed to load locations");

      setLocations(body.locations || []);
      setMaxLocations(Number(body.maxLocations || 0));

      const storedActiveId = window.localStorage.getItem(`active_location_${business.id}`) || "";
      if (storedActiveId && (body.locations || []).some((location: BusinessLocation) => location.id === storedActiveId && location.status !== "inactive")) {
        setActiveLocationId(storedActiveId);
      } else {
        setActiveLocationId("");
      }
    } catch (error: any) {
      toast({ title: "Unable to load locations", description: error.message, variant: "destructive" });
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

      if (!response.ok) throw new Error(body.error || "Failed to save location");

      toast({
        title: editingId ? "Location updated" : "Location created",
        description: `${body.location.name} is now ${statusLabels[body.location.status as LocationStatus].toLowerCase()}.`,
      });

      resetForm();
      await fetchLocations();
    } catch (error: any) {
      toast({ title: "Location save failed", description: error.message, variant: "destructive" });
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
    setEditingId(location.id);
    setForm({
      name: location.name,
      address: location.address || "",
      phone: location.phone || "",
      email: location.email || "",
      manager_name: location.manager_name || "",
      status: "inactive",
    });
    window.setTimeout(() => {
      document.getElementById("location-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const selectActiveLocation = (location: BusinessLocation) => {
    if (location.status === "inactive" || !businessId) return;
    window.localStorage.setItem(`active_location_${businessId}`, location.id);
    setActiveLocationId(location.id);
    toast({ title: "Active location selected", description: `${location.name} is selected for this dashboard session.` });
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
        <Head><title>Locations | Dashboard</title></Head>
        <Card className="mx-auto mt-12 max-w-lg border-destructive/20">
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
            <CardTitle>Corporate Admin access required</CardTitle>
            <CardDescription>Locations management is available only to Corporate business owners.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push("/dashboard")}>Return to dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Locations | Dashboard</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-heading font-bold text-foreground">
              <MapPin className="h-7 w-7 text-primary" /> Locations
            </h1>
            <p className="mt-1 text-muted-foreground">Create, edit, deactivate, and switch active Corporate locations.</p>
          </div>
          <Button onClick={() => document.getElementById("location-form")?.scrollIntoView({ behavior: "smooth" })} className="gap-2">
            <Plus className="h-4 w-4" /> Create Location
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total locations</p><p className="mt-1 text-3xl font-bold">{locations.length}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active capacity</p><p className="mt-1 text-3xl font-bold">{activeCount}/{maxLocations}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active selection</p><p className="mt-1 truncate text-lg font-semibold">{locations.find((location) => location.id === activeLocationId)?.name || "All locations"}</p></CardContent></Card>
        </div>

        <Card id="location-form">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Location" : "Create Location"}</CardTitle>
            <CardDescription>Uses the existing secure Corporate locations backend and real Supabase data.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveLocation} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Location Name</Label>
                <Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input id="phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager">Contact Person</Label>
                <Input id="manager" value={form.manager_name} onChange={(event) => setForm((current) => ({ ...current, manager_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LocationStatus }))}>
                  <option value="active">Active</option>
                  <option value="temporarily_closed">Temporarily closed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 md:col-span-2">
                <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{editingId ? "Save changes" : "Create Location"}</Button>
                {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Locations</CardTitle>
              <CardDescription>Historical activity is preserved when a location is deactivated.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void fetchLocations()} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {locations.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">No locations available yet.</p>
                <p className="text-sm text-muted-foreground">Create your first Corporate location to enable location-specific operations.</p>
              </div>
            ) : locations.map((location) => (
              <div key={location.id} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{location.name}</h3>
                    <Badge variant="outline" className={statusClass(location.status)}>{statusLabels[location.status]}</Badge>
                    {location.id === activeLocationId && <Badge className="bg-primary text-primary-foreground">Active selection</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{location.address || "No address provided"}</p>
                  <p className="text-xs text-muted-foreground">{[location.phone, location.email, location.manager_name].filter(Boolean).join(" · ") || "No contact information yet"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => selectActiveLocation(location)} disabled={location.status === "inactive"}>Select active</Button>
                  <Button variant="outline" size="sm" onClick={() => editLocation(location)} className="gap-2"><Edit3 className="h-4 w-4" /> Edit</Button>
                  {location.status !== "inactive" && <Button variant="destructive" size="sm" onClick={() => void deactivateLocation(location)}>Deactivate</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}