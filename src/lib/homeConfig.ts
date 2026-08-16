export interface HeroConfig {
  badgeText: string;
  titleHtml: string; // supports HTML formatting for emphasis
  subtitle: string;
  ctaPrimaryText: string;
  ctaPrimaryHref: string;
  ctaSecondaryText: string;
  ctaSecondaryHref: string;
  heroImage: string;
  floatingTextTitle: string;
  floatingTextDesc: string;
}

export interface StepConfig {
  step: string;
  title: string;
  desc: string;
  iconName: string; // Map to dynamic Lucide icons or pre-allocated layout styles
}

export interface FeatureConfig {
  title: string;
  desc: string;
  iconName: string;
}

export interface PricingPlanConfig {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref?: string;
  isPopular?: boolean;
}

export interface FAQConfig {
  id: string;
  question: string;
  answer: string;
}

export interface CTAConfig {
  heading: string;
  description: string;
  ctaText: string;
  ctaHref: string;
}

export interface HomeConfig {
  hero: HeroConfig;
  howItWorks: {
    title: string;
    subtitle: string;
    steps: StepConfig[];
  };
  features: {
    title: string;
    description: string;
    items: FeatureConfig[];
    dashboardImage: string;
  };
  pricing: {
    title: string;
    subtitle: string;
    plans: PricingPlanConfig[];
  };
  faq: {
    title: string;
    items: FAQConfig[];
  };
  cta: CTAConfig;
  navigation: {
    links: { label: string; href: string }[];
  };
  footer: {
    aboutText: string;
    sections: {
      title: string;
      links: { label: string; href: string }[];
    }[];
  };
}

export const homeConfig: HomeConfig = {
  navigation: {
    links: [
      { label: "How it Works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" }
    ]
  },
  hero: {
    badgeText: "Built for Aruba Businesses",
    titleHtml: "Turn Every Visit Into a <span class=\"text-primary relative inline-block\">Loyal Customer.</span>",
    subtitle: "Ditch the paper cards. Our digital loyalty platform lets you issue stamps, track rewards, and retain both locals and tourists with simple QR code scanning.",
    ctaPrimaryText: "Start Your Program",
    ctaPrimaryHref: "/auth/register",
    ctaSecondaryText: "See How It Works",
    ctaSecondaryHref: "#how-it-works",
    heroImage: "/generated/hero-business.png",
    floatingTextTitle: "Reward Unlocked!",
    floatingTextDesc: "Free Iced Coffee"
  },
  howItWorks: {
    title: "Simple for you. Magic for them.",
    subtitle: "Set up in minutes, no app download required for customers.",
    steps: [
      {
        step: "01",
        iconName: "Stamp",
        title: "Create Your Program",
        desc: "Define your brand colors, set how many stamps equal a reward, and what the reward is."
      },
      {
        step: "02",
        iconName: "QrCode",
        title: "Generate QR Codes",
        desc: "Place your unique QR code at the register. Customers scan it with their standard phone camera."
      },
      {
        step: "03",
        iconName: "Smartphone",
        title: "Issue Digital Stamps",
        desc: "Staff verify the visit and issue a stamp directly to the customer's digital card. No apps needed."
      }
    ]
  },
  features: {
    title: "Production-Ready Reliability.",
    description: "Paper cards get lost, forged, or forgotten. Our SaaS platform provides concrete data and immutable transaction history for true peace of mind.",
    dashboardImage: "/generated/abstract-dashboard.png",
    items: [
      {
        title: "Immutable History",
        desc: "Every stamp creates an unalterable transaction record. No more arbitrary frontend increments or employee fraud.",
        iconName: "ShieldCheck"
      },
      {
        title: "Strict Multi-Tenant Security",
        desc: "Your data is completely isolated using advanced Row Level Security. Your competitors can never access your customer list.",
        iconName: "ShieldCheck"
      },
      {
        title: "Role-Based Access",
        desc: "Separate accounts for Owners and Staff. Ensure cashiers can issue stamps but only you can alter the program rules.",
        iconName: "ShieldCheck"
      }
    ]
  },
  pricing: {
    title: "Simple, Transparent Pricing",
    subtitle: "Scale your loyalty program as your business grows. No hidden fees.",
    plans: [
      {
        name: "Starter",
        price: "AWG 50",
        period: "/mo",
        description: "Perfect for single-location cafes and shops.",
        features: ["Up to 75 customers", "1 Loyalty Program", "2 Staff Accounts", "Basic Analytics", "Email Support"],
        ctaText: "Contact Us",
        ctaHref: "https://wa.me/2975678222"
      },
      {
        name: "Professional",
        price: "AWG 150",
        period: "/mo",
        description: "For growing businesses with high foot traffic.",
        features: ["Up to 500 customers", "Up to 3 Loyalty Programs", "Unlimited Staff Accounts", "Advanced Analytics", "Priority Support"],
        ctaText: "Contact Us",
        ctaHref: "https://wa.me/2975678222",
        isPopular: true
      },
      {
        name: "Enterprise",
        price: "Custom",
        period: "",
        description: "For multi-location chains and franchises.",
        features: ["Everything in Pro", "Unlimited Loyalty Programs", "Multi-location routing", "Custom integrations", "Dedicated Account Manager"],
        ctaText: "Contact Sales",
        ctaHref: "https://wa.me/2975678222"
      }
    ]
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        id: "item-1",
        question: "Do my customers need to download an app?",
        answer: "No! That's the beauty of our system. Customers simply scan your QR code with their smartphone's native camera. They can access their digital loyalty card directly in their mobile browser, removing the biggest barrier to adoption."
      },
      {
        id: "item-2",
        question: "Is my data shared with other businesses?",
        answer: "Absolutely not. We use strict Row Level Security (RLS) on our database. Your customer lists, transaction history, and business metrics are completely isolated and only visible to authorized users under your business account."
      },
      {
        id: "item-3",
        question: "How do I prevent staff from issuing fake stamps?",
        answer: "Our system creates an immutable transaction log for every stamp issued, recording the exact time, customer, and the staff member who issued it. We also include location-based verification and velocity checks to flag suspicious activity automatically."
      },
      {
        id: "item-4",
        question: "Can I customize the look of my loyalty card?",
        answer: "Yes. During onboarding, you'll set your brand's primary color and logo. The digital cards your customers see will automatically theme themselves to match your brand identity, ensuring a premium, unified experience."
      }
    ]
  },
  cta: {
    heading: "Ready to upgrade your loyalty experience?",
    description: "Join the growing network of Aruba businesses building stronger relationships with their customers. Setup takes less than 5 minutes.",
    ctaText: "Create Your Business Account",
    ctaHref: "/auth/register"
  },
  footer: {
    aboutText: "The modern, production-ready digital loyalty platform designed specifically for the Caribbean market.",
    sections: [
      {
        title: "Product",
        links: [
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "Business Login", href: "/auth/login" }
        ]
      },
      {
        title: "Company",
        links: [
          { label: "About Us", href: "#" },
          { label: "Contact", href: "https://wa.me/2975678222" },
          { label: "Privacy Policy", href: "/privacy-policy" },
          { label: "Terms of Service", href: "/terms-of-service" }
        ]
      }
    ]
  }
};