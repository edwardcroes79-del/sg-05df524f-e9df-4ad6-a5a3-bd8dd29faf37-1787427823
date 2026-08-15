import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, QrCode } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EditProgram() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stamp_target: "10",
    reward_title: "",
    reward_description: "",
    card_color: "#F87171",
    stamp_icon: "Star"
  });

  useEffect(() => {
    if (id) fetchProgram();
  }, [id]);

  const fetchProgram = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("id", id as string)
        .single();

      if (error) throw error;
      
      setFormData({
        name: data.name,
        description: data.description || "",
        stamp_target: data.stamp_target.toString(),
        reward_title: data.reward_title,
        reward_description: data.reward_description || "",
        card_color: data.card_color || "#F87171",
        stamp_icon: data.stamp_icon || "Star"
      });
    } catch (error: any) {
      toast({
        title: "Error fetching program",
        description: error.message,
        variant: "destructive",
      });
      router.push("/dashboard/programs");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase
        .from("loyalty_programs")
        .update({
          name: formData.name,
          description: formData.description,
          stamp_target: parseInt(formData.stamp_target, 10),
          reward_title: formData.reward_title,
          reward_description: formData.reward_description,
          card_color: formData.card_color,
          stamp_icon: formData.stamp_icon,
          updated_at: new Date().toISOString()
        })
        .eq("id", id as string);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Loyalty program updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      // Soft delete logic could be added to DB, but for now we'll delete the record directly.
      // Note: If foreign keys exist in stamp_transactions, Postgres will block this unless cascading.
      // A safer pattern is deactivating, but user requested 'Delete' CRUD.
      const { error } = await supabase
        .from("loyalty_programs")
        .delete()
        .eq("id", id as string);

      if (error) {
        if (error.code === '23503') {
           throw new Error("Cannot delete program because it has active cards/stamps. Pause it instead.");
        }
        throw error;
      }

      toast({
        title: "Deleted",
        description: "Loyalty program has been deleted.",
      });
      router.push("/dashboard/programs");
    } catch (error: any) {
      toast({
        title: "Error deleting",
        description: error.message,
        variant: "destructive",
      });
      setDeleting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex p-8 justify-center">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <Head>
        <title>Edit Program | Dashboard</title>
      </Head>

      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/programs">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Edit Program</h1>
              <p className="text-muted-foreground mt-1">Update your loyalty program rules.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link href={`/dashboard/programs/${id}/qr`}>
              <Button variant="outline" size="sm" className="gap-2 border-primary text-primary hover:bg-primary/10">
                <QrCode className="h-4 w-4" /> Get QR Poster
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your loyalty program.
                    If customers already have stamps, you should PAUSE the program instead of deleting it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? "Deleting..." : "Delete Program"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Program Details</CardTitle>
              <CardDescription>Modify the information about your loyalty card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name</Label>
                <Input 
                  id="name" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stamp_target">Stamps Required for Reward</Label>
                <Input 
                  id="stamp_target" 
                  type="number" 
                  min="2" 
                  max="50" 
                  required 
                  value={formData.stamp_target}
                  onChange={(e) => setFormData({...formData, stamp_target: e.target.value})}
                />
              </div>

              <div className="pt-4 border-t border-border space-y-6">
                <div>
                  <h3 className="text-lg font-heading font-semibold">Card Customization</h3>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="card_color">Brand Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="card_color" 
                        type="color" 
                        className="w-16 h-10 p-1"
                        value={formData.card_color}
                        onChange={(e) => setFormData({...formData, card_color: e.target.value})}
                      />
                      <Input 
                        type="text" 
                        value={formData.card_color}
                        onChange={(e) => setFormData({...formData, card_color: e.target.value})}
                        className="font-mono uppercase"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stamp_icon">Stamp Icon</Label>
                    <select 
                      id="stamp_icon"
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.stamp_icon}
                      onChange={(e) => setFormData({...formData, stamp_icon: e.target.value})}
                    >
                      <option value="Star">Star</option>
                      <option value="Coffee">Coffee Cup</option>
                      <option value="Scissors">Scissors</option>
                      <option value="Utensils">Food / Utensils</option>
                      <option value="Car">Car</option>
                      <option value="Dumbbell">Gym / Dumbbell</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-6">
                <div>
                  <h3 className="text-lg font-heading font-semibold">Reward Configuration</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward_title">Reward Title</Label>
                  <Input 
                    id="reward_title" 
                    required 
                    value={formData.reward_title}
                    onChange={(e) => setFormData({...formData, reward_title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward_description">Reward Description / Terms</Label>
                  <Textarea 
                    id="reward_description" 
                    value={formData.reward_description}
                    onChange={(e) => setFormData({...formData, reward_description: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto gap-2">
                  {saving ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}