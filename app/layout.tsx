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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#11152b" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var m=matchMedia('(prefers-color-scheme:dark)');function apply(){var p=localStorage.getItem('peppilot-theme');var t=p==='light'||p==='dark'?p:m.matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}apply();m.addEventListener('change',apply);window.addEventListener('storage',apply)}catch(e){}})()` }} /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
