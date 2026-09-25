import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const googleSans = localFont({
  src: "../fonts/google-sans-flex-latin-opsz-normal.woff2",
  variable: "--font-google-sans",
  weight: "100 1000",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pixora — eng yaxshi dizayn ishlari bir joyda",
  description:
    "Behance, Dribbble, X va Dprofile'dagi eng yaxshi dizayn ishlari bitta toza va saralangan lentada.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={`${googleSans.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
