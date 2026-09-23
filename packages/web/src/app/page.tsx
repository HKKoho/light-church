import { SiteHeader } from '@/components/landing/site-header';
import { HeroSection } from '@/components/landing/hero-section';
import { WhySection } from '@/components/landing/why-section';
import { PreviewSection } from '@/components/landing/preview-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { CapabilitiesSection } from '@/components/landing/capabilities-section';
import { TrustSection } from '@/components/landing/trust-section';
import { CtaSection } from '@/components/landing/cta-section';
import { SiteFooter } from '@/components/landing/site-footer';

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <WhySection />
        <HowItWorksSection />
        <PreviewSection />
        <CapabilitiesSection />
        <TrustSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
