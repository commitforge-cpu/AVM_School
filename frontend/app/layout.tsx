import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Backdrop from "@/components/three/Backdrop";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getContent("site");
  return {
    title: { default: `${site.schoolName} (${site.shortName}) | Rajajinagar, Bengaluru`, template: `%s | ${site.shortName}` },
    description: `${site.schoolName}: ${site.descriptor.toLowerCase()} in Rajajinagar, Bengaluru, following the ${site.board}. Admissions, school life, gallery and more.`,
    icons: { icon: site.logoUrl },
  };
}

export const viewport: Viewport = { themeColor: "#0d1230" };

// Runs before first paint so the first-visit intro never flashes.
const introScript = `try{if(location.pathname==='/'&&sessionStorage.getItem('avm_intro_seen')!=='1'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('intro-play')}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getContent("site");
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Baloo+Tamma+2:wght@500;600;700;800&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <AuthProvider>
          <Backdrop />
          <div className="site">
            <Navbar site={site} />
            <main id="main">{children}</main>
            <Footer site={site} />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
