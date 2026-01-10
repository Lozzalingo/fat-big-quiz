// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components";
import SessionProvider from "@/utils/SessionProvider";
import Providers from "@/Providers";
import { getServerSession } from "next-auth";
import "svgmap/dist/svgMap.min.css";
import { ScrollProvider } from "@/utils/ScrollContext";
import EnhancedHeader from "@/components/Header/HeaderTop";
import VisitorTracker from "@/components/VisitorTracker"; // Import the new component


// Use multiple fonts for more design flexibility
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Fat Big Quiz - Pub Quiz Packs & Quiz Downloads",
  description: "Download ready-to-use pub quiz packs, music rounds, and picture quizzes. Perfect for quiz nights, pubs, and events.",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://fatbigquiz.com"),
  openGraph: {
    title: "Fat Big Quiz - Pub Quiz Packs & Quiz Downloads",
    description: "Download ready-to-use pub quiz packs, music rounds, and picture quizzes. Perfect for quiz nights, pubs, and events.",
    url: "https://fatbigquiz.com",
    siteName: "Fat Big Quiz",
    locale: "en_GB",
    type: "website",
    images: [
      {
        url: "/fat-big-quiz-promo.jpg",
        width: 1920,
        height: 640,
        alt: "Fat Big Quiz - Pub Quiz Packs & Downloads",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fat Big Quiz - Pub Quiz Packs & Quiz Downloads",
    description: "Download ready-to-use pub quiz packs, music rounds, and picture quizzes.",
    images: ["/fat-big-quiz-promo.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();

  return (
    <html lang="en" data-theme="light" className={`${inter.variable} ${poppins.variable}`}>
      <body className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <SessionProvider session={session}>
          <ScrollProvider>
            <VisitorTracker />
            <EnhancedHeader />
            <main className="flex-grow">
              <Providers>{children}</Providers>
            </main>
            <Footer />
          </ScrollProvider>
        </SessionProvider>
      </body>
    </html>
  );
}