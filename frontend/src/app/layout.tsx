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
      <body className={`${inter.variable} min-h-full flex flex-col bg-[var(--background)] text-zinc-100 antialiased relative overflow-x-hidden selection:bg-violet-400/20 selection:text-violet-100`}>
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/[0.03] rounded-full blur-[120px] pointer-events-none z-0 animate-glow-pulse" />
        <div className="absolute bottom-1/4 left-0 w-[600px] h-[600px] bg-violet-800/[0.02] rounded-full blur-[150px] pointer-events-none z-0" />

        <AuthProvider>
          <div className="flex-1 flex flex-col z-10 relative">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
