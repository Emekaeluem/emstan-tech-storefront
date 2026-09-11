import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Domains & Hosting | Emstan Tech", description: "Secure a domain, hosting, professional email and AI website tools in one simple first-year package from Emstan Tech.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
