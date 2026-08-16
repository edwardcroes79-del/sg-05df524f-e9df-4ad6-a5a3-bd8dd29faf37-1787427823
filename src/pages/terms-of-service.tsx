import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";

export default function TermsOfService() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Terms of Service");
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from("website_pages").select("*").eq("slug", "terms-of-service").single();
        if (data) {
          setContent(data.content || "");
          setTitle(data.title || "Terms of Service");
        }
      } catch (err) {
        console.error("Failed to load terms of service", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <SEO title={`${title} | Aruba Royalty Stamp`} description={`Read the ${title.toLowerCase()} for Aruba Royalty Stamp.`} />
      <div className="min-h-screen bg-background text-foreground py-12 px-4">
        <div className="container max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center text-primary hover:underline mb-8 font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
              <h1 className="text-3xl font-heading font-bold mb-6 pb-4 border-b">{title}</h1>
              {content ? (
                <div 
                  className="space-y-4 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-6 [&>h2]:mb-4 [&>p]:text-muted-foreground [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:text-muted-foreground [&>ul]:space-y-2" 
                  dangerouslySetInnerHTML={{ __html: content }} 
                />
              ) : (
                <p className="text-muted-foreground">This page is currently being updated. Please check back later.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}