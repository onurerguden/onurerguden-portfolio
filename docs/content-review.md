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

## Home flow (PR 4)

- Opening `h1`: "Onur Ergüden, AI engineer" / "Onur Ergüden, AI mühendisi" (the role is visually hidden; the name is the existing artwork).
- Removed: the "Intelligence, put to work." / "Fikirden çalışan zekâya." introduction and the "AI & research" cards before About.
- Skip link: "Skip the desk tour" / "Masa turunu geç" → About.
- About facts — Degree / Lisans: BSc Software Engineering · İzmir University of Economics · June 2026 · GPA 3.30 / 4.00; Academy / Akademi: Google AI & Technology Academy · Deep Learning · 2026; Publication / Yayın: IJEA · Accepted · publication pending. Source: `sharedFacts`.
- About actions: "Contact me" / "Bana ulaş", the existing CV link, "My research" / "Araştırmalarım" (now to `#research`).
- Research teaser: the approach paragraph, publication summary and three questions are the Research page's own text, now shared from `src/lib/research.ts`. Links: "HealthFactor-AI case study" / "HealthFactor-AI vaka çalışması", "Research details" / "Araştırma ayrıntıları". Authors are listed as published; "O. Ergüden" is emphasised, with no "first author" wording.
- Course Intelligence diagram: steps named in the case study (course documents, hierarchical chunks, SBERT embeddings, FAISS search, filters + context, Llama 3.1 (8B), grounded answer), captioned "Conceptual diagram" / "Kavramsal diyagram".

## Pages (PR 5)

Interface labels only; no new claims.

- Archive: "All projects" / "Tüm projeler"; card action "Read the case study" / "Vaka çalışmasını oku". The intro and GitHub copy are unchanged.
- Case studies: "Projects" / "Projeler" (back), "My role" / "Rolüm", "Built with" / "Kullandıklarım", "Source" / "Kaynak", "On this page" / "Bu sayfada", "Other projects" / "Diğer projeler", "More in the archive" / "Arşivde daha fazlası". Figure captions are the existing alt texts.
- Research: "Research" / "Araştırma" title. The approach, publication, questions and "Academic interests" sentence are the page's existing text; the academic foundation reuses the About facts.
- Share cards: the home card shows the opening's name, head illustration and role; project cards show the title, category, real media (Course Intelligence: its pipeline steps) and my name; the Research card shows the paper title and its status.

## Selected certificates (October 4)

Onur supplied the documents and requested a focused selection. Five entries now have matching EN/TR titles, descriptions and alt text: academy deep learning completion, Google project management professional certificate, openHPI efficient AI achievement (80%), openHPI energy-efficient software achievement (78.3%) and openHPI practical computer vision participation. The participation status is visible on the card; it is not described as an assessed achievement. No unverified training hours, professional accreditation or degree credit is claimed.

Dates, issuers, results and topics come from the supplied documents. The three supplied public verification links were checked against Onur's name. Source filenames, date differences between openHPI PDFs and verification pages, selection rationale and public-data review are recorded in `docs/qa/selected-certificates/README.md`.
