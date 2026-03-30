import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { SocialProof } from "@/components/landing/social-proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Comparison } from "@/components/landing/comparison";
import { Gallery } from "@/components/landing/gallery";
import { UseCases } from "@/components/landing/use-cases";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <SocialProof />
      {/* <HowItWorks /> */}
      <Features />
      <Comparison />
      <Pricing />
      <Gallery />
      <UseCases />
      <Testimonials />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
