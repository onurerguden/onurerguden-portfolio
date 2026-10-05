// Converts the Kuyumcum team's AI report workflow chart (approved for
// publication on 5 October 2026) to lossless WebP. The chart is flat colour
// and text, so lossless is both exact and smaller than lossy at q80.
// node scripts/kuyumcum/workflow-chart.mjs <kuyumcum_ai_workflow_chart.png>
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/kuyumcum/workflow-chart.mjs <chart.png>");
  process.exit(1);
}
const out = "public/images/kuyumcum/report-workflow.webp";
// sharp drops metadata unless asked to keep it.
const info = await sharp(source)
  .removeAlpha()
  .webp({ lossless: true, effort: 6 })
  .toFile(out);
console.log(`${out}: ${info.width}×${info.height}, ${info.size} bytes`);
