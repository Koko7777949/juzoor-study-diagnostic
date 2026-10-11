import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "جذور | حلل مشكلتك الدراسية خطوة بخطوة",
  description:
    "تطبيق جذور يرشدك من المشكلة الظاهرة إلى أقرب سبب، ثم يقارن الحلول ويرسم لك خطة صغيرة قابلة للتنفيذ خلال 7 أيام.",
  keywords: ["جذور", "دراسة", "تنظيم وقت", "تشخيص دراسي", "طلاب"],
  authors: [{ name: "Z.ai" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0F6766",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} font-cairo antialiased bg-app-bg text-app-text min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
