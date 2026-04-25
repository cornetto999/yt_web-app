import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import MiniPlayer from "@/components/MiniPlayer";
import { PlayerProvider } from "@/app/providers/PlayerProvider";

const appSans = Space_Grotesk({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const appMono = JetBrains_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "YT NO ads",
  description: "Created by Serjek999",
};

export default function RootLayout({ children }) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <body
        className={`${appSans.variable} ${appMono.variable} antialiased`}
      >
        <PlayerProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>

            <footer className="px-4 pb-28 pt-6 md:px-6 md:pb-24">
              <div className="mx-auto max-w-6xl rounded-2xl border border-white/70 bg-white/65 px-4 py-4 text-center text-[11px] font-medium tracking-[0.12em] text-slate-600 shadow-[0_8px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:text-xs sm:tracking-[0.16em]">
                © {currentYear} YT NO ads. Created by cornetto999. All rights reserved.
              </div>
            </footer>
          </div>
          <MiniPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
