import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stamp, ArrowRight, ShieldCheck, QrCode } from "lucide-react";

export default function Home() {
  return (
    <>
      <Head>
        <title>Aruba Royalty Stamp | Digital Loyalty for the Caribbean</title>
      </Head>
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 flex flex-col items-center">
          <div className="max-w-3xl text-center space-y-6 mt-12 mb-16">
            <div className="inline-flex items-center justify-center p-4 bg-accent rounded-full mb-4 shadow-sm">
              <Stamp className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Customer Loyalty, <span className="text-primary">Simplified.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              A production-ready digital stamp platform for Aruba businesses. Issue stamps, track rewards, and grow your customer base seamlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="font-medium px-8 text-primary-foreground">
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="font-medium px-8 bg-card">
                View Documentation
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">
            <Card className="border-border shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardHeader>
                <QrCode className="w-8 h-8 text-primary mb-3" />
                <CardTitle className="text-xl">Dynamic QR Scans</CardTitle>
                <CardDescription className="text-base mt-2">
                  Issue digital stamps instantly via secure, dynamic QR code scanning at the point of sale.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardHeader>
                <ShieldCheck className="w-8 h-8 text-primary mb-3" />
                <CardTitle className="text-xl">Multi-Tenant Security</CardTitle>
                <CardDescription className="text-base mt-2">
                  Strict Row Level Security ensuring business data remains fully isolated and protected.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardHeader>
                <Stamp className="w-8 h-8 text-primary mb-3" />
                <CardTitle className="text-xl">Immutable History</CardTitle>
                <CardDescription className="text-base mt-2">
                  Real transaction logs accurately track every single stamp issued and reward redeemed.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}