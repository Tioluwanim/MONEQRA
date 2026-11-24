import type { Metadata } from "next";
import { Gilda_Display, Urbanist, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/lib/providers";
import "./globals.css";

const gilda = Gilda_Display({
  variable: "--font-gilda",
  subsets: ["latin"],
  weight: "400",
});

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MONEQRA — From payment incident to business impact",
  description: "A cinematic prototype for understanding payment incidents and making approved business decisions using simulated data.",
  metadataBase: new URL("https://moneqra.example"),
  openGraph: {
    title: "MONEQRA",
    description: "From payment incident to business impact.",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "MONEQRA ledger under pressure" }],
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
      className={`${gilda.variable} ${urbanist.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
