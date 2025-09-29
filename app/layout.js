import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MiniPlayer from "@/components/MiniPlayer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MiniPlayer />
        {children}
      </body>
    </html>
  );
}
