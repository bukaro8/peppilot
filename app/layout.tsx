import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://protocols.weightpilot.uk"),
  title: {
    default: "PepPilot",
    template: "%s | PepPilot",
  },
  description: "A clearer way to track your peptide journey.",
  applicationName: "PepPilot",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PepPilot",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6faf7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
