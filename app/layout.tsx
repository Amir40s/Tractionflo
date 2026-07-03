import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans, Geist } from "next/font/google";
import RealtimeNotifications from "./components/RealtimeNotifications";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "TractionFlo",
  description: "Same Instagram growth outcomes. Same creator features. 10x simpler.",
};

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-caveat",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", plusJakartaSans.variable, caveat.variable, "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <RealtimeNotifications />
      </body>
    </html>
  );
}
