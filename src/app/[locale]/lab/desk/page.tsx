import { notFound } from "next/navigation";
import DeskReview from "@/components/desk/review";
import { isLocale } from "@/lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title: locale === "tr" ? "Masa modeli incelemesi" : "Desk model study",
    robots: { index: false, follow: false },
  };
}

export default async function DeskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || process.env.VERCEL_ENV === "production") notFound();
  return <DeskReview locale={locale} />;
}
