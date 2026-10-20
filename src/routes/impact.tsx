import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/rail/SiteChrome";
import { ImpactSection, TechSection } from "@/components/rail/Sections";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Impact — RailOpt AI" },
      { name: "description", content: "Intended impact of smarter freight route planning on cost, modal shift and rake utilisation." },
      { property: "og:title", content: "Impact — RailOpt AI" },
      { property: "og:description", content: "Intended impact of smarter freight route planning on cost, modal shift and rake utilisation." },
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
      <ImpactSection /><TechSection />
      <SiteFooter />
    </div>
  );
}
