import type { Metadata } from "next";
import "./globals.css";
import { ApiProxyInit } from "../components/ApiProxyInit";
import BackButtonHandler from "../components/BackButtonHandler";

import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "Apna Tuition App",
  description: "Modern Student Management System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ApiProxyInit />
        <BackButtonHandler />
        {children}
      </body>
    </html>
  );
}
