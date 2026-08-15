import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Stamp, 
  ArrowRight, 
  ShieldCheck, 
  QrCode, 
  Smartphone, 
  Users, 
  MapPin, 
  CheckCircle2, 
  HelpCircle,
  LucideIcon
} from "lucide-react";
import { homeConfig } from "@/lib/homeConfig";

// Lucide icon mapping to allow dynamic rendering based on the config file
const iconMap: Record<string, LucideIcon> = {
  Stamp,
  QrCode,
  Smartphone,
  ShieldCheck,
  Users,
  MapPin,
  CheckCircle2,
  HelpCircle
};

export default function Home() {
  const { hero, howItWorks, features, pricing, faq, cta, navigation, footer } = homeConfig;

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
            {navigation.links.map((link, idx) => (
              <Link 
                key={idx} 
                href={link.href} 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
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
                  <MapPin className="mr-1 h-3 w-3" /> {hero.badgeText}
                </div>
                <h1 
                  className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading text-foreground leading-[1.1]"
                  dangerouslySetInnerHTML={{ __html: hero.titleHtml }}
                />
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                  {hero.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href={hero.ctaPrimaryHref}>
                    <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                      {hero.ctaPrimaryText} <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href={hero.ctaSecondaryHref}>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-semibold">
                      {hero.ctaSecondaryText}
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-border">
                  <Image src={hero.heroImage} alt="Local Aruba business owner" fill className="object-cover" priority />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl border border-border shadow-lg flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{hero.floatingTextTitle}</p>
                    <p className="text-sm text-muted-foreground">{hero.floatingTextDesc}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground">{howItWorks.title}</h2>
              <p className="text-muted-foreground mt-4 text-lg">{howItWorks.subtitle}</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-border -z-10"></div>
              
              {howItWorks.steps.map((s, i) => {
                const IconComponent = iconMap[s.iconName] || Stamp;
                return (
                  <div key={i} className="flex flex-col items-center text-center space-y-4 bg-background p-6 rounded-xl border border-border shadow-sm">
                    <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center border-8 border-background relative">
                      <span className="absolute -top-2 -right-2 bg-foreground text-background text-xs font-bold px-2 py-1 rounded-full">{s.step}</span>
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold font-heading">{s.title}</h3>
                    <p className="text-muted-foreground">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features & Benefits */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 w-full">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-xl border border-border">
                  <Image src={features.dashboardImage} alt="Dashboard interface" fill className="object-cover" />
                </div>
              </div>
              <div className="flex-1 space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground">{features.title}</h2>
                <p className="text-lg text-muted-foreground">
                  {features.description}
                </p>
                
                <ul className="space-y-6">
                  {features.items.map((feat, i) => {
                    const IconComponent = iconMap[feat.iconName] || ShieldCheck;
                    return (
                      <li key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-foreground">{feat.title}</h4>
                          <p className="text-muted-foreground mt-1">{feat.desc}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mb-4">{pricing.title}</h2>
            <p className="text-muted-foreground mb-16 text-lg max-w-2xl mx-auto">{pricing.subtitle}</p>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
              {pricing.plans.map((plan, i) => (
                <Card key={i} className={cn("border-border shadow-sm flex flex-col relative", plan.isPopular && "border-primary shadow-md")}>
                  {plan.isPopular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4 font-heading">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((item, idx) => (
                        <li key={idx} className="flex items-center text-sm text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={cn("w-full font-semibold", plan.isPopular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "outline")}
                      variant={plan.isPopular ? "default" : "outline"}
                    >
                      {plan.ctaText}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground">{faq.title}</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faq.items.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger className="text-left font-semibold text-lg">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-foreground -z-20"></div>
          <div className="absolute inset-0 bg-primary/20 -z-10"></div>
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold font-heading text-background mb-6">{cta.heading}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-background/80">
              {cta.description}
            </p>
            <Link href={cta.ctaHref}>
              <Button size="lg" className="h-14 px-10 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground border-none">
                {cta.ctaText}
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
                {footer.aboutText}
              </p>
            </div>
            {footer.sections.map((section, idx) => (
              <div key={idx}>
                <h4 className="font-bold text-foreground mb-4">{section.title}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {section.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <Link href={link.href} className="hover:text-primary transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Aruba Royalty Stamp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

// Custom CSS helper or conditional styling wrapper
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}