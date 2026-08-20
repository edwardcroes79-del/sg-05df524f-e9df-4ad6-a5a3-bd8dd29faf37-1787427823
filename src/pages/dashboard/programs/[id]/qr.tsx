import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import Link from "next/link";
import { LoyaltyCard } from "@/components/LoyaltyCard";

export default function ProgramQR() {
  const router = useRouter();
  const { id } = router.query;
  const [program, setProgram] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const programId = id as string;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownedBusiness } = await supabase
        .from("businesses")
        .select("id, business_name, slug")
        .eq("owner_id", user.id)
        .maybeSingle();

      let businessId = ownedBusiness?.id;

      if (!businessId) {
        const { data: staffData } = await supabase
          .from("business_users")
          .select("business_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        businessId = staffData?.business_id;
      }

      if (!businessId) return;

      const { data: bData } = await supabase
        .from("businesses")
        .select("id, business_name, slug")
        .eq("id", businessId)
        .single();
      setBusiness(bData);

      const { data: pData } = await supabase
        .from("loyalty_programs")
        .select("id, business_id, name, stamp_target, reward_title, stamp_icon, card_color, active")
        .eq("id", programId)
        .eq("business_id", businessId)
        .maybeSingle();
        
      setProgram(pData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const joinUrl = typeof window !== 'undefined' && business && program 
    ? `${window.location.origin}/join/${business.slug}/${program.id}` 
    : '';

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!program) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Program Not Found</h2>
          <p className="text-muted-foreground">The loyalty program you are looking for does not exist or you do not have permission to view it.</p>
          <Link href="/dashboard/qr">
            <Button variant="outline">Back to QR Codes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>QR Poster | {program.name}</title>
      </Head>

      {/* Hide controls when printing */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link href={`/dashboard/programs/${id}`}>
            <Button variant="ghost" size="sm" className="mb-2 -ml-3">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Program
            </Button>
          </Link>
          <h1 className="text-3xl font-bold font-heading text-foreground">QR Poster</h1>
          <p className="text-muted-foreground">Print or display this to let customers join.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print Poster
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        {/* Printable Area */}
        <div 
          className="bg-white p-12 max-w-2xl w-full border rounded-xl shadow-sm text-center print:shadow-none print:border-none print:w-full print:max-w-full"
          ref={posterRef}
        >
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            {business?.business_name}
          </h2>
          <h1 className="text-5xl font-bold font-heading mb-8" style={{ color: program.card_color || 'currentColor' }}>
            SCAN & START EARNING REWARDS
          </h1>
          
          <div className="bg-white p-8 rounded-3xl inline-block shadow-lg border mb-12">
            <QRCode 
              value={joinUrl} 
              size={300}
              level="H"
              fgColor={program.card_color || "#0F172A"}
            />
          </div>

          <div className="max-w-sm mx-auto mb-8 text-left">
            <LoyaltyCard
              programName={program.name}
              businessName={business?.business_name}
              stampTarget={program.stamp_target}
              currentStamps={0}
              stampIcon={program.stamp_icon}
              rewardTitle={program.reward_title}
              color={program.card_color}
            />
          </div>

          <p className="text-xl text-muted-foreground">
            Just point your phone camera at the code above!
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:w-full { width: 100% !important; }
          .print\\:max-w-full { max-width: 100% !important; }
          
          /* Print only the poster content */
          .bg-white.p-12.max-w-2xl, .bg-white.p-12.max-w-2xl * {
            visibility: visible;
          }
          .bg-white.p-12.max-w-2xl {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 2rem;
          }
        }
      `}} />
    </DashboardLayout>
  );
}