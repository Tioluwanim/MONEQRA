import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MONEQRA — From payment incident to business impact",
  description: "See what a payment problem means for your business, and decide what to do next. Demo with simulated data. No real money moves.",
  metadataBase: new URL("https://moneqra.example"),
  openGraph: {
    title: "MONEQRA",
    description: "From payment incident to business impact.",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MONEQRA: from payment incident to business impact" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MONEQRA",
    description: "From payment incident to business impact.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
