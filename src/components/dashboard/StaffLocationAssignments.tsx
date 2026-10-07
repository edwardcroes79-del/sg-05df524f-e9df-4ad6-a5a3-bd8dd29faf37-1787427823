import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/contexts/I18nProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type StaffMember = {
  id: string;
  user_id: string | null;
  role: string | null;
  status: string | null;
  profile?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

type BusinessLocation = {
  id: string;
  name: string;
  address: string | null;
  status: string;
};

type StaffLocationAssignment = {
  id: string;
  business_user_id: string;
  location_id: string;
  role: "location_manager" | "staff";
  is_default: boolean;
  status: "active" | "inactive";
  business_locations?: BusinessLocation | null;
};

type AssignmentRole = "staff" | "location_manager";

type StaffLocationAssignmentsProps = {
  businessId: string;
  staff: StaffMember[];
};

export function StaffLocationAssignments({ businessId, staff }: StaffLocationAssignmentsProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [assignments, setAssignments] = useState<StaffLocationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedRole, setSelectedRole] = useState<AssignmentRole>("staff");
  const [selectedDefault, setSelectedDefault] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeStaff = useMemo(() => staff.filter((member) => member.status === "active"), [staff]);
  const activeLocations = useMemo(() => locations.filter((location) => location.status !== "inactive"), [locations]);

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error(t("dashboard.staff.noActiveSession"));
    return `Bearer ${session.access_token}`;
  };

  const loadAssignments = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const authorization = await getAuthHeader();
      const [locationResponse, assignmentResponse] = await Promise.all([
        fetch(`/api/business/locations?business_id=${businessId}`, {
          headers: { Authorization: authorization },
        }),
        fetch(`/api/staff/locations?business_id=${businessId}`, {
          headers: { Authorization: authorization },
        }),
      ]);

      const locationBody = await locationResponse.json();
      const assignmentBody = await assignmentResponse.json();

      if (!locationResponse.ok) throw new Error(locationBody.error || t("dashboard.staff.assignmentLoadFailed"));
      if (!assignmentResponse.ok) throw new Error(assignmentBody.error || t("dashboard.staff.assignmentLoadFailed"));

      setLocations(locationBody.locations || []);
      setAssignments(assignmentBody.assignments || []);
    } catch (error: any) {
      toast({ title: t("dashboard.staff.assignmentErrorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, [businessId]);

  const openAssignDialog = (staffId: string) => {
    setSelectedStaffId(staffId);
    setSelectedLocationId(activeLocations[0]?.id || "");
    setSelectedRole("staff");
    setSelectedDefault(false);
    setDialogOpen(true);
  };

  const assignmentForStaff = (staffId: string) => assignments.filter((assignment) => assignment.business_user_id === staffId && assignment.status === "active");

  const saveAssignment = async () => {
    if (!selectedStaffId || !selectedLocationId) return;

    try {
      setSavingKey(`${selectedStaffId}:${selectedLocationId}:save`);
      const authorization = await getAuthHeader();
      const response = await fetch("/api/staff/locations", {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: businessId,
          business_user_id: selectedStaffId,
          location_id: selectedLocationId,
          role: selectedRole,
          is_default: selectedDefault,
          status: "active",
        }),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || t("dashboard.staff.assignmentSaveFailed"));

      toast({ title: t("dashboard.staff.assignmentSavedTitle"), description: t("dashboard.staff.assignmentSavedDescription") });
      setDialogOpen(false);
      await loadAssignments();
    } catch (error: any) {
      toast({ title: t("dashboard.staff.assignmentErrorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setSavingKey("");
    }
  };

  const updateAssignment = async (assignment: StaffLocationAssignment, updates: Partial<StaffLocationAssignment>, successTitle: string, failureFallback: string) => {
    try {
      setSavingKey(`${assignment.business_user_id}:${assignment.location_id}:update`);
      const authorization = await getAuthHeader();
      const response = await fetch("/api/staff/locations", {
        method: "PATCH",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: businessId,
          business_user_id: assignment.business_user_id,
          location_id: assignment.location_id,
          ...updates,
        }),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || failureFallback);

      toast({ title: successTitle });
      await loadAssignments();
    } catch (error: any) {
      toast({ title: t("dashboard.staff.assignmentErrorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setSavingKey("");
    }
  };

  const removeAssignment = async (assignment: StaffLocationAssignment) => {
    try {
      setSavingKey(`${assignment.business_user_id}:${assignment.location_id}:remove`);
      const authorization = await getAuthHeader();
      const response = await fetch("/api/staff/locations", {
        method: "DELETE",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: businessId,
          business_user_id: assignment.business_user_id,
          location_id: assignment.location_id,
        }),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || t("dashboard.staff.assignmentRemoveFailed"));

      toast({ title: t("dashboard.staff.assignmentRemovedTitle"), description: t("dashboard.staff.assignmentRemovedDescription") });
      await loadAssignments();
    } catch (error: any) {
      toast({ title: t("dashboard.staff.assignmentErrorTitle"), description: error.message, variant: "destructive" });
    } finally {
      setSavingKey("");
    }
  };

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t("dashboard.staff.locationsTitle")}
          </CardTitle>
          <CardDescription>{t("dashboard.staff.locationsDescription")}</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void loadAssignments()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("dashboard.staff.refreshAssignments")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activeLocations.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">{t("dashboard.staff.noLocations")}</p>
            <p className="text-sm text-muted-foreground">{t("dashboard.staff.noLocationsDescription")}</p>
          </div>
        ) : (
          activeStaff.map((member) => {
            const memberAssignments = assignmentForStaff(member.id);
            const defaultAssignment = memberAssignments.find((assignment) => assignment.is_default);
            return (
              <div key={member.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{member.profile?.full_name || t("dashboard.staff.memberFallback")}</h3>
                      <p className="text-sm text-muted-foreground">{member.profile?.email || t("dashboard.staff.emailUnavailable")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">{member.role || t("dashboard.staff.roleFallback")}</Badge>
                      {defaultAssignment ? (
                        <Badge className="gap-1 bg-primary text-primary-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("dashboard.staff.defaultLocation")}: {defaultAssignment.business_locations?.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t("dashboard.staff.noDefaultLocation")}</Badge>
                      )}
                    </div>
                  </div>
                  <Button type="button" size="sm" className="gap-2" onClick={() => openAssignDialog(member.id)}>
                    <MapPin className="h-4 w-4" />
                    {t("dashboard.staff.assignLocation")}
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("dashboard.staff.assignedLocations")}</p>
                  {memberAssignments.length === 0 ? (
                    <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{t("dashboard.staff.noAssignedLocations")}</p>
                  ) : (
                    memberAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{assignment.business_locations?.name || t("dashboard.staff.locationFallback")}</p>
                          <p className="text-xs text-muted-foreground">{assignment.business_locations?.address || t("dashboard.staff.noLocationAddress")}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">{assignment.role === "location_manager" ? t("dashboard.staff.roleLocationManager") : t("dashboard.staff.roleStaff")}</Badge>
                            {assignment.is_default && <Badge className="bg-primary text-primary-foreground">{t("dashboard.staff.defaultBadge")}</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={assignment.is_default || Boolean(savingKey)}
                            onClick={() => void updateAssignment(assignment, { is_default: true }, t("dashboard.staff.assignmentDefaultTitle"), t("dashboard.staff.assignmentDefaultFailed"))}
                          >
                            {t("dashboard.staff.setDefault")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={Boolean(savingKey)}
                            onClick={() => void updateAssignment(
                              assignment,
                              { role: assignment.role === "location_manager" ? "staff" : "location_manager" },
                              t("dashboard.staff.assignmentSavedTitle"),
                              t("dashboard.staff.assignmentSaveFailed")
                            )}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            {assignment.role === "location_manager" ? t("dashboard.staff.makeStaff") : t("dashboard.staff.makeLocationManager")}
                          </Button>
                          <Button type="button" variant="destructive" size="sm" disabled={Boolean(savingKey)} onClick={() => void removeAssignment(assignment)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            {t("dashboard.staff.removeAssignment")}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.staff.assignDialogTitle")}</DialogTitle>
            <DialogDescription>{t("dashboard.staff.assignDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="assignment-location">{t("dashboard.staff.locationLabel")}</Label>
              <select
                id="assignment-location"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedLocationId}
                onChange={(event) => setSelectedLocationId(event.target.value)}
              >
                {activeLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-role">{t("dashboard.staff.assignmentRole")}</Label>
              <select
                id="assignment-role"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as AssignmentRole)}
              >
                <option value="staff">{t("dashboard.staff.roleStaff")}</option>
                <option value="location_manager">{t("dashboard.staff.roleLocationManager")}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input type="checkbox" checked={selectedDefault} onChange={(event) => setSelectedDefault(event.target.checked)} />
              {t("dashboard.staff.makeDefaultLocation")}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={Boolean(savingKey)}>
              {t("dashboard.staff.cancel")}
            </Button>
            <Button type="button" onClick={() => void saveAssignment()} disabled={!selectedLocationId || Boolean(savingKey)}>
              {savingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("dashboard.staff.assignSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}