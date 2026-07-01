import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 運動訓練與飲食紀錄系統",
  description: "本機端 AI 馬拉松訓練、飲食紀錄與回饋系統"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
