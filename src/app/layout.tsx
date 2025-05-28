import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Platform",
  description: "Submit your video content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
