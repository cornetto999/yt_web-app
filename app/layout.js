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
  return (
    <html lang="en">
      <body
        className={`${appSans.variable} ${appMono.variable} antialiased`}
      >
        <PlayerProvider>
          {children}
          <MiniPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
