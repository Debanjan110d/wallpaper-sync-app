import "./globals.css";

export const metadata = {
  title: "Wallpaper Sync Admin",
  description: "Admin panel for Wallpaper Sync",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
