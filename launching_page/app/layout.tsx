import "./globals.css";
import GalaxyBackground from "./_components/GalaxyBackground";
import AnalyticsTracker from "./_components/AnalyticsTracker";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";

export const metadata = {
  title: "Wallpaper Sync",
  description: "A lightweight Windows desktop app that rotates and syncs wallpapers.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable}`}
    >
      <body>
        <GalaxyBackground />
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
