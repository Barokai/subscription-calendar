import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563EB' }, // Blue color for light mode
    { media: '(prefers-color-scheme: dark)', color: '#1E40AF' },  // Darker blue for dark mode
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Subscription Calendar",
  description:
    "Track and manage your subscriptions with our easy-to-use calendar",
  keywords: ["subscription", "calendar", "tracker", "finance", "management"],
  authors: [{ name: "Barokai" }],
  creator: "Barokai",
  publisher: "lab404.xyz",
  metadataBase: new URL("https://cal.lab404.xyz"),
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Subscription Calendar",
    description:
      "Track and manage your subscriptions with our easy-to-use calendar",
    url: "https://cal.lab404.xyz",
    siteName: "Subscription Calendar",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Subscription Calendar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Subscription Calendar",
    description:
      "Track and manage your subscriptions with our easy-to-use calendar",
    images: ["/og-image.svg"],
    creator: "@barokai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
