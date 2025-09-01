import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Japan Administrative Hierarchy Map",
  description: "Interactive map of Japan's administrative divisions with PMTiles and search functionality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
