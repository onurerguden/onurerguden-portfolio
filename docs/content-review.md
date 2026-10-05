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

Onur supplied the documents and requested a focused selection. Six entries now have matching EN/TR titles, descriptions and alt text: academy deep learning completion, Google project management professional certificate, openHPI efficient AI achievement (80%), openHPI energy-efficient software achievement (78.3%), openHPI practical computer vision participation and academy basic entrepreneurship completion (21 February 2026), which Onur explicitly requested. The participation status is visible on the card; it is not described as an assessed achievement. No unverified training hours, professional accreditation or degree credit is claimed.

Dates, issuers, results and topics come from the supplied documents. The three supplied public verification links were checked against Onur's name. Source filenames, date differences between openHPI PDFs and verification pages, selection rationale and public-data review are recorded in `docs/qa/selected-certificates/README.md`.

## Final polish: corrected facts (PR 02, October 4)

Corrections only. Each sentence below replaces one that the sources no longer support; nothing adds a result. **Awaiting Onur's approval.**

Sources: the IJEA revision package in the public `izsu_ai_project` repository (`paper_revision_deliverables/00_README.md`, dated 6 August 2026; `05_model_outputs/*/…split_summary.csv`, `…model_metrics.csv`; `06_tables`), the repositories `IEU-Chat-Bot` (`gui_app.py`, `rag/rag_app.py`), `IZMIR-PUBLIC-TRANSPORTATION-ML` (`data/current-data/izmirim-kart-ulasim-istatistikleri-guncel.csv`, 25,775 rows; three contributors), `SE311_PAM` (four contributors), `TaskFoo` (no Docker files) and the Kuyumcum repositories (YOLO11n exported to TFLite, run with `flutter_vision`).

| Topic | Before | After (EN) | After (TR) |
| --- | --- | --- | --- |
| Water safety data | "more than 30,000 water-quality records" | 26,469 single-parameter measurements from 76 sampling points in 11 districts, combined into 1,557 date-and-location observations (August 2025 – July 2026) | 11 ilçedeki 76 örnekleme noktasından 26.469 tekil parametre ölçümü; Ağustos 2025 – Temmuz 2026 arasında 1.557 tarih ve konum gözlemi |
| Water safety models | "an SVM classifier and an Extra Trees forecasting model" | reactive classifiers (SVM, Random Forest, Decision Tree, KNN) and proactive trend models; Random Forest selected on the validation split | anlık sınıflandırıcılar (SVM, Random Forest, Decision Tree, KNN) ve eğilim modelleri; doğrulama kümesinde Random Forest seçildi |
| Water safety results | 96.3% toxic-water recall, 80% forecast accuracy, 3,000+ scenarios | No headline score. Chronological splits and a leakage audit per run; every Risk test example is synthetic, so the scores show separation of generated patterns, not detection of real contamination | Başlık skoru yok. Kronolojik ayrım ve her çalıştırmada sızıntı denetimi; bütün Risk test örnekleri sentetik |
| Water safety contribution | — | "For the journal revision I wrote the synthetic-data, paper-versus-code and figure audits." (reports B, I and K in the package are by Onur) | "Dergi revizyonu için sentetik veri, makale-kod karşılaştırması ve şekil denetimlerini yazdım." |
| Water safety home card | "96.3%" — toxic-water recall | "26,469" — water-quality measurements from 76 sampling points, August 2025 – July 2026 | "26.469" — 76 örnekleme noktasından su kalitesi ölçümü, Ağustos 2025 – Temmuz 2026 |
| Water safety stack | Python, SVM, Extra Trees, Feature engineering | Python, scikit-learn, SVM, Random Forest, Feature engineering | same |
| Course Intelligence | "An asynchronous PyQt6 interface streams the generated response" | "A PyQt6 desktop interface runs retrieval and generation on a background thread, so the window stays responsive while the local model, served through Ollama, writes its answer." | "PyQt6 masaüstü arayüzü bilgi getirme ve yanıt üretimini arka planda çalıştırıyor; Ollama üzerinden çalışan yerel model yanıtını yazarken pencere tepki vermeye devam ediyor." |
| Kuyumcum stack | …Python, TensorFlow, Gemini | …Python, YOLO11n, TensorFlow Lite, Gemini | same |
| TaskFoo | "…PostgreSQL persistence and Docker packaging…"; stack lists Docker | "…role-based controls and PostgreSQL persistence…"; Docker removed from the project. The VBT Software role keeps "Docker packaging" (Onur used it during the internship, 4 October). Docker's evidence link now points to that role. | "…rol tabanlı yetkilendirme ve PostgreSQL ile…" |
| Urban mobility | "I explored 27,000+ smart-card records…"; MAPE 5.77% | "A three-person course project (CE 477): we explored 25,775 daily İzmirim Kart ridership rows, by operator and fare type, from January 2021 to April 2025 with clustering, seasonal features and demand forecasting." The MAPE appears only in plot images and is removed. | "Üç kişilik bir ders projesi (CE 477): Ocak 2021 – Nisan 2025 arasındaki 25.775 günlük İzmirim Kart yolcu kaydını…" |
| PAM | "I built a Java authentication interface…" | "A four-person course project: a Java authentication interface for Local, LDAP and Kerberos providers, kept extensible with adapter and factory patterns." Onur's own share is not stated until he confirms it. | "Dört kişilik bir ders projesi: …" |
| Technology list | "TensorFlow" (evidence: Kuyumcum) | "TensorFlow Lite" (the runtime Kuyumcum ships) | same |
| Certificates | Academy issuer in Turkish on the English page; manual order | "Google AI & Technology Academy" on the English page (the name used in the About facts); the Turkish page keeps "Yapay Zeka ve Teknoloji Akademisi". Newest first. | unchanged |
| Turkish home title | "AI engineering & research" | — | "AI mühendisliği ve araştırma" |
| Archive descriptions | GitHub descriptions shown as written | `PistiTheGame`'s description (it contains a student number) is hidden on this site, as is any description with an eight-digit or longer number. GitHub itself is unchanged. | same |

Unchanged on purpose: "Accepted · publication pending" and the author list, including "B. Ceylani" (Onur confirmed, 4 October).

## Final polish: AI work (PR 07, October 4)

New and changed copy for the AI work Onur asked to bring forward (MCP, Kuyumcum's image model and report agents, LangGraph, LLM APIs) and for the second research item. **Awaiting Onur's approval**, EN and TR.

| Block | English | Source |
| --- | --- | --- |
| GymRap AI Coach (new case study, `gymrap-ai-coach.mdx`) | Five sections: the problem; architecture (Kotlin bridge reading 23 Health Connect record types, Cloudflare Worker with D1, KV and Cron, a readiness score against 30-day baselines, double progression, 13 MCP tools behind OAuth 2.1 with PKCE, Gmail delivery); where the LLM sits (no LLM API calls; ChatGPT reads a structured brief over MCP and writes the coaching, schema-validated); reliability (report ledger, no automatic resend of an uncertain send, 10-minute cron fallback, the ChatGPT safety-layer block in six scheduled runs over three days and the redesign); 137 backend tests at commit 8f35eba; limitations (single user, not a medical measure, synthetic screenshots). Role: "Design and implementation, end to end". | Public `onurerguden/GymRap-AI-Coach` README and repository at 8f35eba (MIT, 3 October 2026). |
| GymRap media | The repository's three screenshots (daily email, post-workout email, heart-rate zones and weekly volume), all rendered from synthetic data, encoded losslessly; a conceptual flow diagram (Health Connect → Kotlin bridge → Worker + D1 → analysis engine → MCP server → ChatGPT → Gmail). | `assets/screenshots/*.png` in the repository; README architecture diagram. |
| Kuyumcum | "My contribution" names the two AI layers instead of "Python, TensorFlow and Gemini". New sections: **On-device recognition** (YOLO11n trained in Python on ten classes, exported to TensorFlow Lite, run with flutter_vision) and **Multi-agent reports** (Firebase Cloud Functions with Gemini; bull, bear, macro and risk analysts plus a synthesizer; BM25 + dense retrieval with re-ranking; a macro retrieval layer). No metric is shown; the private validation scores stay private. The workflow chart is **not** included until the team approves it. | Private Kuyumcum repositories (app, Cloud Functions, GoldAugmentation model repo). |
| CarbonPilot AI (archive) | "A five-person Google AI & Technology Academy graduation project: carbon accounting for CBAM exporters with deterministic emission calculations and a guarded LangGraph agent. My part: the agent graph with loop, timeout and fallback guards, Gemini extraction, LangSmith tracing and the PDF/JSON reports." | Public `fatmanurdurmus/YZTA-BOOTCAMP-GRUP-9` README (team table, sprint reviews) and Onur's commits there. **Onur confirms his part.** |
| VoiceOps (archive) | "A Google hackathon project: a Turkish voice assistant for warehouse staff that turns speech into Gemini function calls over stock data. My part was the application scaffold." | Public `fkaanc/voiceops_hackathon_google` README; Onur's two commits. |
| Research: independent study | "Independent study · not submitted for peer review" — "Clustering and forecasting public transport ridership in İzmir"; three-person CE 477 course project; 25,775 daily İzmirim Kart rows by operator and fare type (January 2021 – April 2025); DBSCAN clustering, seasonal features, XGBoost and Random Forest forecasting. No venue, author list or metric. | `IZMIR-PUBLIC-TRANSPORTATION-ML` data and code (see PR 02). |
| What I do · agents | "Tool-calling agents" — "Agents that call real tools through LangGraph and MCP: guarded loops, schemas on every write and a person in the loop where it matters." Link: "See GymRap AI Coach". | GymRap (MCP, schema validation, owner-in-the-loop resend); CarbonPilot (guarded LangGraph loops). |
| Experience · Future Is Now | Highlights become: "Full-stack, client-facing AI applications served with FastAPI." · "Agentic workflows with LangChain and LangGraph over the OpenAI, Anthropic and Gemini APIs." · Qdrant line unchanged. Tools add OpenAI, Anthropic, Gemini, FastAPI. | Onur's confirmation (4 October: OpenAI and Anthropic both used at work); private employer repositories list these dependencies. |
| About | Paragraph 1: "…I build LLM applications end to end: retrieval, tool-calling agents with LangGraph and MCP, and the product around them, mostly in Python, TypeScript and Java." Paragraph 2 drops the graduation and IJEA sentence, which the fact cards below already state. | Existing copy; the fact cards. |
| Technology list | Added with evidence: MCP (GymRap), FastAPI (CarbonPilot, VoiceOps), Cloudflare Workers (GymRap) as balls; OpenAI API and Anthropic API (Future Is Now role), LangSmith (CarbonPilot), Ollama (Course Intelligence), Ultralytics YOLO (Kuyumcum), Kotlin (GymRap) in the Explorer only. LangGraph, LangChain, Gemini, PostgreSQL and Docker gain CarbonPilot (and Gemini VoiceOps) as public evidence. 41 technologies, 30 balls. | As listed. |

Turkish counterparts are in the same files (`src/content/tr/*`, `src/lib/research.ts`) and say the same things; Turkish terms follow the existing copy (agentic iş akışları, bilgi getirme).

## Final polish: release (PR 10, October 4)

Interface labels and structured data; no new claims.

- Contact: the address opens mail (no external-link arrow); "Copy address" / "Adresi kopyala" copies it and says "Copied" / "Kopyalandı" ("Email address copied" / "E-posta adresi kopyalandı" for screen readers); "Request my CV" / "CV’mi iste" joins GitHub and LinkedIn.
- GitHub activity without live data: "Featured repositories" / "Öne çıkan depolar" — GymRap-AI-Coach ("MCP server and AI coach on Cloudflare"), CarbonPilot AI ("Guarded LangGraph agent (team project)"), IEU-Chat-Bot ("Course Intelligence RAG"), izsu_ai_project ("HealthFactor-AI water safety"), with Turkish counterparts.
- Latest updates show one item per repository before repeating one; this site's repository fills in only when fewer than three others are active.
- Structured data (Person) adds `knowsAbout`: large language models, retrieval-augmented generation, AI agents, Model Context Protocol, LangGraph, machine learning, computer vision — each shown in a case study.

## Review fixes (PR 11, October 5)

Onur approved the copy above on 5 October 2026. He then asked to look at his organizations' repositories for technologies the list is missing, without revealing their know-how. Only the names of technologies are added; their evidence is the Future Is Now role or the Kuyumcum case study, never a private repository's name, code or design. Sources: dependency manifests (`requirements.lock`, `pyproject.toml`, `package.json`, `pubspec.yaml`, `docker-compose.yml`) of the repositories he has commits in: Kuyumcum-App/Kuyumcum (83 of 154 commits), Kuyumcum-App/GoldAugmentation_Gold_Image_Detection (all), and three private Future Is Now repositories (615 of 616, 31 of 54 and 14 of 28 commits; their names stay out of this public repository). Two Future Is Now repositories without his commits are left out.

| Block | EN / TR | Source |
| --- | --- | --- |
| New technologies (Explorer only; the balls stay at 30) | Pydantic, pytest, MinIO (data and tools) and Vite, Tailwind CSS (web and mobile), evidence: Future Is Now. SQLite (data and tools) and Riverpod (web and mobile), evidence: Kuyumcum. 48 technologies. | FiN manifests (FastAPI services with Pydantic settings, pytest suites, MinIO object storage, React + Vite and Next.js + Tailwind front ends); Kuyumcum `pubspec.yaml` (`sqflite`, `flutter_riverpod`). |
| Evidence added to existing technologies | Future Is Now now also backs FastAPI, PostgreSQL, Docker, Gemini, LangSmith, React, Next.js and TypeScript; Kuyumcum backs JavaScript (its Cloud Functions). | Same manifests; Kuyumcum `functions/` is JavaScript. |
| Tech stack dialog | EN "Every ball is a tool from my own projects. Hover to name it, drag to move it." TR "Her top kendi projelerimde kullandığım bir araç. Üzerine gel, adını gör; sürükleyip taşı." (The arrows are no longer mentioned; they appear for keyboard focus only.) | Interface copy. |


## Icons, error pages and the Kuyumcum chart (PR 12, October 5)

The Kuyumcum team approved publishing their AI report workflow chart (Onur, 5 October 2026). The chart itself is published as supplied (English labels, converted losslessly). New copy, EN and TR; Onur approved all of it on 5 October 2026:

| Block | English | Turkish |
| --- | --- | --- |
| Chart alt text | "Flowchart of Kuyumcum's AI portfolio report: from the Flutter app through portfolio computation, evidence retrieval and four Gemini agents to the saved report. A step-by-step description follows." | "Kuyumcum'un AI portföy raporunun akış şeması (İngilizce): …" (says the chart is in English) |
| Chart caption | "The AI portfolio report workflow, simplified by the Kuyumcum team. It shows the order of the steps, not measured performance." + "Open the full-size chart" | "Kuyumcum ekibinin sadeleştirdiği AI portföy raporu akışı. Adımların sırasını gösteriyor; ölçülmüş bir performans sunmuyor." + "Şemayı tam boyutta aç" |
| Chart, step by step (disclosure) | Eight steps read off the chart: inventory with prices and five years of history; a callable Cloud Function checking authentication, quota and timeout; portfolio computation (return, volatility, drawdown; P10/P50/P90 bands for 30–90 days; allocation tables); evidence retrieval (recent news, historical news, macroeconomic sources); a context bundle; four Gemini Flash Lite agents in parallel (bull, bear, macro, risk manager); a synthesizer producing JSON, markdown and chart specifications; Firestore storage and the Flutter report screen. Internal function and collection names on the chart are not repeated in the text. | Same eight steps. |
| Error page | Title "Error"; "Something went wrong while loading this page. Try again, or go back to the homepage."; "Try again"; "Homepage"; "Reference: <digest>" | "Hata"; "Bu sayfa yüklenirken bir şeyler ters gitti. Tekrar dene ya da ana sayfaya dön."; "Tekrar dene"; "Ana sayfa"; "Hata kodu: <digest>" |
| Manifest | Name "Onur Ergüden — AI Engineer", short name "Onur Ergüden", the site's description. | (One manifest for both languages, as the root metadata.) |

Source for the chart text: the chart (`kuyumcum_ai_workflow_chart.png`, 1800 × 2800). No metric is added.
