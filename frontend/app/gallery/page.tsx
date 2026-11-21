import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import GalleryView from "@/components/GalleryView";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryPage() {
  return (
    <>
      <PageHead title="Gallery" intro="Photos from school days, sports, celebrations and prize days." />
      <div className="panel">
        <section className="section">
          <div className="wrap"><GalleryView /></div>
        </section>
      </div>
    </>
  );
}
