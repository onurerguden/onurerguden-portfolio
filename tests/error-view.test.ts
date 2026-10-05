import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ErrorView from "@/components/site/error-view";

const error = Object.assign(new Error("secret detail from the server"), {
  digest: "1234567890",
});
const render = (locale?: "en" | "tr") =>
  renderToStaticMarkup(
    createElement(ErrorView, { error, retry: () => {}, locale }),
  );

describe("error view", () => {
  it("speaks the page's language when it is known", () => {
    const tr = render("tr");
    expect(tr).toContain("Bu sayfa yüklenirken");
    expect(tr).toContain("Tekrar dene");
    expect(tr).toContain('href="/tr"');
    expect(tr).not.toContain("Something went wrong");
    expect(tr).not.toContain('href="/en"');
  });

  it("speaks both languages, each marked, when the root layout failed", () => {
    const both = render();
    expect(both).toContain("Something went wrong");
    expect(both).toMatch(/<p lang="tr">Bu sayfa/);
    expect(both).toContain('href="/en"');
    expect(both).toContain('href="/tr"');
  });

  it("shows the digest for the logs but never the message", () => {
    const en = render("en");
    expect(en).toContain("1234567890");
    expect(en).not.toContain("secret detail");
  });
});
