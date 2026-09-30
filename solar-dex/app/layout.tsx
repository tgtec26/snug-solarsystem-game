import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "별빛 천문대: 태양계 도감",
  description: "중1 과학 태양계 구성 천체와 태양의 활동 학습 게임 — 천문대 의뢰를 해결하며 관측 일지를 채운다",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
