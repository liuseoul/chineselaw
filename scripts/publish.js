#!/usr/bin/env node
/**
 * scripts/publish.js
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE:
 *   node scripts/publish.js          (or: npm run publish)
 *
 * HOW TO PUBLISH AN ARTICLE:
 *   1. Translate your article into the languages you want.
 *   2. Save each version as a text file in articles-src/ using this naming:
 *
 *        YYYYMMDD-en.txt   (English  — required for new articles)
 *        YYYYMMDD-kr.txt   (Korean)
 *        YYYYMMDD-jp.txt   (Japanese)
 *        YYYYMMDD-fr.txt   (French)
 *        YYYYMMDD-ru.txt   (Russian)
 *        YYYYMMDD-es.txt   (Spanish)
 *
 *      Example: 20260315-en.txt, 20260315-kr.txt, 20260315-fr.txt
 *
 *   3. File format (same for all languages):
 *        Line 1:   Article title
 *        Line 2+:  Article body (blank line = paragraph break)
 *
 *   4. You don't need all 6 languages at once.
 *      Missing languages fall back to the English article link.
 *      To add more languages to an existing article later, just drop the new
 *      YYYYMMDD-lang.txt file(s) in articles-src/ and re-run.
 *
 *   5. Run: node scripts/publish.js
 *
 *   6. Commit and push:
 *        git add .
 *        git commit -m "Publish article YYYYMMDD"
 *        git push
 *      Cloudflare Pages auto-deploys in ~1 minute.
 */

"use strict";
const fs   = require("fs");
const path = require("path");
const vm   = require("vm");

const ROOT      = path.join(__dirname, "..");
const SRC_DIR   = path.join(ROOT, "articles-src");
const DATA_FILE = path.join(ROOT, "articles-data.js");

// File suffix (user-facing) → internal language code used in dirs + data
const FILE_LANG = { en:"en", kr:"ko", jp:"ja", fr:"fr", ru:"ru", es:"es" };

const LANG_TAGS = { en:"EN", ko:"KR", ja:"JP", fr:"FR", ru:"RU", es:"ES" };
const HOME_LABEL = {
  en:"Home", ko:"홈", ja:"ホーム", fr:"Accueil", ru:"Главная", es:"Inicio",
};
const DISCLAIMER = {
  en: "Disclaimer: The materials on this website are provided for general informational purposes only and do not constitute legal advice. Viewing this website or contacting us does not create a lawyer-client relationship.",
  ko: "면책 고지: 이 웹사이트의 자료는 일반 정보 제공 목적으로만 제공되며 법률 자문을 구성하지 않습니다.",
  ja: "免責事項：本ウェブサイトの資料は一般的な情報提供のみを目的としており、法的アドバイスを構成するものではありません。",
  fr: "Avertissement\u00a0: Les documents figurant sur ce site sont fournis à titre d\u2019information générale uniquement et ne constituent pas un avis juridique.",
  ru: "Отказ от ответственности: Материалы на этом сайте предоставляются исключительно в информационных целях и не являются юридической консультацией.",
  es: "Aviso legal: Los materiales de este sitio se proporcionan únicamente con fines informativos generales y no constituyen asesoramiento jurídico.",
};
const SITE_TITLE = {
  en: "China Legal Practice Knowledge Base",
  ko: "중국 법률 실무 지식 베이스",
  ja: "中国法律実務ナレッジベース",
  fr: "Base de connaissances en droit chinois",
  ru: "База знаний по китайскому праву",
  es: "Base de conocimientos jurídicos sobre China",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** YYYYMMDD → YYYY-MM-DD */
function isoDate(yyyymmdd) {
  return `${yyyymmdd.slice(0,4)}-${yyyymmdd.slice(4,6)}-${yyyymmdd.slice(6,8)}`;
}

/** Parse a text file → { title, bodyHtml } */
function parseTxt(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const title = lines[0].replace(/^#+\s*/, "").trim();
  const body  = lines.slice(1).join("\n").trim();
  const bodyHtml = body
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map(p => `<p>${p}</p>`)
    .join("\n    ");
  return { title, bodyHtml };
}

/** Load ARTICLES_DATA from articles-data.js (handles unquoted JS keys) */
function loadArticlesData() {
  const src = fs.readFileSync(DATA_FILE, "utf8");
  const match = src.match(/var ARTICLES_DATA\s*=\s*(\[[\s\S]*\]);/);
  if (!match) throw new Error("Cannot find ARTICLES_DATA in articles-data.js");
  const ctx = vm.createContext({});
  vm.runInContext("result = " + match[1], ctx);
  return ctx.result;
}

/** Write updated ARTICLES_DATA back to articles-data.js */
function saveArticlesData(articles) {
  const src = fs.readFileSync(DATA_FILE, "utf8");
  const updated = src.replace(
    /var ARTICLES_DATA\s*=\s*\[[\s\S]*\];/,
    "var ARTICLES_DATA = " + JSON.stringify(articles, null, 2) + ";"
  );
  fs.writeFileSync(DATA_FILE, updated, "utf8");
}

/**
 * Generate one article HTML page.
 *
 * The language switcher is DYNAMIC — it loads articles-data.js at runtime,
 * so adding a new language later automatically updates all switchers without
 * regenerating old HTML files.
 *
 * lang:     internal code  ("en", "ko", "ja", "fr", "ru", "es")
 * dataPath: relative path from this HTML file to articles-data.js
 */
function makeArticleHtml(lang, slug, title, bodyHtml, date, dataPath) {
  const isEn    = lang === "en";
  const homeHref = isEn ? "/index.html" : `/${lang}/index.html`;

  return `<!doctype html>
<html lang="${lang === "ko" ? "ko" : lang === "ja" ? "ja" : lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | ${SITE_TITLE[lang]}</title>
  <style>
    body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.7;color:#1f2937;background:#f9fafb;}
    .container{max-width:860px;margin:0 auto;padding:24px 16px 56px;}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 28px 32px;}
    h1{font-size:1.7rem;margin:0 0 12px 0;line-height:1.3;}
    .pubmeta{font-size:0.9rem;color:#6b7280;margin-bottom:20px;}
    .article-body p{margin:0 0 1.1em 0;}
    .backlink{display:inline-block;margin-bottom:14px;color:#374151;text-decoration:none;font-size:0.95rem;}
    .backlink:hover{text-decoration:underline;}
    .small{font-size:0.9rem;color:#6b7280;margin-top:20px;}
    .langbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
    .langbar span{font-size:0.8rem;color:#9ca3af;margin-right:2px;}
    .langtag{display:inline-block;padding:3px 9px;border-radius:5px;font-size:0.82rem;font-weight:700;
             text-decoration:none;border:1px solid #d1d5db;color:#374151;background:#fff;letter-spacing:.04em;}
    .langtag:hover{background:#f3f4f6;border-color:#9ca3af;}
    .langtag.current{background:#111827;color:#fff;border-color:#111827;cursor:default;}
    @media(min-width:760px){.container{padding:32px 24px 64px;}h1{font-size:2rem;}}
  </style>
</head>
<body>
  <div class="container">
    <nav class="langbar" id="langbar" aria-label="Language">
      <span>Language:</span>
      <!-- filled dynamically by JS below -->
    </nav>
    <a class="backlink" href="${homeHref}">&larr; ${HOME_LABEL[lang]}</a>
    <article class="card">
      <h1>${title}</h1>
      <div class="pubmeta">${date}</div>
      <div class="article-body">
    ${bodyHtml}
      </div>
    </article>
    <p class="small">${DISCLAIMER[lang]}</p>
  </div>
  <script src="${dataPath}"></script>
  <script>
    (function(){
      var SLUG="${slug}";
      var LANG="${lang}";
      var TAGS={en:"EN",ko:"KR",ja:"JP",fr:"FR",ru:"RU",es:"ES"};
      var entry=ARTICLES_DATA.find(function(a){return a.slug===SLUG;});
      if(!entry) return;
      var bar=document.getElementById("langbar");
      var links=["en","ko","ja","fr","ru","es"].map(function(l){
        if(l!=="en"&&!(entry[l]&&entry[l].title)) return "";
        var href=l==="en"?"/articles/"+SLUG+".html":"/"+l+"/articles/"+SLUG+".html";
        var cls=l===LANG?" current":"";
        return "<a class=\"langtag"+cls+"\" href=\""+href+"\">"+TAGS[l]+"</a>";
      }).join("");
      bar.innerHTML="<span>Language:<\\/span>"+links;
    })();
  </script>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  // ── Step 1: Scan articles-src/ and group by date ────────────────────────
  const PATTERN = /^(\d{8})-(en|kr|jp|fr|ru|es)\.txt$/i;
  const allFiles = fs.readdirSync(SRC_DIR).filter(f => f.endsWith(".txt"));

  /** groups: { "20260311": { en: "/abs/path", kr: "/abs/path", ... } } */
  const groups = {};
  for (const f of allFiles) {
    const m = f.match(PATTERN);
    if (!m) { console.log(`  (skipping unrecognized file: ${f})`); continue; }
    const [, yyyymmdd, fileLang] = m;
    if (!groups[yyyymmdd]) groups[yyyymmdd] = {};
    groups[yyyymmdd][fileLang.toLowerCase()] = path.join(SRC_DIR, f);
  }

  if (Object.keys(groups).length === 0) {
    console.log("No article files found in articles-src/.");
    console.log("Expected filenames like: 20260315-en.txt, 20260315-kr.txt, ...");
    return;
  }

  // ── Step 2: Load current articles-data.js ──────────────────────────────
  const articles = loadArticlesData();

  // Index by date for quick lookup
  const byDate = {};
  for (const a of articles) byDate[a.date] = a;

  let anyChanges = false;

  // ── Step 3: Process each date group (oldest first) ─────────────────────
  for (const yyyymmdd of Object.keys(groups).sort()) {
    const files   = groups[yyyymmdd];
    const date    = isoDate(yyyymmdd);
    const isNew   = !byDate[date];

    console.log(`\n── ${date} ── files: ${Object.keys(files).map(l=>`${l}.txt`).join(", ")}`);

    // New article requires English
    if (isNew && !files.en) {
      console.warn(`  ✗ Skipped — new article needs ${yyyymmdd}-en.txt to set the title and slug.`);
      continue;
    }

    // Build / get the data entry
    let entry;
    if (isNew) {
      const { title } = parseTxt(files.en);
      const slug = slugify(title);
      entry = { date, slug, en:{ title }, ko:null, ja:null, fr:null, ru:null, es:null };
      console.log(`  New article  : "${title}"`);
      console.log(`  Slug         : ${slug}`);
    } else {
      entry = byDate[date];
      console.log(`  Existing     : "${entry.en.title}" (slug: ${entry.slug})`);
    }

    const slug = entry.slug;

    // ── Step 4: For each supplied language file, generate HTML ─────────
    for (const [fileLang, filePath] of Object.entries(files)) {
      const lang = FILE_LANG[fileLang];           // e.g. "kr" → "ko"
      const { title, bodyHtml } = parseTxt(filePath);

      // Update the data entry
      entry[lang] = { title };

      // Paths
      const isEnglish = lang === "en";
      const articleDir  = isEnglish
        ? path.join(ROOT, "articles")
        : path.join(ROOT, lang, "articles");
      const dataPath    = isEnglish ? "../articles-data.js" : "../../articles-data.js";

      fs.mkdirSync(articleDir, { recursive: true });
      fs.writeFileSync(
        path.join(articleDir, `${slug}.html`),
        makeArticleHtml(lang, slug, title, bodyHtml, date, dataPath),
        "utf8"
      );
      const display = isEnglish ? `articles/${slug}.html` : `${lang}/articles/${slug}.html`;
      console.log(`  ✓ ${display}`);
    }

    // Add new entry to front of array
    if (isNew) {
      articles.unshift(entry);
      byDate[date] = entry;
    }

    anyChanges = true;
  }

  // ── Step 5: Save and report ───────────────────────────────────────────
  if (anyChanges) {
    saveArticlesData(articles);
    console.log("\n  ✓ articles-data.js updated");
    console.log("\n✅  Done! Next steps:");
    console.log("      git add .");
    console.log('      git commit -m "Publish article"');
    console.log("      git push");
    console.log("      (Cloudflare Pages auto-deploys in ~1 minute)");
  } else {
    console.log("\nNothing changed.");
  }
}

main();
