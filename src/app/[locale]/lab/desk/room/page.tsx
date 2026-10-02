import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { getJourneyContent } from "@/lib/desk-story/content";
import ServiceRows from "@/components/sections/service-rows";
import ExperienceRail from "@/components/sections/experience-rail";
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
      <RoomPosterPreview
        locale={locale}
        content={getJourneyContent(locale)}
        monitor={{
          services: <ServiceRows locale={locale} />,
          experience: <ExperienceRail locale={locale} />,
        }}
      />
    </main>
  );
}
