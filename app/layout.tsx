import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Who's That Pokemon",
  description: "A Pokemon guessing game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-custom-sand`}>
        <nav className="bg-custom-brown p-4 shadow-lg">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold text-custom-sand">{`Who's That Pokemon?`}</h1>
          </div>
        </nav>
        
        <main className="container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 min-h-[calc(100vh-12rem)]">
            {children}
            <Analytics/>
          </div>
        </main>

        <footer className="bg-custom-brown text-custom-sand p-4 mt-8">
          <div className="container mx-auto text-center">
            <p>Created with ❤️</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
