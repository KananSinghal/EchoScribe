import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoScribe — Voice notes, made searchable",
  description:
    "Record or upload audio, turn it into text, and search every voice note.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
