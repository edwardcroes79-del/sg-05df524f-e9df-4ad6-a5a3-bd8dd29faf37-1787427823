import { useEffect, useState } from "react";
import Head from "next/head";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, UserPlus, Users, MoreVertical, ShieldAlert, PowerOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function StaffPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  
  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });

  // Remove Staff Modal State
  const [staffToRemove, setStaffToRemove] = useState<any>(null);
  const [removingStaff, setRemovingStaff] = useState(false);

  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is owner of a business
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (biz) {
        setIsOwner(true);
        setBusiness(biz);

        // Fetch plan limits
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", biz.subscription_plan || "free")
          .single();
        
        setPlan(planData);

        // Fetch staff members for this business
        const { data: businessUsers } = await supabase
          .from("business_users")
          .select("id, user_id, role, status, created_at")
          .eq("business_id", biz.id)
          .order("created_at", { ascending: false });

        if (businessUsers && businessUsers.length > 0) {
          // Get session for secure API call
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            const userIds = businessUsers.map(bu => bu.user_id).filter(Boolean);
            
            // Fetch profiles via secure server-side API to bypass RLS restrictions on other users' profiles
            const profileResponse = await fetch("/api/staff/list", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                businessId: biz.id,
                userIds: userIds
              })
            });

            if (profileResponse.ok) {
              const { profiles } = await profileResponse.json();
              
              const mergedStaff = businessUsers.map(bu => {
                const profile = profiles?.find((p: any) => p.id === bu.user_id);
                return { ...bu, profile };
              });
              setStaff(mergedStaff);
            } else {
              // Fallback to displaying just the role/status if profile fetch fails
              setStaff(businessUsers.map(bu => ({ ...bu, profile: null })));
            }
          }
        } else {
          setStaff([]);
        }
      }
    } catch (err) {
      console.error("Error fetching staff data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    try {
      setAddingStaff(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch("/api/staff/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          businessId: business.id,
          name: newStaff.name,
          email: newStaff.email,
          password: newStaff.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create staff account");
      }

      toast({
        title: "Staff Added",
        description: "Staff account has been created successfully.",
      });

      setShowAddModal(false);
      setNewStaff({ name: "", email: "", password: "" });
      fetchStaffData();

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setAddingStaff(false);
    }
  };

  const handleUpdateStatus = async (staffId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("business_users")
        .update({ status: newStatus })
        .eq("id", staffId);

      if (error) throw error;
      
      toast({ title: "Status updated" });
      fetchStaffData();
    } catch (err: any) {
      toast({ title: "Error updating status", description: err.message, variant: "destructive" });
    }
  };

  const confirmRemoveStaff = async () => {
    if (!staffToRemove) return;
    
    try {
      setRemovingStaff(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch("/api/staff/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ staffId: staffToRemove.id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to remove staff member");
      }
      
      toast({ title: "Staff member removed", description: "The staff account has been completely removed." });
      setStaffToRemove(null);
      fetchStaffData();
    } catch (err: any) {
      toast({ title: "Error removing staff", description: err.message, variant: "destructive" });
    } finally {
      setRemovingStaff(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isOwner) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center max-w-md mx-auto">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only Business Owners can manage staff accounts.</p>
        </div>
      </DashboardLayout>
    );
  }

  const maxStaff = plan?.max_staff || 1;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const limitReached = activeStaff >= maxStaff;

  return (
    <DashboardLayout>
      <Head>
        <title>Staff Management | Aruba Royalty Stamp</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground text-sm">
              Manage staff accounts that can issue stamps and redeem rewards.
            </p>
          </div>
          
          <Button 
            onClick={() => setShowAddModal(true)} 
            disabled={limitReached}
            className="w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Usage Card */}
        <Card className={limitReached ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Staff Accounts Used</span>
              </div>
              <span className="font-bold text-lg">{activeStaff} / {maxStaff}</span>
            </div>
            
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mt-4">
              <div 
                className={`h-full ${limitReached ? 'bg-destructive' : 'bg-primary'}`} 
                style={{ width: `${Math.min(100, (activeStaff / maxStaff) * 100)}%` }}
              />
            </div>
            
            {limitReached && (
              <p className="text-sm text-destructive mt-3 font-medium">
                You have reached the staff limit included in your current {plan?.name} plan. Please upgrade your plan to add more staff accounts.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Staff List */}
        <div className="grid gap-4">
          {staff.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-1">No staff members yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Add your first staff member to help manage the loyalty program.</p>
                <Button onClick={() => setShowAddModal(true)} disabled={limitReached}>
                  Add Staff Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            staff.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      {member.profile?.full_name?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">{member.profile?.full_name || "Staff Member"}</h4>
                      <p className="text-sm text-muted-foreground truncate">{member.profile?.email || "Email restricted"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <Badge variant="outline" className="hidden sm:inline-flex capitalize">
                      {member.role || "Staff"}
                    </Badge>
                    <Badge variant={member.status === 'active' ? "default" : "secondary"} className="hidden sm:inline-flex capitalize">
                      {member.status}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.status === 'active' ? (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(member.id, 'inactive')}>
                            <PowerOff className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(member.id, 'active')}
                            disabled={limitReached}
                          >
                            <PowerOff className="w-4 h-4 mr-2" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setStaffToRemove(member)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <form onSubmit={handleAddStaff}>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff account. They will be able to issue stamps and redeem rewards for your business.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={newStaff.name} 
                  onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={newStaff.email} 
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input 
                  id="password" 
                  type="text" 
                  value={newStaff.password} 
                  onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                  placeholder="Min 6 characters"
                  required 
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">Share this password with the staff member so they can log in.</p>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} disabled={addingStaff}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingStaff || limitReached}>
                {addingStaff ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Staff Modal */}
      <Dialog open={!!staffToRemove} onOpenChange={(open) => !open && setStaffToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member?</DialogTitle>
            <DialogDescription>
              This action will completely remove the staff member from your business and deactivate their account. They will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          
          {staffToRemove && (
            <div className="py-4 space-y-2">
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{staffToRemove.profile?.full_name || "Unknown"}</span>
              </div>
              <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm">{staffToRemove.profile?.email || "No email"}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffToRemove(null)} disabled={removingStaff}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveStaff} disabled={removingStaff}>
              {removingStaff ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Removing...</>
              ) : "Remove Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}