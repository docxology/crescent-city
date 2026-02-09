/** Centralized path resolution for output files */
import { OUTPUT_DIR, ARTICLES_DIR } from "../constants.js";

export const paths = {
  output: OUTPUT_DIR,
  articles: ARTICLES_DIR,
  toc: `${OUTPUT_DIR}/toc.json`,
  manifest: `${OUTPUT_DIR}/manifest.json`,
  verificationReport: `${OUTPUT_DIR}/verification-report.json`,
  consolidatedJson: `${OUTPUT_DIR}/crescent-city-code.json`,
  plainText: `${OUTPUT_DIR}/crescent-city-code.txt`,
  sectionIndex: `${OUTPUT_DIR}/section-index.csv`,
  markdown: `${OUTPUT_DIR}/markdown`,
  article: (guid: string) => `${ARTICLES_DIR}/${guid}.json`,
};
