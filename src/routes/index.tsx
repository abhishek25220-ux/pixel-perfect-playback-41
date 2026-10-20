import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/rail/SiteChrome";
import { HeroSection, TechSection } from "@/components/rail/Sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RailOpt AI — Freight Route Optimization for Indian Railways" },
      { name: "description", content: "Prototype that compares lowest-cost, fastest and balanced freight rail routes with wagon recommendations." },
      { property: "og:title", content: "RailOpt AI — Freight Route Optimization for Indian Railways" },
      { property: "og:description", content: "Prototype that compares lowest-cost, fastest and balanced freight rail routes with wagon recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <HeroSection /><TechSection />
      <SiteFooter />
    </div>
  );
}
