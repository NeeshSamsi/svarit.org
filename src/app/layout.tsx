import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Svarit",
  description: "Hindustani Classical Music nonprofit, founded 2001",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-body text-foreground bg-primary antialiased">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/yan0qzb.css" />
      </head>
      <body>
        <Nav />
        <main className="grid grid-cols-12 gap-6 max-w-content mx-auto w-full px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
