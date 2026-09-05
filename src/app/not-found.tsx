import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found / Sayfa bulunamadı</h1>
      <Link href="/en">English homepage</Link>
      <Link href="/tr">Türkçe ana sayfa</Link>
    </main>
  );
}
