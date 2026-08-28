import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "PropertyOps Hub",
  title: {
    default: "PropertyOps Hub",
    template: "%s · PropertyOps Hub",
  },
  description: "PropertyOps Hub platform",
  icons: {
    icon: "/propertyops-favicon.png",
    shortcut: "/propertyops-favicon.png",
    apple: "/propertyops-favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
