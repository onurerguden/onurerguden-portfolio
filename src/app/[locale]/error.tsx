"use client";
import { useParams } from "next/navigation";
import ErrorView from "@/components/site/error-view";

/** A page that failed to render; the language's nav and footer stay. */
export default function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  return (
    <ErrorView
      error={error}
      retry={retry}
      locale={locale === "tr" ? "tr" : "en"}
    />
  );
}
