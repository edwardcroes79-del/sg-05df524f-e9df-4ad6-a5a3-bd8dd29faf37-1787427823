import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface StaffMember {
  id: string;
  user_id: string;
  role: string | null;
  status: string | null;
  profile?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

interface StaffLoyaltyCardAssignmentsProps {
  businessId: string;
  staff: StaffMember[];
}

interface LoyaltyProgramOption {
  id: string;
  name: string;
  stamp_target: number | null;
}

interface AssignmentRow {
  staff_user_id: string;
  loyalty_program_id: string;
}

export function StaffLoyaltyCardAssignments({
  businessId,
  staff,
}: StaffLoyaltyCardAssignmentsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<LoyaltyProgramOption[]>([]);
  const [assignmentsByStaff, setAssignmentsByStaff] = useState<Record<string, string[]>>({});
  const [selectedStaffUserId, setSelectedStaffUserId] = useState("");
  const [draftAssignments, setDraftAssignments] = useState<string[]>([]);

  const activeStaff = useMemo(
    () => staff.filter((member) => member.role === "staff" && member.status === "active" && member.user_id),
    [staff]
  );

  const refreshAssignmentData = async () => {
    setLoading(true);

    try {
      const { data: programRows, error: programError } = await supabase
        .from("loyalty_programs")
        .select("id, name, stamp_target")
        .eq("business_id", businessId)
        .eq("active", true)
        .order("created_at", { ascending: true });

      if (programError) {
        throw programError;
      }

      setPrograms((programRows || []) as LoyaltyProgramOption[]);

      if (activeStaff.length === 0) {
        setAssignmentsByStaff({});
        return;
      }

      const staffUserIds = activeStaff.map((member) => member.user_id);
      const { data: assignmentRows, error: assignmentError } = await supabase
        .from("staff_loyalty_program_assignments")
        .select("staff_user_id, loyalty_program_id")
        .eq("business_id", businessId)
        .in("staff_user_id", staffUserIds);

      if (assignmentError) {
        throw assignmentError;
      }

      const nextAssignments = staffUserIds.reduce<Record<string, string[]>>((accumulator, staffUserId) => {
        accumulator[staffUserId] = [];
        return accumulator;
      }, {});

      (assignmentRows || []).forEach((row: AssignmentRow) => {
        if (!nextAssignments[row.staff_user_id]) {
          nextAssignments[row.staff_user_id] = [];
        }

        nextAssignments[row.staff_user_id].push(row.loyalty_program_id);
      });

      setAssignmentsByStaff(nextAssignments);
    } catch (error: any) {
      toast({
        title: "Assignments unavailable",
        description: error.message || "Loyalty card assignments could not be loaded.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAssignmentData();
  }, [businessId, activeStaff.length]);

  useEffect(() => {
    if (activeStaff.length === 0) {
      setSelectedStaffUserId("");
      setDraftAssignments([]);
      return;
    }

    if (!selectedStaffUserId || !activeStaff.some((member) => member.user_id === selectedStaffUserId)) {
      setSelectedStaffUserId(activeStaff[0].user_id);
      return;
    }

    setDraftAssignments(assignmentsByStaff[selectedStaffUserId] || []);
  }, [activeStaff, assignmentsByStaff, selectedStaffUserId]);

  const programNameById = useMemo(
    () =>
      programs.reduce<Record<string, string>>((accumulator, program) => {
        accumulator[program.id] = program.name;
        return accumulator;
      }, {}),
    [programs]
  );

  const toggleProgram = (programId: string, checked: boolean) => {
    setDraftAssignments((current) => {
      if (checked) {
        return current.includes(programId) ? current : [...current, programId];
      }

      return current.filter((currentProgramId) => currentProgramId !== programId);
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedStaffUserId) return;

    setSaving(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const existingAssignments = assignmentsByStaff[selectedStaffUserId] || [];
      const toAdd = draftAssignments.filter((programId) => !existingAssignments.includes(programId));
      const toRemove = existingAssignments.filter((programId) => !draftAssignments.includes(programId));

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("staff_loyalty_program_assignments")
          .delete()
          .eq("business_id", businessId)
          .eq("staff_user_id", selectedStaffUserId)
          .in("loyalty_program_id", toRemove);

        if (deleteError) {
          throw deleteError;
        }
      }

      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("staff_loyalty_program_assignments")
          .upsert(
            toAdd.map((programId) => ({
              business_id: businessId,
              staff_user_id: selectedStaffUserId,
              loyalty_program_id: programId,
              assigned_by: authData.user.id,
            })),
            {
              onConflict: "business_id,staff_user_id,loyalty_program_id",
            }
          );

        if (insertError) {
          throw insertError;
        }
      }

      const nextAssignments = {
        ...assignmentsByStaff,
        [selectedStaffUserId]: [...draftAssignments],
      };

      setAssignmentsByStaff(nextAssignments);

      toast({
        title: "Assignments saved",
        description: "This staff member can now issue stamps only for the selected loyalty cards.",
      });
    } catch (error: any) {
      toast({
        title: "Assignments not saved",
        description: error.message || "Loyalty card assignments could not be updated.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty Card Assignment</CardTitle>
        <CardDescription>
          Assign one or more active loyalty cards to each staff account. Different staff members can share the same card.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activeStaff.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No active staff accounts are available for loyalty card assignment yet.
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No active loyalty cards are available for assignment in this business.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.2fr]">
            <div className="space-y-3">
              {activeStaff.map((member) => {
                const assignedProgramIds = assignmentsByStaff[member.user_id] || [];
                const assignedProgramNames = assignedProgramIds
                  .map((programId) => programNameById[programId])
                  .filter(Boolean);

                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      selectedStaffUserId === member.user_id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    onClick={() => {
                      setSelectedStaffUserId(member.user_id);
                      setDraftAssignments(assignmentsByStaff[member.user_id] || []);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {member.profile?.full_name || "Staff member"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {member.profile?.email || "Email unavailable"}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {assignedProgramIds.length} assigned
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignedProgramNames.length > 0 ? (
                        assignedProgramNames.map((programName) => (
                          <Badge key={programName} variant="outline">
                            {programName}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No loyalty cards assigned
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">
                  {activeStaff.find((member) => member.user_id === selectedStaffUserId)?.profile?.full_name || "Select a staff member"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose every loyalty card this staff account is allowed to stamp.
                </p>
              </div>

              <div className="space-y-3">
                {programs.map((program) => {
                  const checked = draftAssignments.includes(program.id);

                  return (
                    <label
                      key={program.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleProgram(program.id, value === true)}
                      />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{program.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {program.stamp_target ? `${program.stamp_target} stamps required` : "Active loyalty card"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Changes apply immediately. Removed cards revoke staff access without affecting past transactions.
                </p>
                <Button onClick={handleSaveAssignments} disabled={saving || !selectedStaffUserId}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save assignments
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}