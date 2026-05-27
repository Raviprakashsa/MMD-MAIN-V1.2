import type { Metadata } from "next";
import "./globals.css";
import "@/styles/theme-modern.scss";
import "@/lib/sentry-init";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "MMDSS - Magnus Recruitment Management System",
  description: "Enterprise staffing operations platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="ops-modern-theme">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
