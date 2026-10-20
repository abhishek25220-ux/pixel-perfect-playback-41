import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/rail/SiteChrome";
import { FeaturesSection, TechSection } from "@/components/rail/Sections";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — RailOpt AI" },
      { name: "description", content: "Multi-route search, cost-aware planning, transit estimates and wagon recommendations for rail freight." },
      { property: "og:title", content: "Features — RailOpt AI" },
      { property: "og:description", content: "Multi-route search, cost-aware planning, transit estimates and wagon recommendations for rail freight." },
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
      <FeaturesSection /><TechSection />
      <SiteFooter />
    </div>
  );
}
