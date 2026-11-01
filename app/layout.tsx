import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlanForge — Project Intelligence Workspace",
  description: "Plan projects of any kind with structured thinking, clear dependencies and connected decisions."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
