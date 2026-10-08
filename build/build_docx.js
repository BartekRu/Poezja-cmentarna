// Buduje wyjscie/antologia-robocza.docx z plików źródłowych repozytorium.
// Układ tomu:
//   Część pierwsza (polska): karta, motto, wstęp, przekład, przypisy – bez oryginału
//   Część druga (angielska): oryginały w tej samej kolejności i numeracji
//   Na końcu: Słownik dawnej angielszczyzny (zbierany z utwory/*/slownik.md), Źródła tekstów
// Uruchomienie: npm install && npm run build. Pliku .docx nie edytuj ręcznie.

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, BorderStyle, ShadingType, PageBreak, Header, Footer, PageNumber,
  HeadingLevel, LevelFormat, VerticalAlign,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "wyjscie", "antologia-robocza.docx");
const BODY = "EB Garamond";
const TITLE = "Cormorant Garamond";
const MUTED = "8A7A5A";

// A4, marginesy 2 cm: wersja do czytania i korekty; skład A5 zrobi później Typst
const PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } };
const CONTENT_W = 11906 - 2 * 1134;

const read = (p) => fs.readFileSync(p, "utf8").replace(/\r/g, "");
const exists = (p) => fs.existsSync(p);

// --- parsowanie --------------------------------------------------------------
function kv(file) {
  const o = {};
  for (const line of read(file).split("\n")) {
    if (line.startsWith("## ")) break;
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) o[m[1]] = m[2];
  }
  return o;
}
const pipeRows = (file) => read(file).split("\n").filter((l) => l.includes("|")).map((l) => l.split("|").map((s) => s.trim()));
const stanzas = (file) => read(file).trim().split(/\n\s*\n/).map((s) => s.split("\n"));

// Inline: **pogrubienie**, *kursywa*, znaczniki [do weryfikacji…] na żółtym tle
const MARK = /\[(?:do weryfikacji|interpretacja|do decyzji)[^\]]*\]/g;
function runs(text, base = {}) {
  const out = [];
  for (const t of text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)) {
    const style = { ...base };
    let s = t;
    if (/^\*\*.+\*\*$/.test(t)) { style.bold = true; s = t.slice(2, -2); }
    else if (/^\*.+\*$/.test(t)) { style.italics = !base.italics; s = t.slice(1, -1); }
    let last = 0;
    for (const m of s.matchAll(MARK)) {
      if (m.index > last) out.push(new TextRun({ text: s.slice(last, m.index), ...style }));
      out.push(new TextRun({ text: m[0], ...style, shading: { type: ShadingType.CLEAR, fill: "FFF0A0", color: "auto" } }));
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push(new TextRun({ text: s.slice(last), ...style }));
  }
  return out;
}

const bullet = (text) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(text), spacing: { after: 60 } });

// Prosty markdown: nagłówki #/##/###, wypunktowania "- ", akapity; linie po kolei
function markdown(file, skipH1 = false) {
  const out = [];
  let src = read(file).trim();
  if (skipH1) src = src.replace(/^# .*\n?/, "").trim();
  for (const block of src.split(/\n\s*\n/)) {
    let prose = [];
    const flush = () => {
      if (prose.length) out.push(new Paragraph({ children: runs(prose.join(" ")), spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED }));
      prose = [];
    };
    for (const l of block.split("\n")) {
      const h = l.match(/^(#{1,3})\s+(.*)$/);
      if (h) { flush(); out.push(heading(h[2], h[1].length === 1 ? 2 : 3)); continue; }
      if (l.startsWith("- ")) { flush(); out.push(bullet(l.slice(2))); continue; }
      prose.push(l);
    }
    flush();
  }
  return out;
}

// --- elementy -----------------------------------------------------------------
const heading = (text, level = 2) => new Paragraph({
  heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][level - 1],
  children: [new TextRun({ text, font: TITLE })],
  spacing: { before: level === 1 ? 0 : 280, after: 120 },
});
const center = (text, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, ...o })], spacing: { after: o.after ?? 80 } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

function marker(text) {
  return new Paragraph({
    children: runs(text, { italics: true, color: "5A4A2A" }),
    shading: { type: ShadingType.CLEAR, fill: "F3EBDD", color: "auto" },
    border: { top: { style: BorderStyle.DASHED, size: 6, color: "A08C6A", space: 4 }, bottom: { style: BorderStyle.DASHED, size: 6, color: "A08C6A", space: 4 } },
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.CENTER,
  });
}

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };

// Tekst wiersza: numeracja co 5 po lewej, akapity wierszowe oddzielone pustym (nieliczonym) wierszem.
// Ta sama numeracja w obu częściach, więc przypisy działają dla przekładu i oryginału.
function verse(stz) {
  const W = [700, CONTENT_W - 700];
  const cell = (children, w) => new TableCell({ children, width: { size: w, type: WidthType.DXA }, borders: NOB, margins: { top: 10, bottom: 10, left: 60, right: 60 }, verticalAlign: VerticalAlign.TOP });
  const p = (text, o = {}) => new Paragraph({ children: [new TextRun({ text, size: 23, ...o })], alignment: o.align });
  const rows = [];
  let n = 0;
  stz.forEach((st, i) => {
    if (i > 0) rows.push(new TableRow({ children: W.map((w) => cell([p("")], w)) }));
    for (const line of st) {
      n++;
      rows.push(new TableRow({ cantSplit: true, children: [
        cell([p(n % 5 === 0 ? String(n) : "", { color: MUTED, size: 18, align: AlignmentType.RIGHT })], W[0]),
        cell([p(line)], W[1]),
      ] }));
    }
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: W, rows });
}

const surname = (autor) => autor.split(" ").slice(-1)[0];
// Pusta pagina: strony tytułowe, otwarcia części i rozdziałów (inaczej Word dziedziczy nagłówek poprzedniej sekcji)
const blankHead = () => ({
  headers: { default: new Header({ children: [new Paragraph({})] }) },
  footers: { default: new Footer({ children: [new Paragraph({})] }) },
});
const runningHead = (text) => ({
  headers: { default: new Header({ children: [center(text, { smallCaps: true, size: 18, color: MUTED, after: 0 })] }) },
  footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTED })] })] }) },
});

// --- dane -------------------------------------------------------------------
function load(dir) {
  const D = (f) => path.join(dir, f);
  const k = kv(D("karta.md"));
  const en = stanzas(D("en.txt")), pl = stanzas(D("pl.txt"));
  const a = en.map((s) => s.length).join(","), b = pl.map((s) => s.length).join(",");
  if (a !== b) throw new Error(`${path.basename(dir)}: niezgodne akapity EN [${a}] vs PL [${b}]`);
  return { dir, D, k, en, pl, lines: en.flat().length };
}

function polishPoem(u) {
  const { D, k, pl, lines } = u;
  const kids = [
    center(k.nr, { font: TITLE, size: 40, color: MUTED, after: 120 }),
    center(`${k.autor} (${k.lata})`, { smallCaps: true, size: 24, after: 160 }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.tytul_pl, font: TITLE })], spacing: { after: 60 } }),
    ...(k.tytul_en !== k.tytul_pl ? [center(k.tytul_en, { italics: true, size: 28, font: TITLE })] : []),
    center(`${k.rok} · ${lines} wersów · oryginał w części drugiej`, { size: 20, color: MUTED, after: 480 }),
  ];
  if (exists(D("motto.md"))) {
    const m = kv(D("motto.md"));
    const indent = { left: 4300 };
    kids.push(new Paragraph({ indent, children: [new TextRun({ text: m.oryginal, italics: true })], spacing: { after: 60 } }));
    kids.push(new Paragraph({ indent, children: [new TextRun({ text: m.przeklad })], spacing: { after: 60 } }));
    kids.push(new Paragraph({ indent, children: [new TextRun({ text: `— ${m.autor}, ${m.zrodlo} (${m.tlumacz})`, size: 18, color: "6B5D45" })], spacing: { after: 360 } }));
  }
  kids.push(heading("Wstęp"), ...markdown(D("wstep.md")));
  kids.push(pageBreak(), heading("Przekład"), verse(pl));
  if (exists(D("przypisy.md"))) {
    kids.push(heading("Przypisy"));
    for (const [w, t] of pipeRows(D("przypisy.md")))
      kids.push(new Paragraph({ children: [new TextRun({ text: /^\d/.test(w) ? `w. ${w}. ` : `${w[0].toUpperCase() + w.slice(1)}. `, bold: true, size: 20 }), ...runs(t, { size: 20 })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
  }
  if (k.ilustracja) kids.push(marker(k.ilustracja));
  return { properties: { page: PAGE }, ...runningHead(k.zywa_pagina || `${surname(k.autor)} · ${k.tytul_pl}`), children: kids };
}

function englishPoem(u) {
  const { k, en } = u;
  return {
    properties: { page: PAGE }, ...runningHead(`${surname(k.autor)} · ${k.tytul_en}`),
    children: [
      center(k.nr, { font: TITLE, size: 40, color: MUTED, after: 120 }),
      center(`${k.autor} (${k.lata})`, { smallCaps: true, size: 24, after: 160 }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.tytul_en, font: TITLE })], spacing: { after: 60 } }),
      center(`przekład w części pierwszej: „${k.tytul_pl}”`, { size: 20, color: MUTED, after: 480 }),
      verse(en),
    ],
  };
}

function chapterOpener(nr, ch, withIllustration) {
  const kids = [];
  if (withIllustration) kids.push(new Paragraph({ spacing: { before: 2400 } }), marker(ch.il), pageBreak());
  kids.push(new Paragraph({ spacing: { before: 4000 } }), center(nr, { font: TITLE, size: 72, color: MUTED }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: ch.t, font: TITLE })] }));
  return { properties: { page: PAGE }, ...blankHead(), children: kids };
}

const partOpener = (label, title, sub) => ({ properties: { page: PAGE }, ...blankHead(), children: [
  new Paragraph({ spacing: { before: 4500 } }),
  center(label, { smallCaps: true, size: 26, color: MUTED, after: 200 }),
  new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: title, font: TITLE, size: 56 })] }),
  center(sub, { italics: true, size: 24, color: MUTED }),
] });

// Słownik: hasła ze wszystkich utworów, łączone i sortowane; odsyłacz „nr utworu.wers”
function dictionary(units) {
  const dict = new Map();
  for (const u of units) {
    if (!exists(u.D("slownik.md"))) continue;
    for (const [w, hw, meaning] of pipeRows(u.D("slownik.md"))) {
      const key = hw.toLowerCase();
      if (!dict.has(key)) dict.set(key, { hw, senses: new Map() });
      const e = dict.get(key);
      e.senses.set(meaning, [...(e.senses.get(meaning) || []), `${u.k.nr}.${w}`]);
    }
  }
  const sortKey = (s) => s.replace(/^to /, "").replace(/^['’]/, "");
  const coll = new Intl.Collator("en", { sensitivity: "base" });
  const entries = [...dict.keys()].sort((a, b) => coll.compare(sortKey(a), sortKey(b)));
  const kids = [
    heading("Słownik dawnej angielszczyzny", 1),
    new Paragraph({ children: runs("Trudne i dawne słowa ze wszystkich utworów części drugiej. Odsyłacz *6.12* oznacza utwór nr 6, wers 12.", { size: 20, color: "6B5D45" }), spacing: { after: 240 } }),
  ];
  let letter = "";
  for (const key of entries) {
    const { hw, senses } = dict.get(key);
    const L = sortKey(key)[0].toUpperCase();
    if (L !== letter) { letter = L; kids.push(new Paragraph({ children: [new TextRun({ text: L, font: TITLE, size: 30, color: MUTED })], spacing: { before: 200, after: 60 }, keepNext: true })); }
    const ch = [new TextRun({ text: hw, bold: true, size: 21 })];
    [...senses].forEach(([m, refs], i) => {
      ch.push(new TextRun({ text: i === 0 ? " – " : "; ", size: 21 }), ...runs(m, { size: 21 }), new TextRun({ text: ` (${refs.join(", ")})`, size: 18, color: MUTED }));
    });
    kids.push(new Paragraph({ children: ch, spacing: { after: 30 }, indent: { left: 280, hanging: 280 } }));
  }
  return { properties: { page: PAGE }, ...runningHead("Słownik dawnej angielszczyzny"), children: kids };
}

// --- złożenie dokumentu ----------------------------------------------------
const chapters = Object.fromEntries(pipeRows(path.join(ROOT, "rozdzialy.md")).map(([nr, t, il]) => [nr, { t, il }]));
const units = fs.readdirSync(path.join(ROOT, "utwory")).filter((d) => /^\d\d-/.test(d)).sort().map((d) => load(path.join(ROOT, "utwory", d)));

const today = new Date().toISOString().slice(0, 10);
const sections = [{ properties: { page: PAGE }, ...blankHead(), children: [
  new Paragraph({ spacing: { before: 3000 } }),
  center("Angielska poezja cmentarna", { font: TITLE, size: 56 }),
  center("Antologia dwujęzyczna", { font: TITLE, italics: true, size: 32, after: 600 }),
  center("tytuł roboczy", { size: 20, color: MUTED }),
  new Paragraph({ spacing: { before: 3000 } }),
  center(`Wersja robocza do korekty · ${today}`, { size: 20 }),
  center("Przekład roboczy: Claude (Anthropic); redakcja: Tomek", { size: 20 }),
  new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: runs("Żółte wyróżnienia [do weryfikacji] oznaczają miejsca niepewne. Ramki w kolorze pergaminu to miejsca na ilustracje.", { size: 18, color: "6B5D45" }) }),
] }];

function part(render, withIllustration) {
  let last = null;
  for (const u of units) {
    const nr = u.k.rozdzial;
    if (nr !== last && chapters[nr]) { sections.push(chapterOpener(nr, chapters[nr], withIllustration)); last = nr; }
    sections.push(render(u));
  }
}

sections.push(partOpener("Część pierwsza", "Przekład i komentarz", "karta utworu · motto · wstęp · przekład · przypisy"));
// Wprowadzenie: wprowadzenie/NN-*.md, tytuł z pierwszego nagłówka "# "
const intro = path.join(ROOT, "wprowadzenie");
if (exists(intro)) for (const f of fs.readdirSync(intro).filter((f) => /^\d\d-.*\.md$/.test(f)).sort()) {
  const file = path.join(intro, f);
  const title = (read(file).match(/^# (.*)$/m) || [, f])[1];
  sections.push({ properties: { page: PAGE }, ...runningHead(title), children: [heading(title, 1), ...markdown(file, true)] });
}
part(polishPoem, true);
sections.push(partOpener("Część druga", "The Original Poems", "teksty oryginalne w tej samej kolejności i numeracji"));
part(englishPoem, false);
sections.push(dictionary(units));

const back = [heading("Źródła tekstów", 1)];
for (const u of units) if (exists(u.D("zrodlo.md"))) back.push(heading(`${u.k.nr}. ${u.k.autor}, ${u.k.tytul_en}`, 2), ...markdown(u.D("zrodlo.md"), true));
sections.push({ properties: { page: PAGE }, ...runningHead("Źródła tekstów"), children: back });

const doc = new Document({
  creator: "Claude (przekład roboczy) / Tomek (redakcja)",
  title: "Angielska poezja cmentarna — wersja robocza",
  styles: {
    default: { document: { run: { font: BODY, size: 23 }, paragraph: { spacing: { line: 276 } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 40, font: TITLE }, paragraph: { spacing: { after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, font: TITLE, smallCaps: true, color: "4A3F2C" }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, font: TITLE, bold: true }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 240 } } } }] }] },
  sections,
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log(`OK: ${OUT} (utwory: ${units.length})`); });
