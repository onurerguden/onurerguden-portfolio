# Content review: desk story and dark system

Every new or changed sentence in this redesign, with its source. Nothing here adds a metric, a result or a claim that is not already in the sources listed. Onur approves each block (EN and TR) before the series is merged; until then the text stays on unmerged branches.

Sources: `docs/profile-drafts.md` (CV-aligned drafts), the project summaries and case studies in `src/content`, the previous experience descriptions and `sharedFacts` in `src/lib/content.ts`.

## Experience (PR 1)

Role titles move to sentence case in English, matching "AI engineer" in the opening. Contributions are noun phrases, so no action or ownership is implied beyond the source.

| Role                                                        | English                                                                                                                                                | Turkish                                                                                                                                                            | Source                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Future Is Now · AI engineer · Jul 2026 – present            | Full-stack, client-facing AI applications. · Agentic workflows with LangChain and LangGraph. · Qdrant-based retrieval architectures for RAG pipelines. | Full-stack, müşteriye yönelik AI uygulamaları. · LangChain ve LangGraph ile agentic iş akışları. · RAG pipeline’ları için Qdrant tabanlı bilgi getirme mimarileri. | Profile drafts ("client-facing AI applications, LangChain and LangGraph workflows, and Qdrant-based retrieval architectures"); previous description ("Full-stack AI products, agentic workflows and RAG pipelines") |
| Future Is Now · AI engineering intern · Apr – Jun 2026      | AI prototypes. · Retrieval-based application features.                                                                                                 | AI prototipleri. · Bilgi erişimi tabanlı uygulama özellikleri.                                                                                                     | Previous description                                                                                                                                                                                                |
| VBT Software · Software engineering intern · Aug – Sep 2025 | TaskFoo’s project, epic and task workflows. · Role-based access control with PostgreSQL persistence. · Docker packaging. Link: "See TaskFoo"           | TaskFoo’nun proje, epic ve görev akışları. · PostgreSQL ile rol tabanlı yetkilendirme. · Docker ile paketleme. Bağlantı: "TaskFoo’ya bak"                          | TaskFoo summary and stack                                                                                                                                                                                           |
| BMC Otomotiv · Software engineering intern · Jul – Aug 2025 | SAP ABAP applications. · Warehouse inventory workflows.                                                                                                | SAP ABAP uygulamaları. · Depo envanter iş akışları.                                                                                                                | Previous description                                                                                                                                                                                                |

Tools per role: Future Is Now AI engineer — Python, LangChain, LangGraph, Qdrant; VBT — Spring Boot, React, TypeScript, PostgreSQL, Docker; BMC — SAP ABAP. The internship at Future Is Now lists no tools because no source names them.

## Technology evidence (PR 1)

Each technology links to where it can be checked. New links beyond the existing project evidence:

- LangChain, LangGraph, Qdrant → Future Is Now (profile drafts).
- SAP ABAP → BMC Otomotiv (experience).
- Next.js, Three.js, Blender, Git, React, TypeScript → this site's public repository (`github.com/onurerguden/onurerguden-portfolio`).
- No evidence is shown for JavaScript, C++, NumPy, ChromaDB and Figma; none is invented.

## Case-study roles (PR 1)

Derived from each case study's "My contribution" section.

| Project                 | English                                       | Turkish                                      |
| ----------------------- | --------------------------------------------- | -------------------------------------------- |
| Kuyumcum                | Co-developer · AI features                    | Ortak geliştirici · AI özellikleri           |
| HealthFactor-AI         | Two-layer framework, data pipeline and models | İki katmanlı çerçeve, veri hattı ve modeller |
| Course Intelligence RAG | Retrieval and LLM orchestration architecture  | Bilgi getirme ve LLM orkestrasyon mimarisi   |

## Course Intelligence evaluation (PR 1)

The unconfirmed "100% accuracy on the quantitative set" sentence is removed (see `docs/release.md`). The section is renamed "Evaluation" / "Değerlendirme":

- EN: "I evaluated the assistant on a quantitative question set and with trap questions that check unsupported answers, using retrieval filtering and strict system prompting." The limitation paragraph now speaks of "these checks".
- TR: "Asistanı nicel bir soru kümesiyle ve desteklenmeyen yanıtları yakalamaya yönelik tuzak sorularla değerlendirdim; bilgi getirme filtreleri ve sıkı sistem yönergeleri bu kontrollerin parçasıydı."

Optional, only with Onur's approval: the repository's own rating of the quantitative set (5 excellent, 4 good, 1 poor), cited to `evaluation_results_enhanced.json`.

## Site chrome (PR 1)

- Footer colophon — EN: "Built with Next.js, React Three Fiber and Blender. Source code ↗" · TR: "Next.js, React Three Fiber ve Blender ile geliştirildi. Kaynak kod ↗"
- 404 — EN: "This page isn’t here." · TR: "Bu sayfa burada değil."
