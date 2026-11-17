import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
import "./globals.css";

const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "와글와글 퀴즈놀이터 · 다 같이 와글와글, 정답은 짜잔!",
  description: "초등부터 직장인 연수까지, TV·프로젝터에 띄워 다 같이 푸는 교실 퀴즈. 초성·넌센스·이모지·사자성어·AI·보안 퀴즈와 우리 반 문제 만들기.",
};

export const viewport: Viewport = { themeColor: "#f0efff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={jua.variable}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
