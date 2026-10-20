import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/rail/SiteChrome";
import { HowSection, TechSection } from "@/components/rail/Sections";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — RailOpt AI" },
      { name: "description", content: "Enter a shipment, compare routes and export a freight plan in three steps." },
      { property: "og:title", content: "How It Works — RailOpt AI" },
      { property: "og:description", content: "Enter a shipment, compare routes and export a freight plan in three steps." },
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
      <HowSection /><TechSection />
      <SiteFooter />
    </div>
  );
}
