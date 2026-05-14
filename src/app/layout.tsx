import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { DashboardProvider } from "~/context/DashboardContext";
import { TouchScrollLock } from "~/components/ui/TouchScrollLock";

export const metadata: Metadata = {
  title: "TactixPro",
  description: "Advanced Sports Planning",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} bg-[#f0f2f5]`} style={{ height: '100%' }} suppressHydrationWarning>
      <body suppressHydrationWarning className="no-scrollbar bg-[#f0f2f5]" style={{ height: '100%' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('touchmove', function(e) {
                if (e.touches.length > 1) {
                  e.preventDefault();
                }
              }, { passive: false });
            `
          }}
        />
        <TRPCReactProvider>
          <DashboardProvider>
            <TouchScrollLock />
            {children}
          </DashboardProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
