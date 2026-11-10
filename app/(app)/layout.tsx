import type { Metadata } from "next";
import { Nunito, Plus_Jakarta_Sans, Noto_Sans_Bengali } from "next/font/google";
import { GoogleTagManager } from '@next/third-parties/google';
import SwalBrandInit from "@/components/SwalBrandInit";
import "./globals.css";
import ClientNavbarFooterWrapper from "@/components/ClientNavbarFooterWrapper";
import { getLocale } from "@/lib/i18n/getLocale";

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

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  if (locale === "bn") {
    return {
      title: "কানাডিয়ান নেস্ট - প্রিমিয়াম কোর্স প্ল্যাটফর্ম",
      description:
        "আন্তর্জাতিক মানের ফনিক্স, স্পোকেন ইংলিশ, IELTS ও শিক্ষক প্রশিক্ষণ কোর্স।",
    };
  }
  return {
    title: "Canadian Nest - Premium Course Selling Platform",
    description:
      "Learn high-demand tech and design skills with industry expert mentors.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale === "bn" ? "bn" : "en"}
      className={`${plusJakartaSans.variable} ${nunito.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <GoogleTagManager gtmId="GTM-WSM4637P" />
      <body
        className={`min-h-full flex flex-col ${locale === "bn" ? "font-bengali" : ""}`}
      >
        <SwalBrandInit />
        <ClientNavbarFooterWrapper locale={locale}>
          {children}
        </ClientNavbarFooterWrapper>
      </body>
    </html>
  );
}
