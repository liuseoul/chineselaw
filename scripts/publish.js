#!/usr/bin/env node
/**
 * scripts/publish.js
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE (from project root):
 *   npm run publish
 *   node scripts/publish.js
 *
 * WHAT IT DOES:
 *   1. Scans articles-src/ for new .txt files not yet in articles-data.js
 *   2. For each new article:
 *      a. Parses title (first line) and body (rest)
 *      b. Calls Claude API to translate into KR / JP / FR / RU / ES
 *      c. Generates HTML article pages for all 6 languages
 *      d. Updates articles-data.js with the new entry (prepended = newest first)
 *   3. Prints a summary. Then you `git add . && git commit && git push`.
 *
 * ARTICLE TXT FORMAT (save in articles-src/):
 *   Filename:  YYYY-MM-DD-your-slug.txt    e.g. 2026-03-15-vto-checklist.txt
 *              (date from filename; slug = part after the date)
 *   Line 1:    Article title in English
 *   Line 2+:   Article body (plain paragraphs, blank line = new paragraph)
 *
 * REQUIREMENTS:
 *   npm install @anthropic-ai/sdk dotenv
 *   Create .env with:  ANTHROPIC_API_KEY=sk-ant-...
 */

"use strict";
const fs   = require("fs");
const path = require("path");

// ── Load env & SDK ────────────────────────────────────────────────────────────
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const Anthropic = require("@anthropic-ai/sdk");

const ROOT        = path.join(__dirname, "..");
const SRC_DIR     = path.join(ROOT, "articles-src");
const DATA_FILE   = path.join(ROOT, "articles-data.js");

const LANGS = ["ko", "ja", "fr", "ru", "es"];
const LANG_NAMES = {
  ko: "Korean", ja: "Japanese", fr: "French", ru: "Russian", es: "Spanish",
};
const LANG_TAGS = {
  en: "EN", ko: "KR", ja: "JP", fr: "FR", ru: "RU", es: "ES",
};
const LANG_LABELS = {
  en: "English", ko: "한국어", ja: "日本語", fr: "Français", ru: "Русский", es: "Español",
};
const DISCLAIMER = {
  en: "Disclaimer: The materials on this website are provided for general informational purposes only and do not constitute legal advice. Viewing this website or contacting us does not create a lawyer-client relationship.",
  ko: "면책 고지: 이 웹사이트의 자료는 일반 정보 제공 목적으로만 제공되며 법률 자문을 구성하지 않습니다.",
  ja: "免責事項：本ウェブサイトの資料は一般的な情報提供のみを目的としており、法的アドバイスを構成するものではありません。",
  fr: "Avertissement\u00a0: Les documents figurant sur ce site sont fournis à titre d\u2019information générale uniquement et ne constituent pas un avis juridique.",
  ru: "Отказ от ответственности: Материалы на этом сайте предоставляются исключительно в информационных целях и не являются юридической консультацией.",
  es: "Aviso legal: Los materiales de este sitio se proporcionan únicamente con fines informativos generales y no constituyen asesoramiento jurídico.",
};
const HOME_LABEL = {
  en: "Home", ko: "홈", ja: "ホーム", fr: "Accueil", ru: "Главная", es: "Inicio",
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

/** Parse a txt file → { date, slug, title, body } */
function parseTxt(file) {
  const basename = path.basename(file, ".txt");
  // Expect filename: YYYY-MM-DD-slug  OR just: slug
  const dateMatch = basename.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);
  const slugFromFile = dateMatch ? dateMatch[2] : slugify(basename);

  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const title = lines[0].replace(/^#+\s*/, "").trim();
  const body  = lines.slice(1).join("\n").trim();
  return { date, slug: slugFromFile, title, body };
}

/** Load the current ARTICLES_DATA array from articles-data.js.
 *  Uses Node's vm module so unquoted JS keys parse correctly. */
function loadArticlesData() {
  const src = fs.readFileSync(DATA_FILE, "utf8");
  // Greedy match — captures the FULL array up to the final ];
  const match = src.match(/var ARTICLES_DATA\s*=\s*(\[[\s\S]*\]);/);
  if (!match) throw new Error("Cannot find ARTICLES_DATA in articles-data.js");
  const vm = require("vm");
  const ctx = vm.createContext({});
  vm.runInContext("result = " + match[1], ctx);
  return ctx.result;
}

/** Rewrite articles-data.js with updated array (saves as valid JSON — fine for browsers). */
function saveArticlesData(articles) {
  const src = fs.readFileSync(DATA_FILE, "utf8");
  const serialised = JSON.stringify(articles, null, 2);
  // Greedy replace — replaces the FULL old array block
  const updated = src.replace(
    /var ARTICLES_DATA\s*=\s*\[[\s\S]*\];/,
    "var ARTICLES_DATA = " + serialised + ";"
  );
  fs.writeFileSync(DATA_FILE, updated, "utf8");
}

/** Ask Claude to translate the article into one language.
 *  Returns { title, bodyHtml } */
async function translate(client, lang, enTitle, enBody) {
  const langName = LANG_NAMES[lang];
  const prompt = `You are a professional legal translator specialising in Chinese law practice content.

Translate the following English law article into ${langName}.
Preserve all meaning precisely and use formal, professional register suitable for legal practitioners.

Return ONLY a JSON object (no markdown) with exactly these two fields:
{
  "title": "<translated title>",
  "bodyHtml": "<article body as HTML paragraphs — wrap each paragraph in <p>...</p>>"
}

ENGLISH TITLE:
${enTitle}

ENGLISH BODY:
${enBody}`;

  const msg = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = msg.content[0].text.trim();
  // Strip possible markdown code fences
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(jsonStr);
}

/** Convert plain-text body into HTML paragraphs */
function bodyToHtml(body) {
  return body
    .split(/\n{2,}/)
    .map(para => para.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map(para => `<p>${para}</p>`)
    .join("\n    ");
}

/** Generate one article HTML page */
function articleHtml(lang, slug, title, bodyHtml, date, allLangs) {
  const isEn = lang === "en";
  const homeHref = isEn ? "/index.html" : `/${lang}/index.html`;
  const htmlLang = lang === "ko" ? "ko" : lang === "ja" ? "ja" : lang === "fr" ? "fr" : lang === "ru" ? "ru" : lang === "es" ? "es" : "en";
  const siteTitle = isEn ? "China Legal Practice Knowledge Base" : {
    ko: "중국 법률 실무 지식 베이스",
    ja: "中国法律実務ナレッジベース",
    fr: "Base de connaissances en droit chinois",
    ru: "База знаний по китайскому праву",
    es: "Base de conocimientos jurídicos sobre China",
  }[lang];

  // Build language switcher links for this article
  const langLinks = ["en", "ko", "ja", "fr", "ru", "es"].map(l => {
    const href = l === "en"
      ? `/articles/${slug}.html`
      : `/${l}/articles/${slug}.html`;
    const hasTranslation = allLangs[l] && allLangs[l].title;
    if (!hasTranslation && l !== "en") return null;
    const cls = l === lang ? " current" : "";
    return `<a class="langtag${cls}" href="${href}">${LANG_TAGS[l]}</a>`;
  }).filter(Boolean).join("\n      ");

  return `<!doctype html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | ${siteTitle}</title>
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
    <nav class="langbar" aria-label="Language">
      <span>Language:</span>
      ${langLinks}
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
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY not set. Create a .env file with:\n  ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }
  const AnthropicClient = Anthropic.default ?? Anthropic;
  const client = new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Load existing articles
  const articles = loadArticlesData();
  const existingSlugs = new Set(articles.map(a => a.slug));

  // Find unprocessed TXT files
  const txtFiles = fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith(".txt"))
    .map(f => path.join(SRC_DIR, f));

  const newFiles = txtFiles.filter(f => {
    const { slug } = parseTxt(f);
    return !existingSlugs.has(slug);
  });

  if (newFiles.length === 0) {
    console.log("No new articles found in articles-src/. Nothing to do.");
    return;
  }

  console.log(`Found ${newFiles.length} new article(s) to process.\n`);

  for (const file of newFiles) {
    const { date, slug, title, body } = parseTxt(file);
    console.log(`\nProcessing: "${title}" (${date}, slug: ${slug})`);

    // Build entry
    const entry = { date, slug, en: { title }, ko: null, ja: null, fr: null, ru: null, es: null };

    // Translate to all 5 languages in parallel
    console.log("  Translating to KR, JP, FR, RU, ES (parallel)…");
    const results = await Promise.allSettled(
      LANGS.map(lang => translate(client, lang, title, body))
    );

    const translations = {};
    results.forEach((res, i) => {
      const lang = LANGS[i];
      if (res.status === "fulfilled") {
        translations[lang] = res.value;
        entry[lang] = { title: res.value.title };
        console.log(`  ✓ ${lang.toUpperCase()} — "${res.value.title}"`);
      } else {
        console.warn(`  ✗ ${lang.toUpperCase()} failed: ${res.reason.message}`);
      }
    });

    // Generate English article HTML
    const enBodyHtml = bodyToHtml(body);
    const enArticleDir = path.join(ROOT, "articles");
    fs.mkdirSync(enArticleDir, { recursive: true });
    fs.writeFileSync(
      path.join(enArticleDir, `${slug}.html`),
      articleHtml("en", slug, title, enBodyHtml, date, entry),
      "utf8"
    );
    console.log(`  ✓ en/articles/${slug}.html`);

    // Generate language article HTML files
    for (const lang of LANGS) {
      if (!translations[lang]) continue;
      const { title: ltitle, bodyHtml: lbody } = translations[lang];
      const langArticleDir = path.join(ROOT, lang, "articles");
      fs.mkdirSync(langArticleDir, { recursive: true });
      fs.writeFileSync(
        path.join(langArticleDir, `${slug}.html`),
        articleHtml(lang, slug, ltitle, lbody, date, entry),
        "utf8"
      );
      console.log(`  ✓ ${lang}/articles/${slug}.html`);
    }

    // Prepend to articles array (newest first in data file)
    articles.unshift(entry);
    saveArticlesData(articles);
    console.log(`  ✓ articles-data.js updated`);
  }

  console.log("\n✅ Done! Next steps:");
  console.log("   git add .");
  console.log('   git commit -m "Add new article(s)"');
  console.log("   git push");
  console.log("\n   Cloudflare Pages will auto-deploy within ~1 minute.");
}

main().catch(err => {
  console.error("\nFatal error:", err.message || err);
  process.exit(1);
});
