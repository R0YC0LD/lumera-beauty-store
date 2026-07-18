import type { Metadata } from "next";
import { Nunito_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
});

const nunito = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luméra — Işığını Bul",
  description: "Seçilmiş kozmetik, cilt bakımı ve parfüm markalarını keşfedin. Güvenli ödeme, hızlı teslimat ve size özel güzellik ritüelleri.",
  icons: {
    icon: "/lumera-mark.svg",
    shortcut: "/lumera-mark.svg",
  },
  openGraph: {
    title: "Luméra — Işığını Bul",
    description: "Güzelliğin yeni ışığı. Seçilmiş bakım, makyaj ve parfüm dünyası.",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${jakarta.variable} ${nunito.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
