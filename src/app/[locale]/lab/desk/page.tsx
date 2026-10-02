import { notFound } from "next/navigation";
import DeskReview from "@/components/desk/review";
import { isLocale, sharedFacts } from "@/lib/content";
import { getServices } from "@/lib/home-content";

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
  const en = locale === "en";
  // What the desk's screens show on the home page, as plain lines.
  const screenCopy = [
    [
      en ? "What I do" : "Ne yapıyorum",
      ...getServices(locale).map((service) => service.title),
    ],
    [sharedFacts.name, en ? "AI engineer" : "AI mühendisi"],
    [en ? "My tech stack" : "Teknolojilerim", "my_tech_stack.exe"],
  ];
  return <DeskReview locale={locale} screenCopy={screenCopy} />;
}
