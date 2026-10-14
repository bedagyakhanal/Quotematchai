import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import Script from "next/script";
import { APP_NAME, APP_TAGLINE, APP_URL } from "@/lib/config";
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
  metadataBase: new URL(APP_URL),
  title: `${APP_NAME} — Frictionless Construction Quotes`,
  description: APP_TAGLINE,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          id="strip-extension-attrs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function clean() {
                    var els = document.querySelectorAll('[bis_skin_checked]');
                    for (var i = 0; i < els.length; i++) {
                      els[i].removeAttribute('bis_skin_checked');
                    }
                  }
                  clean();
                  new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                        m.target.removeAttribute('bis_skin_checked');
                      } else if (m.type === 'childList') {
                        clean();
                      }
                    }
                  }).observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['bis_skin_checked'],
                    subtree: true,
                    childList: true
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans"
      >
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              className: "font-sans text-sm",
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
