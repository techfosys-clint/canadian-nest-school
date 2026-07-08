import type { Metadata } from "next";
import { Nunito, Plus_Jakarta_Sans } from "next/font/google";
import { GoogleTagManager } from '@next/third-parties/google';
import SwalBrandInit from "@/components/SwalBrandInit";
import "./globals.css";
import ClientNavbarFooterWrapper from "@/components/ClientNavbarFooterWrapper";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Canadian Nest - Premium Course Selling Platform",
  description: "Learn high-demand tech and design skills with industry expert mentors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${nunito.variable} h-full antialiased`}
    >
      <GoogleTagManager gtmId="GTM-WSM4637P" />
      <body className="min-h-full flex flex-col">
        <SwalBrandInit />
        <ClientNavbarFooterWrapper>{children}</ClientNavbarFooterWrapper>
      </body>
    </html>
  );
}
