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
    "date": "2026-03-11",
    "slug": "website-test-notice-and-upcoming-content-preview",
    "en": {
      "title": "Website Test Notice and Upcoming Content Preview"
    },
    "ko": {
      "title": "웹사이트 테스트 공지 및 예정 콘텐츠 미리보기"
    },
    "ja": {
      "title": "ウェブサイトテストのお知らせおよび今後のコンテンツ予告"
    },
    "fr": {
      "title": "Avis de test du site Web et aperçu des contenus à venir"
    },
    "ru": {
      "title": "Уведомление о тестировании веб-сайта и анонс предстоящих материалов"
    },
    "es": {
      "title": "Aviso de prueba del sitio web y adelanto del contenido próximo"
    }
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
