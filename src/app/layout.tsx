import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TOEIC-drill",
  description: "TOEICリーディング問題演習アプリ",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="whitespace-nowrap font-semibold text-lg">
              TOEIC-drill
            </Link>
            <span
              className="whitespace-nowrap text-xs text-neutral-400"
              title="デプロイされているコミットハッシュ"
            >
              v{process.env.NEXT_PUBLIC_COMMIT_SHA ?? "unknown"}
            </span>
            <Link
              href="/quiz/setup"
              className="whitespace-nowrap py-1 text-sm text-neutral-600 hover:text-neutral-900"
            >
              出題する
            </Link>
            <Link
              href="/bookmarks"
              className="whitespace-nowrap py-1 text-sm text-neutral-600 hover:text-neutral-900"
            >
              ブックマーク復習
            </Link>
            <Link
              href="/questions/manage"
              className="whitespace-nowrap py-1 text-sm text-neutral-600 hover:text-neutral-900"
            >
              問題データ管理
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
