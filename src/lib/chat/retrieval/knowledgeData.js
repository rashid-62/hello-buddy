/**
 * Bundled knowledge base.
 *
 * The serverless runtime has no filesystem access to the repo, so every
 * knowledge file is imported statically and bundled at build time.
 */

import prophets from "../../../../knowledge/prophets.json";
import prophetMuhammad from "../../../../knowledge/prophet-muhammad.json";
import rashidun from "../../../../knowledge/rashidun.json";
import umayyads from "../../../../knowledge/umayyads.json";
import abbasids from "../../../../knowledge/abbasids.json";
import andalus from "../../../../knowledge/andalus.json";
import fatimids from "../../../../knowledge/fatimids.json";
import seljuks from "../../../../knowledge/seljuks.json";
import ayyubids from "../../../../knowledge/ayyubids.json";
import mamluks from "../../../../knowledge/mamluks.json";
import ottomans from "../../../../knowledge/ottomans.json";
import mughals from "../../../../knowledge/mughals.json";
import islamicScience from "../../../../knowledge/islamic-science.json";
import islamicCulture from "../../../../knowledge/islamic-culture.json";
import importantScholars from "../../../../knowledge/important-scholars.json";
import importantEvents from "../../../../knowledge/important-events.json";
import timeline from "../../../../knowledge/timeline.json";
import sources from "../../../../knowledge/sources.json";

export const KNOWLEDGE_FILES = {
  "prophets.json": prophets,
  "prophet-muhammad.json": prophetMuhammad,
  "rashidun.json": rashidun,
  "umayyads.json": umayyads,
  "abbasids.json": abbasids,
  "andalus.json": andalus,
  "fatimids.json": fatimids,
  "seljuks.json": seljuks,
  "ayyubids.json": ayyubids,
  "mamluks.json": mamluks,
  "ottomans.json": ottomans,
  "mughals.json": mughals,
  "islamic-science.json": islamicScience,
  "islamic-culture.json": islamicCulture,
  "important-scholars.json": importantScholars,
  "important-events.json": importantEvents,
  "timeline.json": timeline,
  "sources.json": sources,
};
