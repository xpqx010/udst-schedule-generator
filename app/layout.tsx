import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "UDST Schedule", template: "%s · UDST Schedule" },
  description: "Build conflict-free schedules from the courses and screenshots you provide.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
