import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xMonks B2B Lead Prospecting & Journey CRM",
  description:
    "Manage B2B lead journeys, stage probability weightages (10% to 100%), and timestamped customer activity logs.",
  icons: {
    icon: [
      { url: "/xmonksdotcom_logo.jpg", type: "image/jpeg" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/xmonksdotcom_logo.jpg",
    apple: "/xmonksdotcom_logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/jpeg" href="/xmonksdotcom_logo.jpg" />
        <link rel="shortcut icon" href="/xmonksdotcom_logo.jpg" />
        <link rel="apple-touch-icon" href="/xmonksdotcom_logo.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('crm_theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150`}>
        {children}
      </body>
    </html>
  );
}
