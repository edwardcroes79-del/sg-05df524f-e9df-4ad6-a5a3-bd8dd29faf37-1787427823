import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Stamp, ArrowRight, ShieldCheck, QrCode, Smartphone, Users, MapPin, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <>
      <Head>
        <title>Aruba Royalty Stamp | Digital Loyalty for the Caribbean</title>
        <meta name="description" content="Turn every visit into a loyal customer with our production-ready digital loyalty stamp SaaS for Aruba businesses." />
      </Head>
      
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stamp className="w-6 h-6 text-primary" />
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">Royalty<span className="text-primary">Stamp</span></span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it Works</Link>
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-semibold text-foreground">Log in</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 md:pt-24 pb-32">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-8 text-center lg:text-left z-10">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <MapPin className="mr-1 h-3 w-3" /> Built for Aruba Businesses
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading text-foreground leading-[1.1]">
                  Turn Every Visit Into a <span className="text-primary relative inline-block">Loyal Customer.
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                  Ditch the paper cards. Our digital loyalty platform lets you issue stamps, track rewards, and retain both locals and tourists with simple QR code scanning.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/auth/register">
                    <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                      Start Your Program <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-semibold">
                      See How It Works
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-border">
                  <Image src="/generated/hero-business.png" alt="Local Aruba business owner" fill className="object-cover" priority />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl border border-border shadow-lg flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Reward Unlocked!</p>
                    <p className="text-sm text-muted-foreground">Free Iced Coffee</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground">Simple for you. Magic for them.</h2>
              <p className="text-muted-foreground mt-4 text-lg">Set up in minutes, no app download required for customers.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-border -z-10"></div>
              
              {[
              { step: "01", icon: <Stamp className="w-8 h-8 text-primary" />, title: "Create Your Program", desc: "Define your brand colors, set how many stamps equal a reward, and what the reward is." },
              { step: "02", icon: <QrCode className="w-8 h-8 text-primary" />, title: "Generate QR Codes", desc: "Place your unique QR code at the register. Customers scan it with their standard phone camera." },
              { step: "03", icon: <Smartphone className="w-8 h-8 text-primary" />, title: "Issue Digital Stamps", desc: "Staff verify the visit and issue a stamp directly to the customer's digital card. No apps needed." }].
              map((s, i) =>
              <div key={i} className="flex flex-col items-center text-center space-y-4 bg-background p-6 rounded-xl border border-border shadow-sm">
                  <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center border-8 border-background relative">
                    <span className="absolute -top-2 -right-2 bg-foreground text-background text-xs font-bold px-2 py-1 rounded-full">{s.step}</span>
                    {s.icon}
                  </div>
                  <h3 className="text-xl font-bold font-heading">{s.title}</h3>
                  <p className="text-muted-foreground">{s.desc}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features & Benefits */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 w-full">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-xl border border-border">
                  <Image src="/generated/abstract-dashboard.png" alt="Dashboard interface" fill className="object-cover" />
                </div>
              </div>
              <div className="flex-1 space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground">Production-Ready Reliability.</h2>
                <p className="text-lg text-muted-foreground">
                  Paper cards get lost, forged, or forgotten. Our SaaS platform provides concrete data and immutable transaction history for true peace of mind.
                </p>
                
                <ul className="space-y-6">
                  {[
                  { title: "Immutable History", desc: "Every stamp creates an unalterable transaction record. No more arbitrary frontend increments or employee fraud." },
                  { title: "Strict Multi-Tenant Security", desc: "Your data is completely isolated using advanced Row Level Security. Your competitors can never access your customer list." },
                  { title: "Role-Based Access", desc: "Separate accounts for Owners and Staff. Ensure cashiers can issue stamps but only you can alter the program rules." }].
                  map((feat, i) =>
                  <li key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground">{feat.title}</h4>
                        <p className="text-muted-foreground mt-1">{feat.desc}</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mb-16 text-lg max-w-2xl mx-auto">Scale your loyalty program as your business grows. No hidden fees.</p>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
              {/* Starter */}
              <Card className="border-border shadow-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="text-2xl">Starter</CardTitle>
                  <CardDescription>Perfect for single-location cafes and shops.</CardDescription>
                  <div className="mt-4 font-heading">
                    <span className="text-4xl font-bold">AWG 45</span><span className="text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {["Up to 500 customers", "1 Loyalty Program", "2 Staff Accounts", "Basic Analytics", "Email Support"].map((item, i) =>
                    <li key={i} className="flex items-center text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> {item}
                      </li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full font-semibold">Start Free Trial</Button>
                </CardFooter>
              </Card>

              {/* Pro */}
              <Card className="border-primary shadow-md relative flex flex-col">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl">Professional</CardTitle>
                  <CardDescription>For growing businesses with high foot traffic.</CardDescription>
                  <div className="mt-4 font-heading">
                    <span className="text-4xl font-bold">AWG 149</span><span className="text-muted-foreground">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {["Unlimited customers", "Up to 3 Loyalty Programs", "Unlimited Staff Accounts", "Advanced Analytics", "Priority Support"].map((item, i) =>
                    <li key={i} className="flex items-center text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> {item}
                      </li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">Start Free Trial</Button>
                </CardFooter>
              </Card>

              {/* Enterprise */}
              <Card className="border-border shadow-sm flex flex-col">
                <CardHeader>
                  <CardTitle className="text-2xl">Enterprise</CardTitle>
                  <CardDescription>For multi-location chains and franchises.</CardDescription>
                  <div className="mt-4 font-heading">
                    <span className="text-4xl font-bold">Custom</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {["Everything in Pro", "Unlimited Loyalty Programs", "Multi-location routing", "Custom integrations", "Dedicated Account Manager"].map((item, i) =>
                    <li key={i} className="flex items-center text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> {item}
                      </li>
                    )}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full font-semibold">Contact Sales</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-semibold text-lg">Do my customers need to download an app?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  No! That's the beauty of our system. Customers simply scan your QR code with their smartphone's native camera. They can access their digital loyalty card directly in their mobile browser, removing the biggest barrier to adoption.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-semibold text-lg">Is my data shared with other businesses?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Absolutely not. We use strict Row Level Security (RLS) on our database. Your customer lists, transaction history, and business metrics are completely isolated and only visible to authorized users under your business account.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-semibold text-lg">How do I prevent staff from issuing fake stamps?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Our system creates an immutable transaction log for every stamp issued, recording the exact time, customer, and the staff member who issued it. We also include location-based verification and velocity checks to flag suspicious activity automatically.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left font-semibold text-lg">Can I customize the look of my loyalty card?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  Yes. During onboarding, you'll set your brand's primary color and logo. The digital cards your customers see will automatically theme themselves to match your brand identity, ensuring a premium, unified experience.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-foreground -z-20"></div>
          <div className="absolute inset-0 bg-primary/20 -z-10"></div>
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold font-heading text-background mb-6">Ready to upgrade your loyalty experience?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-background/80">
              Join the growing network of Aruba businesses building stronger relationships with their customers. Setup takes less than 5 minutes.
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground border-none">
                Create Your Business Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Stamp className="w-5 h-5 text-primary" />
                <span className="font-heading font-bold text-lg text-foreground">Royalty<span className="text-primary">Stamp</span></span>
              </div>
              <p className="text-muted-foreground max-w-sm mb-4">
                The modern, production-ready digital loyalty platform designed specifically for the Caribbean market.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="/auth/login" className="hover:text-primary transition-colors">Business Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Aruba Royalty Stamp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>);

}