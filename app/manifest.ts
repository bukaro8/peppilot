import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PepPilot",
    short_name: "PepPilot",
    description: "Track peptide protocols, cycles, injections and health records.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6faf7",
    theme_color: "#08705a",
    icons: [
      { src: "/icons/peppilot-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/peppilot-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/peppilot-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
