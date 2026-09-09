import Link from "next/link";
import { notFound } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navigation from "@/components/navigation";
import { isLocale } from "@/lib/content";
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}) {
 const {locale} = await params; if(!isLocale(locale)) notFound();
 return <><a className="skip-link" href="#main">{locale === "en" ? "Skip to content" : "İçeriğe geç"}</a><div className="site-shell"><Navigation locale={locale}/>{children}<footer className="site-footer"><Link className="footer-name" href={`/${locale}`}>Onur Ergüden</Link><p>{locale === "en" ? "Built with care. Always learning." : "Özenle geliştirildi. Öğrenmeye devam."}</p><a href="https://github.com/onurerguden">GitHub</a><a href="https://www.linkedin.com/in/onurerguden/">LinkedIn</a><a href="mailto:onurerguden5@gmail.com">{locale === "en" ? "Email" : "E-posta"}</a></footer></div>{process.env.VERCEL ? <SpeedInsights/> : null}</>;
}
