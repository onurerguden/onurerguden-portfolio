import { notFound } from "next/navigation";
export default async function Home({ params }: { params: Promise<{locale:string}> }) {
 const {locale} = await params;
 if (locale !== "en" && locale !== "tr") notFound();
 return <main><h1>Onur Ergüden</h1><p>{locale === "tr" ? "AI mühendisi. Uygulamalı makine öğrenmesi ve araştırma." : "AI engineer. Applied machine learning and research."}</p></main>;
}
