import { notFound } from "next/navigation";
import DeskReview from "@/components/desk/review";
import { isLocale, sharedFacts } from "@/lib/content";
import { getServices } from "@/lib/home-content";
import { getIdentity } from "@/lib/identity";

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
  // The lab layout keeps this page off the public site (labBlocked).
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  // What the desk's screens show on the home page, as plain lines.
  const screenCopy = [
    [
      en ? "What I do" : "Ne yapıyorum",
      ...getServices(locale).map((service) => service.title),
    ],
    [sharedFacts.name, getIdentity(locale).role],
    [en ? "My tech stack" : "Teknolojilerim", "my_tech_stack.exe"],
  ];
  return <DeskReview locale={locale} screenCopy={screenCopy} />;
}
