import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import RealtimeNotifications from "./components/RealtimeNotifications";
import "./globals.css";

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
    <html lang="en" className={`${plusJakartaSans.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <RealtimeNotifications />
      </body>
    </html>
  );
}
