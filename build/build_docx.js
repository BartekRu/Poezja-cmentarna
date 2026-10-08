// Buduje antologia-robocza.docx z plików źródłowych w antologia/.
// Uruchomienie: node antologia/build/build_docx.js   (wymaga pakietu npm "docx")
// Źródło prawdy to pliki tekstowe; Word jest tylko wynikiem. Nie edytuj .docx ręcznie.

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

// A4, marginesy 2 cm (wersja do czytania i korekty; skład A5 robi później Typst)
const PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } };
const CONTENT_W = 11906 - 2 * 1134; // 9638 DXA

const read = (p) => fs.readFileSync(p, "utf8").replace(/\r/g, "");
const exists = (p) => fs.existsSync(p);

// --- proste parsowanie ------------------------------------------------------
function kv(file) {
  const o = {};
  for (const line of read(file).split("\n")) {
    if (line.startsWith("## ")) break;
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) o[m[1]] = m[2];
  }
  return o;
}
function pipeRows(file) {
  return read(file).split("\n").filter((l) => l.includes("|")).map((l) => l.split("|").map((s) => s.trim()));
}
function stanzas(file) {
  return read(file).trim().split(/\n\s*\n/).map((s) => s.split("\n"));
}

// Inline: **pogrubienie**, *kursywa*, znaczniki [do weryfikacji…] na żółto
const MARK = /\[(?:do weryfikacji|interpretacja|do decyzji)[^\]]*\]/g;
function runs(text, base = {}) {
  const out = [];
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  for (const t of tokens) {
    let style = { ...base }, s = t;
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

// Prosty markdown: #/##/### nagłówki, "- " wypunktowania, akapity
function markdown(file, skipH1 = false) {
  const out = [];
  let src = read(file).trim();
  if (skipH1) src = src.replace(/^# .*\n?/, "").trim();
  // Linie przetwarzane po kolei, żeby akapit wprowadzający stał przed swoją listą
  for (const block of src.split(/\n\s*\n/)) {
    let prose = [];
    const flush = () => {
      if (prose.length) out.push(new Paragraph({ children: runs(prose.join(" ")), spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED }));
      prose = [];
    };
    for (const l of block.split("\n")) {
      const h = l.match(/^(#{1,3})\s+(.*)$/);
      if (h) { flush(); out.push(heading(h[2], h[1].length === 1 ? 2 : 3)); continue; }
      if (l.startsWith("- ")) { flush(); out.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(l.slice(2)), spacing: { after: 60 } })); continue; }
      prose.push(l);
    }
    flush();
  }
  return out;
}

// --- elementy -----------------------------------------------------------------
const heading = (text, level = 2) =>
  new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: TITLE })],
    spacing: { before: level === 1 ? 0 : 280, after: 120 },
  });

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

// Tekst en face: nr | EN | PL | nr. Numeracja co 5, akapity wierszowe jako pusty wiersz (nie liczony)
function enFace(en, pl) {
  const W = [400, 4419, 4419, 400]; // suma = 9638
  const cell = (children, w, opts = {}) => new TableCell({ children, width: { size: w, type: WidthType.DXA }, borders: NOB, margins: { top: 10, bottom: 10, left: 60, right: 60 }, verticalAlign: VerticalAlign.TOP, ...opts });
  const p = (text, o = {}) => new Paragraph({ children: [new TextRun({ text, size: 21, ...o })], alignment: o.align });
  const num = (n) => p(n % 5 === 0 ? String(n) : "", { color: "8A7A5A", size: 18, align: AlignmentType.RIGHT });
  const rows = [
    new TableRow({ tableHeader: true, children: [
      cell([p("")], W[0]),
      cell([p("Oryginał", { italics: true, color: "8A7A5A", size: 18 })], W[1], { borders: { ...NOB, bottom: { style: BorderStyle.SINGLE, size: 4, color: "C9BBA0" } } }),
      cell([p("Przekład roboczy", { italics: true, color: "8A7A5A", size: 18 })], W[2], { borders: { ...NOB, bottom: { style: BorderStyle.SINGLE, size: 4, color: "C9BBA0" } } }),
      cell([p("")], W[3]),
    ] }),
  ];
  let n = 0;
  en.forEach((st, i) => {
    if (i > 0) rows.push(new TableRow({ children: W.map((w) => cell([p("")], w)) }));
    st.forEach((line, j) => {
      n++;
      rows.push(new TableRow({ cantSplit: true, children: [
        cell([num(n)], W[0]),
        cell([p(line)], W[1]),
        cell([p(pl[i][j])], W[2], { borders: { ...NOB, left: { style: BorderStyle.SINGLE, size: 2, color: "E2D8C4" } } }),
        cell([new Paragraph({ children: [new TextRun({ text: n % 5 === 0 ? String(n) : "", color: "8A7A5A", size: 18 })] })], W[3]),
      ] }));
    });
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: W, rows });
}

function poem(dir) {
  const D = (f) => path.join(dir, f);
  const k = kv(D("karta.md"));
  const en = stanzas(D("en.txt")), pl = stanzas(D("pl.txt"));
  const enN = en.map((s) => s.length).join(","), plN = pl.map((s) => s.length).join(",");
  if (enN !== plN) throw new Error(`${path.basename(dir)}: niezgodne akapity EN [${enN}] vs PL [${plN}]`);
  const lines = en.flat().length;

  const kids = [];
  // Karta utworu
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.nr, font: TITLE, size: 40, color: "8A7A5A" })], spacing: { after: 120 } }));
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${k.autor} (${k.lata})`, smallCaps: true, size: 24 })], spacing: { after: 160 } }));
  kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.tytul_pl, font: TITLE })], spacing: { after: 60 } }));
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.tytul_en, italics: true, size: 28, font: TITLE })], spacing: { after: 80 } }));
  kids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${k.rok} · ${lines} wersów`, size: 20, color: "8A7A5A" })], spacing: { after: 480 } }));

  // Motto
  if (exists(D("motto.md"))) {
    const m = kv(D("motto.md"));
    const indent = { left: 4300 };
    kids.push(new Paragraph({ indent, children: [new TextRun({ text: m.oryginal, italics: true })], spacing: { after: 60 } }));
    kids.push(new Paragraph({ indent, children: [new TextRun({ text: m.przeklad })], spacing: { after: 60 } }));
    kids.push(new Paragraph({ indent, children: [new TextRun({ text: `— ${m.autor}, ${m.zrodlo} (${m.tlumacz})`, size: 18, color: "6B5D45" })], spacing: { after: 360 } }));
  }

  // Wstęp
  kids.push(heading("Wstęp"));
  kids.push(...markdown(D("wstep.md")));

  // Tekst
  kids.push(pageBreak());
  kids.push(heading("Tekst"));
  kids.push(enFace(en, pl));

  // Glosy
  if (exists(D("glosy.md"))) {
    kids.push(heading("Glosy do tekstu angielskiego"));
    for (const [w, en_, pl_] of pipeRows(D("glosy.md")))
      kids.push(new Paragraph({ children: [new TextRun({ text: `w. ${w}  `, size: 19, color: "8A7A5A" }), new TextRun({ text: en_, italics: true, size: 19 }), new TextRun({ text: ` – ${pl_}`, size: 19 })], spacing: { after: 20 } }));
  }

  // Przypisy
  if (exists(D("przypisy.md"))) {
    kids.push(heading("Przypisy"));
    for (const [w, t] of pipeRows(D("przypisy.md")))
      kids.push(new Paragraph({ children: [new TextRun({ text: /^\d/.test(w) ? `w. ${w}. ` : `${w[0].toUpperCase() + w.slice(1)}. `, bold: true, size: 20 }), ...runs(t, { size: 20 })], spacing: { after: 80 }, alignment: AlignmentType.JUSTIFIED }));
  }

  if (k.ilustracja) kids.push(marker(k.ilustracja));

  return { k, kids };
}

// --- złożenie dokumentu ----------------------------------------------------
const chapters = Object.fromEntries(pipeRows(path.join(ROOT, "rozdzialy.md")).map(([nr, t, il]) => [nr, { t, il }]));
const poemDirs = fs.readdirSync(path.join(ROOT, "utwory")).filter((d) => /^\d\d-/.test(d)).sort().map((d) => path.join(ROOT, "utwory", d));

const today = new Date().toISOString().slice(0, 10);
const front = [
  new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Angielska poezja cmentarna", font: TITLE, size: 56 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Antologia dwujęzyczna", font: TITLE, italics: true, size: 32 })], spacing: { after: 600 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "tytuł roboczy", size: 20, color: "8A7A5A" })] }),
  new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Wersja robocza do korekty · ${today}`, size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Przekład roboczy: Claude (Anthropic); redakcja: Tomek", size: 20 })] }),
  new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: runs("Żółte wyróżnienia [do weryfikacji] oznaczają miejsca niepewne. Ramki w kolorze pergaminu to miejsca na ilustracje.", { size: 18, color: "6B5D45" }) }),
];

const sections = [{ properties: { page: PAGE }, children: front }];
let lastChapter = null;
const sources = [];
for (const dir of poemDirs) {
  const { k, kids } = poem(dir);
  const ch = chapters[k.rozdzial];
  if (k.rozdzial !== lastChapter && ch) {
    sections.push({ properties: { page: PAGE }, children: [
      new Paragraph({ spacing: { before: 2400 } }), marker(ch.il), pageBreak(),
      new Paragraph({ spacing: { before: 4000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.rozdzial, font: TITLE, size: 72, color: "8A7A5A" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: ch.t, font: TITLE })] }),
    ] });
    lastChapter = k.rozdzial;
  }
  sections.push({
    properties: { page: PAGE },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.zywa_pagina || `${k.autor} · ${k.tytul_pl}`, smallCaps: true, size: 18, color: "8A7A5A" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "8A7A5A" })] })] }) },
    children: kids,
  });
  if (exists(path.join(dir, "zrodlo.md"))) sources.push({ k, file: path.join(dir, "zrodlo.md") });
}

// Źródła na końcu tomu
const back = [heading("Źródła tekstów", 1)];
for (const { k, file } of sources) { back.push(heading(`${k.nr}. ${k.autor}, ${k.tytul_en}`, 2)); back.push(...markdown(file, true)); }
sections.push({ properties: { page: PAGE }, children: back });

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
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log(`OK: ${OUT} (${poemDirs.length} utwór/utwory)`); });
