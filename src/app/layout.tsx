import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./operations.css";
import "leaflet/dist/leaflet.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FindIT | Community lost and found",
  description: "Report lost and found items, explore station references, and follow clear status updates with FindIT.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={inter.variable}><body><a href="#main" className="skip-link">Skip to content</a>{children}</body></html>;
}
