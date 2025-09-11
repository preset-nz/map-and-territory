import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Layout system imports
import {
  NoOpAuthProvider,
  AuthErrorBoundary,
} from "@/components/providers/auth-provider";
import AppLayout from "@/components/layout/app-layout";
import DialogProvider from "@/components/providers/dialog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Map & Territory ",
  description:
    "Professional desktop application with advanced layout management",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Auth Provider with Error Boundary */}
        <AuthErrorBoundary>
          <NoOpAuthProvider simulateLoading={false}>
            {/* Main Layout System */}
            <DialogProvider>
              <AppLayout>{children}</AppLayout>
            </DialogProvider>
          </NoOpAuthProvider>
        </AuthErrorBoundary>
      </body>
    </html>
  );
}
