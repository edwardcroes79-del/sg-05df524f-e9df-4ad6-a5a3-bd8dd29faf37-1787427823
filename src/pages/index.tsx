import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Stamp, 
  ArrowRight, 
  QrCode, 
  Smartphone, 
  Users, 
  CheckCircle2, 
  LineChart,
  Sparkles,
  Coffee,
  Utensils,
  Scissors,
  Car,
  Dumbbell,
  ShoppingBag,
  Store,
  HeartHandshake,
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { homeConfig } from "@/lib/homeConfig";
import { cn } from "@/lib/utils";

export default function Home() {
  const { pricing, faq, footer: defaultFooter } = homeConfig;
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Explicitly type the footer state to allow the optional database-driven copyrightText
  const [footer, setFooter] = useState<{
    aboutText: string;
    copyrightText?: string;
    sections: {
      title: string;
      links: {
        label: string;
        href: string;
      }[];
    }[];
  }>({
    ...defaultFooter,
    copyrightText: "Aruba Royalty Stamp. All rights reserved."
  });

  useEffect(() => {
    async function loadFooter() {
      try {
        const { data, error } = await supabase
          .from("website_settings")
          .select("value")
          .eq("key", "footer")
          .maybeSingle();
        
        if (data && data.value) {
          const val = data.value as any;
          setFooter({
            ...defaultFooter,
            aboutText: val.aboutText || defaultFooter.aboutText,
            copyrightText: val.copyrightText || `© ${new Date().getFullYear()} Aruba Royalty Stamp. All rights reserved.`,
          });
        }
      } catch (err) {
        console.error("Error loading dynamic footer:", err);
      }
    }
    loadFooter();
  }, [defaultFooter]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden">
      
      {/* PREMIUM NAVIGATION */}
      <header className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm py-0" : "bg-transparent py-2"
      )}>
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <Stamp className="w-6 h-6" />
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight">
              Royalty<span className="text-primary">Stamp</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            <Link href="#industries" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Industries</Link>
            <Link href="#pricing" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="#faq" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden sm:block">
              <Button variant="ghost" className="font-semibold text-base px-6 h-12 rounded-full hover:bg-primary/5 hover:text-primary">Log in</Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base px-6 h-12 rounded-full shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Mobile Menu Toggle */}
        <button 
          className="lg:hidden p-2 text-foreground hover:text-primary transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-[88px] z-40 bg-background/98 backdrop-blur-md lg:hidden animate-fade-in-up overflow-y-auto">
          <nav className="flex flex-col items-center gap-6 pt-12 p-6 min-h-full pb-32">
            <Link href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold text-foreground hover:text-primary transition-colors">Features</Link>
            <Link href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold text-foreground hover:text-primary transition-colors">How It Works</Link>
            <Link href="#industries" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold text-foreground hover:text-primary transition-colors">Industries</Link>
            <Link href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold text-foreground hover:text-primary transition-colors">Pricing</Link>
            <Link href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold text-foreground hover:text-primary transition-colors">FAQ</Link>
            
            <div className="flex flex-col w-full max-w-sm gap-4 mt-8 pt-8 border-t border-border/50">
              <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
                <Button variant="outline" className="w-full h-14 text-lg font-bold rounded-full border-2">Log in</Button>
              </Link>
              <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
                <Button className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/25">Start Free Trial</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>

    <main>
      {/* IMMERSIVE HERO SECTION */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-32">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* Left: Copy & CTAs */}
            <div className="flex-1 space-y-8 text-center lg:text-left z-10 max-w-2xl lg:max-w-none mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-wide border border-primary/20">
                <Sparkles className="w-4 h-4" /> Designed for local businesses
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold font-heading text-foreground leading-[1.1] tracking-tight">
                Turn Every Visit Into a <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">Reward</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Create and manage digital stamp cards in minutes. Reward repeat visits, capture insights, and keep your customers coming back without the hassle of paper cards.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                <Link href="/auth/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-xl shadow-primary/30 transition-all hover:-translate-y-1">
                    Start Your 14-Day Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 text-lg font-bold rounded-full border-2 hover:bg-muted/50 transition-colors">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground font-medium pt-2">No credit card required to get started.</p>
            </div>

            {/* Right: Product Composition */}
            <div className="flex-1 relative w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto lg:ml-auto perspective-1000 mt-12 lg:mt-0">
              <div className="relative aspect-[4/5] md:aspect-[4/5] w-full z-10 animate-fade-in-up">
                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-primary/20 to-transparent p-1">
                  <div className="w-full h-full rounded-[2.4rem] overflow-hidden shadow-2xl bg-card border border-border/50 relative">
                    <Image 
                      src="/generated/hero-mockup.png" 
                      alt="Royalty Stamp Digital Card" 
                      fill 
                      className="object-cover object-center"
                      priority 
                    />
                  </div>
                </div>
              </div>

              {/* Floating UI Element 1 */}
              <div className="absolute left-0 sm:-left-6 top-12 sm:top-24 bg-card p-3 sm:p-4 rounded-2xl shadow-xl border border-border/50 flex items-center gap-3 sm:gap-4 z-20 animate-float scale-90 sm:scale-100 origin-top-left">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="text-[#2E7D32] w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-xs sm:text-sm truncate">Stamp Added!</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">Coffee Purchase</p>
                </div>
              </div>

              {/* Floating UI Element 2 */}
              <div className="absolute right-0 sm:-right-8 bottom-16 sm:bottom-32 bg-card p-3 sm:p-4 rounded-2xl shadow-xl border border-border/50 flex items-center gap-3 sm:gap-4 z-20 animate-float-delayed scale-90 sm:scale-100 origin-bottom-right">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Stamp className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-xs sm:text-sm truncate">Reward Unlocked</p>
                  <p className="text-[10px] sm:text-xs text-primary font-bold truncate">10/10 Stamps</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CORE FEATURES (4-column) */}
      <section id="features" className="py-24 bg-card border-y border-border/50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 tracking-tight">Everything you need to run a modern loyalty program</h2>
            <p className="text-xl text-muted-foreground">Say goodbye to lost paper cards and hello to seamless digital retention.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Smartphone, title: "Beautiful Loyalty Cards", desc: "Design stunning digital cards with your brand colors and logo in minutes." },
              { icon: Users, title: "Easy Enrollment", desc: "Customers join instantly by scanning a QR code—no app download required." },
              { icon: QrCode, title: "Simple Stamping", desc: "Staff securely issue stamps in seconds using our built-in QR scanner." },
              { icon: LineChart, title: "Business Insights", desc: "Track customer visits, popular times, and reward redemptions in real-time." }
            ].map((feat, i) => (
              <div key={i} className="p-8 rounded-3xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold font-heading mb-3">{feat.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE STORY 1: Customer Experience */}
      <section className="py-24 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 max-w-2xl mx-auto lg:mx-0">
              <span className="text-primary font-bold tracking-widest uppercase text-sm">Customer Experience</span>
              <h2 className="text-4xl md:text-5xl font-bold font-heading tracking-tight leading-tight">
                A loyalty card they'll never lose.
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Your customers carry their phones everywhere. Give them a digital loyalty experience that lives right in their browser. They can check their stamp progress, view rewards, and update their profile anytime.
              </p>
              <ul className="space-y-4 pt-4">
                {["Zero friction sign-up", "Always accessible on mobile", "Clear progress towards rewards"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-lg font-medium text-foreground">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 relative w-full">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                <Image src="/generated/lifestyle-scan.png" alt="Customer scanning QR code" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STORY 2: Business Dashboard */}
      <section className="py-24 md:py-32 bg-primary/5 border-y border-border/50 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
            <div className="flex-1 relative w-full">
              <div className="relative aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50">
                <Image src="/generated/dashboard-abstract-coral.png" alt="Business Dashboard Interface" fill className="object-cover" />
              </div>
            </div>
            <div className="flex-1 space-y-8 max-w-2xl mx-auto lg:mx-0">
              <span className="text-primary font-bold tracking-widest uppercase text-sm">Business Operations</span>
              <h2 className="text-4xl md:text-5xl font-bold font-heading tracking-tight leading-tight">
                Control everything from a powerful dashboard.
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Manage your entire loyalty program effortlessly. View recent transactions, authorize staff members to issue stamps, and track how many rewards are being claimed daily.
              </p>
              <div className="grid sm:grid-cols-2 gap-6 pt-4">
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50">
                  <Users className="w-8 h-8 text-primary mb-3" />
                  <h4 className="font-bold text-lg mb-1">Customer CRM</h4>
                  <p className="text-sm text-muted-foreground">See exactly who your best customers are.</p>
                </div>
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50">
                  <ShieldCheck className="w-8 h-8 text-primary mb-3" />
                  <h4 className="font-bold text-lg mb-1">Staff Management</h4>
                  <p className="text-sm text-muted-foreground">Securely authorize staff to stamp.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STORY 3: QR Enrollment */}
      <section className="py-24 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 max-w-2xl mx-auto lg:mx-0">
              <span className="text-primary font-bold tracking-widest uppercase text-sm">Seamless Growth</span>
              <h2 className="text-4xl md:text-5xl font-bold font-heading tracking-tight leading-tight">
                Make your program easy to find and join.
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Print your unique QR code on receipts, posters, or display it on a stand by the register. Customers simply point their camera, sign up in seconds, and collect their first stamp.
              </p>
              <Button variant="outline" className="h-14 px-8 text-lg font-bold rounded-full border-2">
                View Enrollment Flow
              </Button>
            </div>
            <div className="flex-1 relative w-full">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                <Image src="/generated/qr-standee.png" alt="QR Code display in store" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STORY 4: Analytics */}
      <section className="py-24 md:py-32 bg-primary/5 border-y border-border/50 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-16">
            <div className="flex-1 relative w-full">
              <div className="relative aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-border/50 bg-background flex items-center justify-center p-8">
                <Image src="/generated/dashboard-abstract-coral.png" alt="Business Analytics" fill className="object-cover opacity-80 mix-blend-multiply" />
                <div className="relative z-10 w-full max-w-sm bg-card p-6 rounded-2xl shadow-xl border border-border/50">
                     <h4 className="font-bold mb-4 text-foreground text-lg">Monthly Engagement</h4>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">New Customers</span>
                          <span className="font-bold text-primary">+124</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                           <div className="h-full bg-primary w-[75%] rounded-full"></div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-sm text-muted-foreground">Rewards Claimed</span>
                          <span className="font-bold text-foreground">42</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                           <div className="h-full bg-foreground w-[45%] rounded-full"></div>
                        </div>
                     </div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-8 max-w-2xl mx-auto lg:mx-0">
              <span className="text-primary font-bold tracking-widest uppercase text-sm">Actionable Insights</span>
              <h2 className="text-4xl md:text-5xl font-bold font-heading tracking-tight leading-tight">
                Discover insights across all your loyalty data.
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Track engagement, rewards, and customer activity in real time. Understand what keeps your customers coming back and optimize your business.
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <LineChart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Live Analytics</h4>
                  <p className="text-sm text-muted-foreground">No more guessing—know exactly how your program performs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="py-24 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 tracking-tight">The Complete Solution</h2>
            <p className="text-xl text-muted-foreground">Everything you need to run a world-class loyalty program from any device.</p>
          </div>
          <div className="relative max-w-5xl mx-auto aspect-[16/9] md:aspect-[21/9] rounded-[2rem] md:rounded-[3rem] bg-gradient-to-tr from-primary/10 to-primary/5 p-4 md:p-8 flex items-center justify-center shadow-2xl border border-border/50 overflow-hidden">
              <Image src="/generated/hero-business.png" alt="Product Showcase Mockup" fill className="object-cover" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 md:py-32 bg-foreground text-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 tracking-tight text-white">Launch in three simple steps</h2>
            <p className="text-xl text-muted-foreground/80">Get your digital loyalty program running today. No technical skills required.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border/20 -z-10"></div>
            
            {[
              { step: "01", title: "Create Your Program", desc: "Sign up and use our visual editor to design your card. Set your stamp target and reward." },
              { step: "02", title: "Customers Join", desc: "Display your QR code. Customers scan it to instantly add the card to their digital wallet." },
              { step: "03", title: "Stamp & Reward", desc: "Staff scan customer codes to issue stamps. When full, customers redeem their reward." }
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center relative z-10">
                <div className="w-24 h-24 bg-foreground rounded-full border-4 border-background flex items-center justify-center mb-8 shadow-xl">
                  <span className="text-3xl font-extrabold text-primary font-heading">{s.step}</span>
                </div>
                <h3 className="text-2xl font-bold font-heading mb-4 text-white">{s.title}</h3>
                <p className="text-lg text-muted-foreground/80 leading-relaxed max-w-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section id="industries" className="py-24 md:py-32 bg-card border-b border-border/50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 tracking-tight">Built for every kind of local business</h2>
            <p className="text-xl text-muted-foreground">Royalty Stamp is designed to drive repeat visits across industries.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: Coffee, label: "Cafés & Coffee" },
              { icon: Utensils, label: "Restaurants" },
              { icon: Scissors, label: "Salons & Beauty" },
              { icon: Car, label: "Car Washes" },
              { icon: Dumbbell, label: "Fitness Classes" },
              { icon: ShoppingBag, label: "Retail Stores" },
            ].map((ind, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-6 text-center bg-background rounded-2xl border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                  <ind.icon className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-bold text-foreground text-sm">{ind.label}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute top-0 w-full h-[600px] bg-primary/5 -z-10 skew-y-[-2deg] origin-top-left" />
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6 tracking-tight">{pricing.title}</h2>
            <p className="text-xl text-muted-foreground">{pricing.subtitle}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.plans.map((plan, i) => (
              <Card key={i} className={cn(
                "border-border/50 shadow-xl flex flex-col relative rounded-3xl overflow-hidden transition-transform hover:-translate-y-1 bg-card", 
                plan.isPopular ? "border-primary shadow-2xl shadow-primary/10 scale-105 md:-translate-y-4" : ""
              )}>
                {plan.isPopular && (
                  <div className="bg-primary text-primary-foreground py-2 text-center text-sm font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <CardHeader className="p-8 pb-6">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
                  <div className="mt-6 font-heading flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold">{plan.price}</span>
                    {plan.period && <span className="text-lg text-muted-foreground font-medium">{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-8 pt-0">
                  <ul className="space-y-4">
                    {plan.features.map((item, idx) => (
                      <li key={idx} className="flex items-start text-base font-medium text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" /> 
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                  {plan.ctaHref ? (
                    <a href={plan.ctaHref} className="w-full">
                      <Button 
                        size="lg"
                        className={cn("w-full text-lg font-bold rounded-full h-14", plan.isPopular ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
                      >
                        {plan.ctaText}
                      </Button>
                    </a>
                  ) : (
                    <Button 
                      size="lg"
                      className={cn("w-full text-lg font-bold rounded-full h-14", plan.isPopular ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
                    >
                      {plan.ctaText}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 bg-card border-y border-border/50">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-heading tracking-tight">{faq.title}</h2>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faq.items.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="bg-background border border-border/50 rounded-2xl px-6 shadow-sm data-[state=open]:border-primary/30 transition-colors">
                <AccordionTrigger className="text-left font-bold text-lg hover:no-underline py-6">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-lg leading-relaxed pb-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary -z-20"></div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 md:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold font-heading text-primary-foreground mb-8 tracking-tight max-w-3xl mx-auto leading-tight">
            Ready to turn visits into loyal customers?
          </h2>
          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto mb-12 font-medium">
            Start your 14-day free trial today. No credit card required. Setup takes less than 5 minutes.
          </p>
          <Link href="/auth/register">
            <Button size="lg" className="h-16 px-12 text-xl font-extrabold bg-background text-primary hover:bg-background/90 rounded-full shadow-2xl transition-all hover:scale-105 border-none">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </main>

    {/* FOOTER */}
    <footer className="bg-card pt-20 pb-10 border-t border-border/50">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6 group inline-flex">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                <Stamp className="w-5 h-5" />
              </div>
              <span className="font-heading font-bold text-xl tracking-tight">Royalty<span className="text-primary">Stamp</span></span>
            </Link>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md pr-8">
              {footer.aboutText}
            </p>
          </div>
          
          {footer.sections.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-foreground mb-6 uppercase tracking-wider text-sm">{section.title}</h4>
              <ul className="space-y-4">
                {section.links.map((link, lIdx) => {
                  const isExternal = link.href.startsWith("http");
                  return (
                    <li key={lIdx}>
                      {isExternal ? (
                        <a 
                          href={link.href} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-muted-foreground hover:text-primary font-medium transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="text-muted-foreground hover:text-primary font-medium transition-colors">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground font-medium">
          <p>{footer.copyrightText || `© ${new Date().getFullYear()} Aruba Royalty Stamp. All rights reserved.`}</p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}