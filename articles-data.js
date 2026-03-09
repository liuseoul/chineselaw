/**
 * SINGLE SOURCE OF TRUTH for all articles.
 * Managed automatically by: scripts/publish.js
 *
 * Each entry:
 *   date  – YYYY-MM-DD
 *   slug  – URL-safe identifier  (also the HTML filename stem)
 *   en    – { title }   English title
 *   ko/ja/fr/ru/es – { title } translated title, or null if not yet translated
 *
 * URL convention (always relative to the page including this file):
 *   English articles live at  articles/{slug}.html
 *   From ko/index.html        articles/{slug}.html → resolves to ko/articles/{slug}.html ✓
 */

var ARTICLES_DATA = [
  {
    "date": "2026-03-09",
    "slug": "20260309-test",
    "en": {
      "title": "Website Test Notice and Upcoming Content Preview"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-03-01",
    "slug": "arbitration-start-guide",
    "en": {
      "title": "How Foreign Companies Can Start Arbitration in China: A Practical Step-by-Step Guide"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-02-24",
    "slug": "arbitration-vs-litigation",
    "en": {
      "title": "China Arbitration vs Court Litigation: How Foreign Parties Should Choose"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-02-18",
    "slug": "dispute-clause-checklist",
    "en": {
      "title": "How to Draft a China-Related Dispute Resolution Clause: Checklist and Common Mistakes"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-02-10",
    "slug": "interim-measures-asset-preservation",
    "en": {
      "title": "Interim Measures and Asset Preservation in China Disputes: What Foreign Parties Need to Know"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-02-02",
    "slug": "enforcing-arbitral-award",
    "en": {
      "title": "Enforcing an Arbitral Award in China: A Practical Guide for Foreign Parties"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-01-28",
    "slug": "investment-risk-checklist",
    "en": {
      "title": "Legal Risk Checklist for Foreign Investment Projects in China: Contract, Control, and Dispute Prevention"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-01-19",
    "slug": "contract-risk-review-10-clauses",
    "en": {
      "title": "China Contract Risk Review for Foreign Businesses: 10 Clauses That Matter Most"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2026-01-12",
    "slug": "when-to-seek-representation",
    "en": {
      "title": "When to Seek Representation in a China-Related Commercial Dispute: A Practical Decision Guide"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2025-12-30",
    "slug": "evidence-preparation-checklist",
    "en": {
      "title": "Evidence Preparation for China Arbitration, Litigation, and Investment Disputes: A Practical Checklist"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  },
  {
    "date": "2025-12-20",
    "slug": "practical-timeline",
    "en": {
      "title": "A Practical Timeline of a China-Related Matter: From Contract Risk Review to Dispute Resolution and Enforcement"
    },
    "ko": null,
    "ja": null,
    "fr": null,
    "ru": null,
    "es": null
  }
];

/**
 * LANG_META – display labels and back-link paths for each language.
 * Used by page scripts to build the language switcher.
 */
var LANG_META = {
  en: { label: "EN", name: "English",  homeUrl: "/index.html",    pubsUrl: "/publications.html" },
  ko: { label: "KR", name: "한국어",    homeUrl: "/ko/index.html", pubsUrl: "/ko/publications.html" },
  ja: { label: "JP", name: "日本語",    homeUrl: "/ja/index.html", pubsUrl: "/ja/publications.html" },
  fr: { label: "FR", name: "Français",  homeUrl: "/fr/index.html", pubsUrl: "/fr/publications.html" },
  ru: { label: "RU", name: "Русский",   homeUrl: "/ru/index.html", pubsUrl: "/ru/publications.html" },
  es: { label: "ES", name: "Español",   homeUrl: "/es/index.html", pubsUrl: "/es/publications.html" },
};
