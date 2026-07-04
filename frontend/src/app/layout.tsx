import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "src/components/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepIQ - AI Interview Coach",
  description: "AI-powered interview coach that analyzes your resume and simulates realistic, real-time mock interviews with category feedback.",
  keywords: ["AI Interview Coach", "Mock Interview", "Resume Analysis", "Interview Practice", "Career Coach", "PrepIQ"],
  authors: [{ name: "PrepIQ Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className={`${inter.variable} min-h-full flex flex-col bg-zinc-950 text-zinc-100 antialiased`}>
        <AuthProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
