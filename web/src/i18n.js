import { clearNumberFormatCache } from "./format.js";

const KEY = "itt-lang";

let currentLang = "id";

const META = {
  id: {
    title: "Pajak token bahasa Indonesia",
    description:
      "Untuk makna yang sama, teks Indonesia sering memakai 25–84% lebih banyak token daripada bahasa Inggris. Diukur di browser Anda; teks tidak dikirim ke mana pun.",
    ogDescription:
      "Di ChatGPT (GPT-4o), Indonesia memakai sekitar 1,25× token. Sampai 1,84× di Mistral — padahal kata Indonesia lebih sedikit.",
    twitterDescription: "Perbandingan token Indonesia vs Inggris di tujuh alat populer.",
  },
  en: {
    title: "Indonesian Token Tax",
    description:
      "For the same meaning, Indonesian text often uses 25–84% more tokens than English. Measured in your browser; your text stays on your device.",
    ogDescription:
      "On ChatGPT (GPT-4o), Indonesian uses about 1.25× tokens. Up to 1.84× on Mistral — even though Indonesian uses fewer words.",
    twitterDescription: "Indonesian vs English token comparison across seven popular tools.",
  },
};

const STRINGS = {
  skip: { id: "Lewati ke konten", en: "Skip to content" },
  siteTitle: { id: "Pajak token bahasa Indonesia", en: "Indonesian Token Tax" },
  themeDark: { id: "Mode gelap", en: "Dark mode" },
  themeLight: { id: "Mode terang", en: "Light mode" },
  themeDarkAria: { id: "Mode gelap", en: "Dark mode" },
  themeLightAria: { id: "Mode terang", en: "Light mode" },
  langId: { id: "ID", en: "ID" },
  langEn: { id: "EN", en: "EN" },
  langToggleAria: {
    id: "Ganti bahasa: Indonesia atau Inggris",
    en: "Switch language: Indonesian or English",
  },

  heroHeadline: {
    id: "Di ChatGPT (GPT-4o), teks Indonesia memakai 1,25× token dibanding bahasa Inggris — sekitar 25% lebih. Di Mistral, sampai 1,84× (~84% lebih).",
    en: "On ChatGPT (GPT-4o), Indonesian uses 1.25× as many tokens as English — about 25% more. On Mistral, up to 1.84× (~84% more).",
  },
  heroMetricLabel: {
    id: "ChatGPT (GPT-4o): 1,25× token dibanding bahasa Inggris",
    en: "ChatGPT (GPT-4o): 1.25× tokens compared with English",
  },
  heroRange: {
    id: "Tujuh alat populer, data terjemahan formal: {min}–{max}",
    en: "Seven popular tools, formal translation data: {min}–{max}",
  },

  meaningTitle: { id: "Apa artinya buat saya?", en: "What this means for me" },
  meaningLead: {
    id: "Untuk makna yang sama, Anda ditagih 25–84% lebih banyak token.",
    en: "For the same meaning, you are billed for 25–84% more tokens.",
  },
  meaningExample: {
    id: "Teks yang butuh {enTokens} token dalam bahasa Inggris butuh sekitar {idTokens} token dalam bahasa Indonesia di ChatGPT (GPT-4o).",
    en: "Text that needs {enTokens} tokens in English needs about {idTokens} tokens in Indonesian on ChatGPT (GPT-4o).",
  },
  meaningTableCaption: {
    id: "Token Indonesia per 1.000 token bahasa Inggris (makna sama)",
    en: "Indonesian tokens per 1,000 English tokens (same meaning)",
  },
  meaningColTool: { id: "Alat", en: "Tool" },
  meaningColIdPer1k: { id: "Token Indonesia / 1.000 EN", en: "Indonesian tokens / 1,000 EN" },
  meaningColRatio: { id: "Perbandingan", en: "Ratio" },

  stripsTitle: { id: "Apa itu potongan kata?", en: "What is a word piece?" },
  stripsLead: {
    id: "Satu token adalah potongan kata — teks dipotong menjadi bagian-bagian kecil untuk dihitung.",
    en: "A token is a word piece — text is chopped into small parts to be counted.",
  },
  stripsPair: { id: "pasangan #{n}", en: "pair #{n}" },
  stripLangEn: { id: "EN", en: "EN" },
  stripLangId: { id: "ID", en: "ID" },

  boardTitle: { id: "Tujuh alat, dari termurah ke termahal", en: "Seven tools, cheapest to priciest" },
  boardChartTitle: {
    id: "Perbandingan token Indonesia vs Inggris menurut alat",
    en: "Indonesian over English token ratio by tool",
  },
  boardChartDesc: {
    id: "Grafik titik dengan selang kepercayaan 95%. Garis putus-putus di 1,0 = sama dengan bahasa Inggris.",
    en: "Dot plot with 95% confidence intervals. Dashed line at 1.0 = same as English.",
  },
  parityLabel: {
    id: "sama dengan bahasa Inggris",
    en: "same as English",
  },
  boardTableAria: {
    id: "Tabel perbandingan tujuh alat",
    en: "Comparison table for seven tools",
  },
  colTool: { id: "Alat", en: "Tool" },
  colRatio: { id: "Token ID/EN", en: "ID/EN tokens" },
  colCi: { id: "Selang 95%", en: "95% CI" },
  colWords: { id: "Kata ID/EN", en: "ID/EN words" },
  colPer1k: { id: "Token ID per 1.000 EN", en: "ID tokens per 1,000 EN" },
  tierCheapest: { id: "termurah", en: "cheapest" },
  tierPriciest: { id: "termahal", en: "priciest" },
  chartSrTable: {
    id: "Angka sama ada di tabel di bawah.",
    en: "See the sortable table below for the same numbers.",
  },

  tryTitle: { id: "Coba sendiri", en: "Try it" },
  tryPrivacy: {
    id: "Halaman ini berjalan sepenuhnya di browser Anda. Teks yang Anda ketik tidak dikirim ke mana pun. File penghitung kata dimuat dari huggingface.co saat pertama kali Anda menekan Potong. Tanpa analitik.",
    en: "This page runs entirely in your browser. Typed text is not sent anywhere. Word-piece files load from huggingface.co on the first Tokenize click. No analytics.",
  },
  tryExamplesAria: { id: "Contoh kalimat", en: "Example sentences" },
  exFormal: { id: "Berita formal", en: "Formal news" },
  exSupport: { id: "Layanan pelanggan", en: "Customer support" },
  exSlang: { id: "Bahasa gaul", en: "Slang" },
  exCode: { id: "Komentar kode", en: "Code comment" },
  tryLabelId: { id: "Indonesia", en: "Indonesian" },
  tryLabelEn: { id: "Inggris", en: "English" },
  tryTokenize: { id: "Potong kata", en: "Tokenize" },
  tryShowEn: { id: "Tampilkan potongan Inggris", en: "Show English spans" },
  tryHint: {
    id: "Penghitung dimuat saat klik pertama (hanya file tokenizer, tanpa bobot model). Cmd/Ctrl+Enter untuk memotong.",
    en: "Counters load on the first click (tokenizer files only, no model weights). Cmd/Ctrl+Enter to tokenize.",
  },
  guessPrompt: {
    id: "Sebelum melihat hasil: teks Indonesia ini memakai token…",
    en: "Before you see results: this Indonesian text uses…",
  },
  guessSame: { id: "Hampir sama dengan Inggris", en: "About the same as English" },
  guessMid: { id: "Sekitar 1,25× Inggris", en: "About 1.25× English" },
  guessHigh: { id: "Hampir 2× Inggris", en: "Almost 2× English" },
  tryCompareTitle: { id: "Perbandingan", en: "Comparison" },
  tryRankSr: {
    id: "Alat, token Indonesia, token Inggris, perbandingan ID/EN",
    en: "Tool, Indonesian tokens, English tokens, ID/EN ratio",
  },
  statusLoading: { id: "Memuat…", en: "Loading…" },
  statusWaiting: { id: "menunggu", en: "waiting" },

  methodTitle: { id: "Metode & data", en: "Method & data" },
  methodLead: {
    id: "Setiap pasangan kalimat dihitung sebagai teks mentah (tanpa template chat). Pajak = jumlah token Indonesia ÷ jumlah token Inggris. Data utama: FLORES-200 (1.012 pasang terjemahan formal). Selang 95% dari bootstrap 1.000 kali (seed 42).",
    en: "Each sentence pair is counted as raw text (no chat template). Tax = sum of Indonesian tokens ÷ sum of English tokens. Main data: FLORES-200 (1,012 formal translation pairs). 95% intervals from 1,000 bootstrap resamples (seed 42).",
  },
  methodDetails: { id: "Detail teknis & irisan lain", en: "Technical detail & other slices" },
  methodTech: {
    id: "Pengodean dengan add_special_tokens=false. Angka papan peringkat disalin dari pipeline Python (results/results.json). Rasio kata ID/EN di FLORES ~0,90 — artinya Indonesia bukan teks yang lebih panjang.",
    en: "Encoding uses add_special_tokens=false. Leaderboard numbers are copied from the Python pipeline (results/results.json). FLORES word ratio ID/EN ~0.90 — Indonesian is not the longer text.",
  },
  methodSlices: { id: "Irisan sintetis (ilustrasi, contoh kecil):", en: "Synthetic slices (illustrations, small samples):" },
  sliceFlores: { id: "FLORES-200", en: "FLORES-200" },
  sliceDomain: { id: "Domain (n≈30)", en: "Domain (n≈30)" },
  sliceInformal: { id: "Informal (n≈40)", en: "Informal (n≈40)" },
  sliceInformalMatched: { id: "Informal panjang disamakan (n≈40)", en: "Informal length-matched (n≈40)" },
  limitationsTitle: { id: "Keterbatasan", en: "Limitations" },
  lim1: {
    id: "FLORES-200 adalah terjemahan profesional, mirip berita, formal. Obrolan dan gaul hanya dari irisan sintetis kecil.",
    en: "FLORES-200 is professionally translated, news-like, formal. Chat and slang are only the small synthetic slices.",
  },
  lim2: {
    id: "Irisan sintetis kecil; selang kepercayaannya lebar. Anggap sebagai ilustrasi.",
    en: "Synthetic slices are small; their CIs are wide. Treat them as illustrations.",
  },
  lim3: {
    id: "Rasio di atas 1 bisa dari cara pemotong kata atau dari Indonesia yang memakai lebih banyak kata daripada referensi Inggris. Cek kolom rasio kata.",
    en: "A ratio above 1 can come from word-piece splitting or from Indonesian using more words than the English reference. Check the word-ratio column.",
  },
  lim4: {
    id: "Halaman ini tidak menilai kualitas jawaban model.",
    en: "This page does not evaluate generation quality.",
  },
  qwenSailorNote: {
    id: "Qwen dan Sailor memakai vocab.json yang sama; hitungan token identik di sini.",
    en: "Qwen and Sailor share the same vocab.json; identical token counts here.",
  },

  footerOnPage: { id: "Di halaman ini", en: "On this page" },
  footerMethod: { id: "Metode", en: "Method" },
  footerLimitations: { id: "Keterbatasan", en: "Limitations" },
  footerSource: { id: "Kode sumber GitHub", en: "GitHub source" },
  footerAuthor: { id: "Penulis", en: "Author" },
  footerBuilt: {
    id: "Dibangun dengan transformers.js + js-tiktoken",
    en: "Built with transformers.js + js-tiktoken",
  },

  fieldMeta: {
    id: "{chars} karakter · {words} kata",
    en: "{chars} chars · {words} words",
  },
  charsPerToken: { id: "karakter/token", en: "chars/token" },
  indonesianPieces: { id: "Indonesia", en: "Indonesian" },
  englishPieces: { id: "Inggris", en: "English" },
};

export function getLang() {
  return currentLang;
}

export function localeTag() {
  return currentLang === "id" ? "id-ID" : "en-US";
}

export function t(key, vars = {}) {
  const entry = STRINGS[key];
  let text =
    entry?.[currentLang] ?? entry?.id ?? entry?.en ?? (typeof entry === "string" ? entry : key);
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

export function metaFor(lang) {
  return META[lang] ?? META.id;
}

function applyMeta(lang) {
  const m = metaFor(lang);
  document.title = m.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", m.description);
  const ogDesc = document.querySelector('meta[property="og:title"]');
  if (ogDesc) ogDesc.setAttribute("content", m.title);
  const ogD = document.querySelector('meta[property="og:description"]');
  if (ogD) ogD.setAttribute("content", m.ogDescription);
  const twT = document.querySelector('meta[name="twitter:title"]');
  if (twT) twT.setAttribute("content", m.title);
  const twD = document.querySelector('meta[name="twitter:description"]');
  if (twD) twD.setAttribute("content", m.twitterDescription);
}

export function updateThemeToggleLabel() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const dark = document.documentElement.dataset.theme === "dark";
  btn.setAttribute("aria-label", dark ? t("themeLightAria") : t("themeDarkAria"));
  btn.setAttribute("aria-pressed", String(dark));
}

export function applyLang(lang) {
  currentLang = lang === "en" ? "en" : "id";
  document.documentElement.lang = currentLang;
  clearNumberFormatCache();
  applyMeta(currentLang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    const text = t(key);
    if (el.dataset.i18nAttr) {
      el.setAttribute(el.dataset.i18nAttr, text);
    } else if (el.tagName === "META") {
      el.setAttribute("content", text);
    } else {
      el.textContent = text;
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key) el.innerHTML = t(key);
  });

  updateThemeToggleLabel();

  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) {
    langBtn.setAttribute("aria-label", t("langToggleAria"));
    langBtn.textContent = currentLang === "id" ? "EN" : "ID";
  }

  const heroVal = document.querySelector(".hero-ratio-val");
  if (heroVal) {
    heroVal.dataset.countLocale = currentLang;
    if (!document.documentElement.classList.contains("js-motion")) {
      const n = new Intl.NumberFormat(localeTag(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(1.2461);
      heroVal.textContent = `${n}×`;
    }
  }

  window.dispatchEvent(new CustomEvent("itt:lang", { detail: { lang: currentLang } }));
}

export function initLang() {
  const stored = localStorage.getItem(KEY);
  const lang = stored === "en" || stored === "id" ? stored : "id";
  applyLang(lang);

  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const next = currentLang === "id" ? "en" : "id";
      localStorage.setItem(KEY, next);
      applyLang(next);
    });
  }
}