import { DemoExperience } from "@/components/demo/demo-experience";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#fffaf1] text-[var(--ink)]">
      <SiteHeader />
      <div className="pt-[4.5rem]">
        <DemoExperience />
      </div>
      <SiteFooter />
    </main>
  );
}
