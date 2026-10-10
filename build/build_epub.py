#!/usr/bin/env python3
"""Buduje wyjscie/antologia-robocza.epub z plików źródłowych repozytorium.

Ten sam układ co wersja Word (build_docx.js): część polska, część angielska,
słownik, źródła. Tekst płynny (reflow), numeracja wersów co 5 na marginesie,
ilustracje zmniejszone do czytnika. Pakowanie: pandoc (HTML -> EPUB 3).

Użycie: python3 build/build_epub.py
Zmienne środowiskowe (opcjonalne):
  EKSPORT     – opis daty eksportu na stronie tytułowej, np. "10.10.2026, godz. 13:20"
  EPUB_FONTS  – katalog ze statycznymi plikami EB Garamond (osadzane w EPUB)
Wymaga: pandoc >= 3, Pillow.
"""
import datetime
import glob
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "wyjscie", "antologia-robocza.epub")
MAX_PX = 1400  # dłuższy bok ilustracji w EPUB (rozmiar pliku do wysyłki mailem)


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def exists(p):
    return os.path.exists(p)


def kv(p):
    o = {}
    for line in read(p).split("\n"):
        if line.startswith("## "):
            break
        m = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if m:
            o[m.group(1)] = m.group(2)
    return o


def pipe_rows(p):
    return [[s.strip() for s in l.split("|")] for l in read(p).split("\n") if "|" in l]


def table_rows(p):
    if not exists(p):
        return []
    rows = []
    for l in read(p).split("\n"):
        l = l.strip()
        if l.startswith("|") and not re.match(r"^\|[\s:|-]+$", l):
            rows.append([s.strip() for s in l.strip("|").split("|")])
    return rows[1:]


def stanzas(p):
    return [s.split("\n") for s in re.split(r"\n\s*\n", read(p).strip())]


# --- inline: **pogrubienie**, *kursywa*, znaczniki [do weryfikacji…] ---------
MARK = re.compile(r"\[(?:do weryfikacji|interpretacja|do decyzji)[^\]]*\]")


def inline(text):
    out = []
    for t in re.split(r"(\*\*[^*]+\*\*|\*[^*]+\*)", text):
        if not t:
            continue
        if re.fullmatch(r"\*\*.+\*\*", t):
            out.append(f"<strong>{inline(t[2:-2])}</strong>")
        elif re.fullmatch(r"\*.+\*", t):
            out.append(f"<em>{inline(t[1:-1])}</em>")
        else:
            s = html.escape(t, quote=False)
            s = MARK.sub(lambda m: f'<span class="mark">{m.group(0)}</span>', s)
            out.append(s)
    return "".join(out)


def markdown(p, skip_h1=False, hlevel=4):
    src = read(p).strip()
    if skip_h1:
        src = re.sub(r"^# .*\n?", "", src).strip()
    out = []
    for block in re.split(r"\n\s*\n", src):
        prose, items = [], []

        def flush():
            if prose:
                out.append(f"<p>{inline(' '.join(prose))}</p>")
                prose.clear()
            if items:
                out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in items) + "</ul>")
                items.clear()

        for l in block.split("\n"):
            h = re.match(r"^(#{1,3})\s+(.*)$", l)
            if h:
                flush()
                out.append(f"<h{hlevel + len(h.group(1)) - 1}>{inline(h.group(2))}</h{hlevel + len(h.group(1)) - 1}>")
                continue
            b = re.match(r"^\s*- (.*)$", l)
            if b:
                if prose:
                    flush()
                items.append(b.group(1))
                continue
            if items:
                flush()
            prose.append(l.strip())
        flush()
    return "\n".join(out)


def verse(stz, pending=0):
    out, n = ['<div class="verse">'], 0
    for st in stz:
        out.append('<div class="st">')
        for line in st:
            at = re.match(r"^@(\d+)$", line)
            if at:
                n = int(at.group(1)) - 1
                continue
            if line.startswith("# "):
                out.append(f'<div class="vh">{inline(line[2:])}</div>')
                continue
            n += 1
            num = f'<span class="n">{n}</span>' if n % 5 == 0 else ""
            out.append(f'<div class="l">{num}{inline(line)}</div>')
        out.append("</div>")
    if pending:
        out.append(f'<div class="st"><div class="l"><em>[przekład w przygotowaniu: pozostałe akapity ({pending})]</em></div></div>')
    out.append("</div>")
    return "\n".join(out)


def verse_count(stz):
    n = 0
    for st in stz:
        for line in st:
            at = re.match(r"^@(\d+)$", line)
            if at:
                n = int(at.group(1)) - 1
            elif not line.startswith("# "):
                n += 1
    return n


# --- ilustracje ----------------------------------------------------------------
IMG = os.path.join(ROOT, "ilustracje")
img_meta = {r[0]: {"gdzie": r[1], "podpis": r[2], "zrodlo": r[3], "licencja": r[4]} for r in table_rows(os.path.join(IMG, "zrodla.md")) if len(r) >= 5}


def find_image(base):
    if not exists(IMG):
        return None
    for f in sorted(os.listdir(IMG)):
        if re.match(rf"^{re.escape(base)}(-[^.]*)?\.(jpe?g|png)$", f, re.I):
            return f
    return None


def small_image(f, tmp):
    """Kopia ilustracji zmniejszona dla czytnika (JPEG, dłuższy bok MAX_PX)."""
    dst = os.path.join(tmp, "img", os.path.splitext(f)[0] + ".jpg")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(os.path.join(IMG, f))
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, "white")
        bg.paste(im, mask=im.split()[-1])
        im = bg
    im = im.convert("RGB")
    im.thumbnail((MAX_PX, MAX_PX), Image.LANCZOS)
    im.save(dst, quality=82, optimize=True, progressive=True)
    return dst


def figure(f, tmp, cls="fig"):
    src = small_image(f, tmp)
    m = img_meta.get(f)
    cap = inline(m["podpis"]) if m and m["podpis"] else f'<span class="mark">[brak wpisu dla {html.escape(f)} w ilustracje/zrodla.md]</span>'
    alt = html.escape(re.sub(r"[*\[\]]", "", m["podpis"]) if m else f, quote=True)
    return f'<figure class="{cls}"><img src="{src}" alt="{alt}" /><figcaption>{cap}</figcaption></figure>'


# --- okładka -------------------------------------------------------------------
def cover(tmp, export_label):
    W, H = 1600, 2400
    c = Image.new("RGB", (W, H), (28, 24, 20))
    f = find_image("rozdzial-I")
    if f:
        im = Image.open(os.path.join(IMG, f)).convert("RGB")
        im.thumbnail((W - 160, 1300), Image.LANCZOS)
        c.paste(im, ((W - im.width) // 2, 760))
    d = ImageDraw.Draw(c)
    fonts = os.environ.get("EPUB_FONTS", "")
    def font(name, size):
        for p in [os.path.join(fonts, name), os.path.expanduser(f"~/.fonts/static/{name}")]:
            if p and exists(p):
                return ImageFont.truetype(p, size)
        return ImageFont.load_default(size)
    gold = (214, 196, 160)
    def center(y, text, fnt, fill=gold):
        w = d.textlength(text, font=fnt)
        d.text(((W - w) / 2, y), text, font=fnt, fill=fill)
    center(250, "Angielska poezja cmentarna", font("CormorantGaramond-Regular.ttf", 112))
    center(420, "Antologia dwujęzyczna", font("CormorantGaramond-Italic.ttf", 72))
    center(560, "wersja robocza", font("EBGaramond-Regular.ttf", 44), (170, 155, 125))
    center(2180, f"eksport: {export_label}", font("EBGaramond-Regular.ttf", 40), (170, 155, 125))
    p = os.path.join(tmp, "okladka.jpg")
    c.save(p, quality=88)
    return p


CSS = """
@font-face { font-family: "EB Garamond"; font-style: normal; font-weight: normal; src: url("../fonts/EBGaramond-Regular.ttf"); }
@font-face { font-family: "EB Garamond"; font-style: italic; font-weight: normal; src: url("../fonts/EBGaramond-Italic.ttf"); }
@font-face { font-family: "EB Garamond"; font-style: normal; font-weight: bold; src: url("../fonts/EBGaramond-Bold.ttf"); }
body { font-family: "EB Garamond", Georgia, serif; line-height: 1.4; margin: 0 4%; }
h1, h2, h3, h4 { font-weight: normal; text-align: center; page-break-after: avoid; }
h1 { font-size: 1.7em; margin: 2.5em 0 1em; }
h2 { font-size: 1.5em; margin: 2em 0 0.8em; }
h2.rozdz { margin-top: 3em; }
h3 { font-size: 1.45em; margin: 1.6em 0 0.3em; }
h4 { font-size: 0.95em; font-variant: small-caps; letter-spacing: 0.06em; text-align: left; color: #6b5d45; margin: 1.8em 0 0.6em; }
h5 { font-size: 1em; text-align: left; margin: 1.2em 0 0.4em; }
p { margin: 0 0 0.6em; text-align: justify; }
.karta div { text-align: center; margin: 0.2em 0; }
.karta .autor { font-variant: small-caps; letter-spacing: 0.05em; }
.karta .en { font-style: italic; }
.karta .info { font-size: 0.85em; color: #6b5d45; }
.motto { margin: 1.6em 0 1.6em 30%; }
.motto p { text-align: left; margin: 0 0 0.3em; }
.motto .src { font-size: 0.8em; color: #6b5d45; }
.verse { margin: 1em 0 1em 3.4em; }
.st { margin: 0 0 0.9em; }
.l { margin: 0; padding-left: 1.2em; text-indent: -1.2em; text-align: left; }
.vh { font-variant: small-caps; font-style: italic; margin: 0.6em 0 0.3em; }
/* numer wersu na marginesie: inline-block o zerowym bilansie szerokości (−4,857 + 3,143 + 1,714 = 0) */
.n { display: inline-block; width: 3.143em; margin-left: -4.857em; margin-right: 1.714em; text-indent: 0; text-align: right; font-size: 0.7em; color: #8a7a5a; }
figure { margin: 1.5em 0; text-align: center; page-break-inside: avoid; }
figure img { max-width: 100%; max-height: 70vh; }
figcaption { font-size: 0.75em; color: #6b5d45; text-align: center; margin-top: 0.4em; }
.przyp p, .sl p { text-align: left; font-size: 0.9em; }
.sl p { margin: 0 0 0.25em; padding-left: 1.2em; text-indent: -1.2em; }
.sl .lit { font-size: 1.3em; text-align: left; color: #6b5d45; margin-top: 0.8em; }
.ref { font-size: 0.8em; color: #8a7a5a; }
.mark, mark { background-color: #fff0a0; color: inherit; }
.zr p, .zr li { font-size: 0.85em; text-align: left; overflow-wrap: break-word; word-wrap: break-word; }
.part p { text-align: center; font-style: italic; color: #6b5d45; }
"""


def main():
    export_label = os.environ.get("EKSPORT") or datetime.datetime.now().strftime("%d.%m.%Y, godz. %H:%M")
    tmp = tempfile.mkdtemp(prefix="epub-")
    chapters = {r[0]: r[1] for r in pipe_rows(os.path.join(ROOT, "rozdzialy.md")) if len(r) >= 2}
    units = []
    for d in sorted(os.listdir(os.path.join(ROOT, "utwory"))):
        D = os.path.join(ROOT, "utwory", d)
        if not re.match(r"^\d\d-", d) or not exists(os.path.join(D, "karta.md")):
            continue
        en = stanzas(os.path.join(D, "en.txt"))
        pl = stanzas(os.path.join(D, "pl.txt")) if exists(os.path.join(D, "pl.txt")) else []
        units.append({"D": D, "k": kv(os.path.join(D, "karta.md")), "en": en, "pl": pl, "pending": len(en) - len(pl), "lines": verse_count(en)})

    H = []
    H.append('<section class="part"><h1>O tej wersji</h1>')
    H.append(f"<p>Wersja robocza do lektury i korekty. Eksport: {html.escape(export_label)}.</p>")
    H.append("<p>Przekład roboczy: Claude (Anthropic); redakcja: Tomek.</p>")
    H.append('<p>Żółte wyróżnienia <span class="mark">[do weryfikacji]</span> oznaczają miejsca niepewne.</p></section>')

    # Wprowadzenie
    intro = os.path.join(ROOT, "wprowadzenie")
    for f in sorted(glob.glob(os.path.join(intro, "[0-9][0-9]-*.md"))):
        title = (re.search(r"^# (.*)$", read(f), re.M) or [None, os.path.basename(f)])[1]
        H.append(f"<h1>{inline(title)}</h1>")
        H.append(markdown(f, skip_h1=True, hlevel=4))

    def part(label, sub, render):
        H.append(f'<h1>{label}</h1><div class="part"><p>{sub}</p></div>')
        last = None
        for u in units:
            nr = u["k"].get("rozdzial")
            if nr != last and nr in chapters:
                H.append(f'<h2 class="rozdz">{nr}. {inline(chapters[nr])}</h2>')
                if render is polish:
                    f = find_image(f"rozdzial-{nr}")
                    if f:
                        H.append(figure(f, tmp, "rozdz"))
                last = nr
            H.append(render(u))

    def polish(u):
        k, D = u["k"], u["D"]
        o = [f'<h3>{k["nr"]}. {inline(k["tytul_pl"])}</h3>', '<div class="karta">',
             f'<div class="autor">{inline(k["autor"])} ({k.get("lata", "")})</div>']
        if k.get("tytul_en") and k["tytul_en"] != k["tytul_pl"]:
            o.append(f'<div class="en">{inline(k["tytul_en"])}</div>')
        o.append(f'<div class="info">{inline(k.get("rok", ""))} · {u["lines"]} wersów · oryginał w części drugiej</div></div>')
        if exists(os.path.join(D, "motto.md")):
            m = kv(os.path.join(D, "motto.md"))
            o.append('<div class="motto">')
            o.append("<p><em>" + "<br />".join(inline(s) for s in m.get("oryginal", "").split(" / ")) + "</em></p>")
            if m.get("przeklad"):
                o.append("<p>" + "<br />".join(inline(s) for s in m["przeklad"].split(" / ")) + "</p>")
            t = f" ({inline(m['tlumacz'])})" if m.get("tlumacz") else ""
            o.append(f'<div class="src">— {inline(m.get("autor", ""))}, {inline(m.get("zrodlo", ""))}{t}</div></div>')
        o.append("<h4>Wstęp</h4>")
        o.append(markdown(os.path.join(D, "wstep.md"), hlevel=5))
        o.append("<h4>Przekład</h4>")
        o.append(verse(u["pl"], u["pending"]))
        f = find_image(str(k["nr"]).zfill(2))
        if f:
            o.append(figure(f, tmp))
        if exists(os.path.join(D, "przypisy.md")):
            o.append('<h4>Przypisy</h4><div class="przyp">')
            for row in pipe_rows(os.path.join(D, "przypisy.md")):
                w, t = row[0], "|".join(row[1:])
                label = f"w. {w}." if re.match(r"^(\d|[IVX]+\.\d)", w) else f"{w[:1].upper() + w[1:]}."
                o.append(f"<p><strong>{inline(label)}</strong> {inline(t)}</p>")
            o.append("</div>")
        return "\n".join(o)

    def english(u):
        k = u["k"]
        return "\n".join([f'<h3>{k["nr"]}. {inline(k["tytul_en"])}</h3>', '<div class="karta">',
                          f'<div class="autor">{inline(k["autor"])} ({k.get("lata", "")})</div>',
                          f'<div class="info">przekład w części pierwszej: „{inline(k["tytul_pl"])}”</div></div>', verse(u["en"])])

    part("Część pierwsza. Przekład i komentarz", "karta utworu · motto · wstęp · przekład · przypisy", polish)
    part("Część druga. The Original Poems", "teksty oryginalne w tej samej kolejności i numeracji", english)

    # Słownik
    entries = {}
    for u in units:
        p = os.path.join(u["D"], "slownik.md")
        if not exists(p):
            continue
        for row in pipe_rows(p):
            if len(row) < 3:
                continue
            w, hw, meaning = row[0], row[1], row[2]
            e = entries.setdefault(hw.lower(), {"hw": hw, "senses": {}})
            e["senses"].setdefault(meaning, []).append(f'{u["k"]["nr"]}.{w}')
    sk = lambda s: re.sub(r"^['’]", "", re.sub(r"^to ", "", s))
    H.append('<h1>Słownik dawnej angielszczyzny</h1><div class="sl">')
    H.append("<p>Trudne i dawne słowa ze wszystkich utworów części drugiej. Odsyłacz <em>6.12</em> oznacza utwór nr 6, wers 12.</p>")
    letter = ""
    for key in sorted(entries, key=lambda s: sk(s).casefold()):
        e = entries[key]
        L = sk(key)[:1].upper()
        if L != letter:
            letter = L
            H.append(f'<div class="lit">{html.escape(L)}</div>')
        senses = "; ".join(f'{inline(m)} <span class="ref">({", ".join(refs)})</span>' for m, refs in e["senses"].items())
        H.append(f"<p><strong>{inline(e['hw'])}</strong> – {senses}</p>")
    H.append("</div>")

    # Źródła
    H.append('<h1>Źródła tekstów</h1><div class="zr">')
    for u in units:
        p = os.path.join(u["D"], "zrodlo.md")
        if exists(p):
            H.append(f'<h5>{u["k"]["nr"]}. {inline(u["k"]["autor"])}, <em>{inline(u["k"]["tytul_en"])}</em></h5>')
            H.append(markdown(p, skip_h1=True, hlevel=6))
    H.append("</div>")
    if img_meta:
        H.append('<h1>Źródła ilustracji</h1><div class="zr">')
        for f, m in img_meta.items():
            H.append(f"<p><strong>{inline(m['gdzie'])}:</strong> {inline(m['podpis'])}. Źródło: {inline(m['zrodlo'])}. {inline(m['licencja'])}.</p>")
        H.append("</div>")

    src = os.path.join(tmp, "antologia.html")
    with open(src, "w", encoding="utf-8") as f:
        f.write('<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8" /><title>Angielska poezja cmentarna</title></head><body>\n')
        f.write("\n".join(H))
        f.write("\n</body></html>\n")
    css = os.path.join(tmp, "styl.css")
    with open(css, "w", encoding="utf-8") as f:
        f.write(CSS)
    meta = os.path.join(tmp, "meta.yaml")
    with open(meta, "w", encoding="utf-8") as f:
        f.write(f"""---
title:
  - type: main
    text: Angielska poezja cmentarna
  - type: subtitle
    text: "Antologia dwujęzyczna. Wersja robocza, eksport {export_label}"
creator:
  - role: trl
    text: Claude (Anthropic), przekład roboczy
  - role: edt
    text: Tomek
lang: pl-PL
date: {datetime.date.today().isoformat()}
rights: Egzemplarz prywatny. Teksty oryginalne i ilustracje w domenie publicznej.
...
""")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    cmd = ["pandoc", src, "--from=html", "--to=epub3", "-o", OUT, f"--metadata-file={meta}", f"--css={css}",
           f"--epub-cover-image={cover(tmp, export_label)}", "--split-level=3", "--toc-depth=3", f"--resource-path={tmp}:{ROOT}"]
    fonts = os.environ.get("EPUB_FONTS") or os.path.expanduser("~/.fonts/static")
    for name in ("EBGaramond-Regular.ttf", "EBGaramond-Italic.ttf", "EBGaramond-Bold.ttf"):
        if exists(os.path.join(fonts, name)):
            cmd.append(f"--epub-embed-font={os.path.join(fonts, name)}")
    subprocess.run(cmd, check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"OK: {OUT} ({os.path.getsize(OUT) / 1e6:.1f} MB, utwory: {len(units)})")


if __name__ == "__main__":
    sys.exit(main())
