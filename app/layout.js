import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const GeistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const GeistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AirDeal : 항공 특가 피드 서비스",
  description: "여행을 꿈꾸는 모두를 위해 항공사별 프로모션을 쉽게 모아보는 피드 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ GA4 스크립트 삽입 */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-5G37674EE2"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-5G37674EE2');
            `,
          }}
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
