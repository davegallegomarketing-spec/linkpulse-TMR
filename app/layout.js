import "./globals.css";

export const metadata = {
  title: "LinkPulse Golf - Free Golf News Aggregator",
  description:
    "Curate golf news from 14+ sources into newsletters. Free, no API keys needed.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
