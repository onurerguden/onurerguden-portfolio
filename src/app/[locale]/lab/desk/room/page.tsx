import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { getJourneyContent } from "@/lib/desk-journey-content";
import RoomPosterPreview from "@/components/desk/room-poster-preview";
export const metadata = {
  title: "Room poster review",
  robots: { index: false, follow: false },
};
export default async function RoomPosterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || process.env.VERCEL_ENV === "production") notFound();
  return (
    <main id="main">
      <RoomPosterPreview locale={locale} content={getJourneyContent(locale)} />
    </main>
  );
}
