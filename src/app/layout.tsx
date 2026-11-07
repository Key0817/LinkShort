import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL || "http://localhost:3000"),
  title: "Link Short",
  description: "Acorta tus enlaces y compártelos fácilmente con Link Short.",
  openGraph: {
    title: "Link Short",
    description: "Acorta tus enlaces y compártelos fácilmente con Link Short.",
    siteName: "Link Short",
    locale: "es_CR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Link Short",
    description: "Acorta tus enlaces y compártelos fácilmente con Link Short.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 font-sans text-slate-950">{children}</body>
    </html>
  );
}
