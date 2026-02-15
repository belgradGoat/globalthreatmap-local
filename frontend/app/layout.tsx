import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
import { AuthInitializer } from "@/components/auth/auth-initializer";

export const metadata: Metadata = {
  title: "Eagle Eye | Your Lens on the World",
  description: "Comprehensive global news research platform for exploring countries, current events, and international developments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistMono.className} antialiased min-h-screen`}>
        <AuthInitializer>{children}</AuthInitializer>
      </body>
    </html>
  );
}
