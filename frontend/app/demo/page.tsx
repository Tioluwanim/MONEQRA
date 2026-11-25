import { DemoExperience } from "@/components/demo/demo-experience";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function DemoPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-screen">
        <DemoExperience />
      </main>
      <SiteFooter />
    </>
  );
}
