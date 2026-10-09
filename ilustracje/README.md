# Ilustracje: jak dodawać

## 1. Nazwa pliku
Plik trafia do tego folderu. Nazwa mówi, gdzie obraz stoi w książce:

| Nazwa | Miejsce |
|---|---|
| `rozdzial-I.jpg` … `rozdzial-IX.jpg` | otwarcie rozdziału (strona przed tytułem rozdziału) |
| `NN-nazwisko.jpg`, np. `09-blair.jpg` | ilustracja do utworu nr NN (numer zawsze dwucyfrowy) |
| `okladka.jpg` | okładka (nie trafia do pliku Word) |

- Małe litery, bez polskich znaków i spacji. Tylko `.jpg` albo `.png`.
- Ilustracja do utworu stoi na końcu utworu. Jeśli pole `ilustracja` w `karta.md` utworu zawiera słowo „frontispis” (dziś: nr 8 i 9), obraz idzie przed kartą utworu.

## 2. Parametry
- JPG (jakość 90+) dla obrazów, PNG dla rycin, jeśli skan jest w PNG.
- Rozdzielczość: co najmniej 300 dpi w rozmiarze druku.
  - Cała strona A5 ze spadem: 1819 × 2551 px.
  - Obraz poziomy na całą szerokość strony: co najmniej 1820 px szerokości.
- Zapisuj w kolorze, jeśli taki jest oryginał. Decyzja o druku czarno-białym (instrukcja §7.4) jest jeszcze otwarta.
- Plik do ok. 10 MB.

## 3. Wpis w `zrodla.md`
Dodaj jeden wiersz tabeli, kopiując wzór z pierwszego wiersza:

```
| rozdzial-I.jpg | Rozdział I, otwarcie | Caspar David Friedrich, *Opactwo w dębowym lesie* (*Abtei im Eichwald*), 1809–1810, Alte Nationalgalerie, Berlin | https://www.wikiart.org/en/caspar-david-friedrich/the-abbey-in-the-oakwood | domena publiczna (C. D. Friedrich zm. 1840) | 2576 × 1651 px, kolor |
```

Kolumny:
- plik,
- gdzie w książce,
- podpis: autor, *tytuł polski* (tytuł oryginalny), rok, muzeum lub wydanie,
- źródło: URL strony, z której pobrano plik,
- licencja,
- uwagi: wymiary w px, kolor czy cz.-b.

## 4. Co dalej
Po pushu build sam wstawia obraz w miejsce pergaminowej ramki i drukuje podpis pod nim. Jeśli brakuje wpisu w `zrodla.md`, pod obrazem pojawi się żółte ostrzeżenie. Obraz otwierający rozdział pojawia się, gdy w rozdziale jest już co najmniej jeden przełożony utwór.

## 5. Prawa
Tylko domena publiczna: autor zmarł ponad 70 lat temu, a plik jest wierną reprodukcją (zdjęcie lub skan obrazu, ryciny).

Najlepsze źródło to Wikimedia Commons: pełna rozdzielczość i opis licencji na stronie pliku. Wiele obrazów Friedricha ma tam wersje z Google Art Project. WikiArt bywa w niższej rozdzielczości.

## Lista miejsc
| Plik | Miejsce | Propozycja | Stan |
|---|---|---|---|
| `rozdzial-I.jpg` | I. Prolog | Friedrich, *Opactwo w dębowym lesie* (1809–10) | ✓ |
| `rozdzial-II.jpg` | II. Ojcowie założyciele | Friedrich, *Mnich nad morzem* (1808–10) | – |
| `rozdzial-III.jpg` | III. Gray | R. Bentley, *Designs… for Six Poems by Mr. T. Gray* (1753) albo akwarela Blake'a do Graya | – |
| `rozdzial-IV.jpg` | IV. Noc i melancholia | Friedrich, *Dwaj mężczyźni kontemplujący księżyc* (1819–20) | – |
| `rozdzial-V.jpg` | V. Samotność i natura | Friedrich, *Zimowy pejzaż z kościołem* (1811) | – |
| `rozdzial-VI.jpg` | VI. Ruiny | Friedrich, *Ruiny Eldeny* (wersja do wyboru) | – |
| `rozdzial-VII.jpg` | VII. Groby | Friedrich, *Cmentarz klasztorny w śniegu* albo *Brama cmentarna* (1825) | – |
| `rozdzial-VIII.jpg` | VIII. Ballady o zmarłych | Friedrich, *Dolmen w śniegu* (1807) | – |
| `rozdzial-IX.jpg` | IX. Pożegnania | Friedrich, *Etapy życia* (1835) | – |
| `01-milton.jpg` | nr 1, Il Penseroso | W. Blake, akwarele do *L'Allegro* i *Il Penseroso* (ok. 1816–20) | – |
| `07-parnell.jpg` | nr 7, The Hermit | drzeworyty T. i J. Bewicków, *Poems by Goldsmith and Parnell* (1795) | – |
| `08-young.jpg` | nr 8, frontispis | W. Blake, ryciny do *Night Thoughts* (wyd. Edwards, 1797) | – |
| `09-blair.jpg` | nr 9, frontispis | L. Schiavonetti wg W. Blake'a, *The Grave* (1808), np. *Death's Door* | – |
| `11-gray.jpg` | nr 11, Hymn do Niedoli | R. Bentley, rycina do *Hymn to Adversity* (1753) | – |
| `12-gray.jpg` | nr 12, Oda o Eton | R. Bentley, rycina do Ody (1753) albo XVIII-wieczny widok Eton | – |
| `13-gray.jpg` | nr 13, Elegia (frontispis) | R. Bentley, rycina do *Elegy* (1753) | – |
| `okladka.jpg` | okładka | do decyzji: *Opactwo* jest już w rozdz. I, więc np. Blake, *The Grave* | – |

Winiety SVG do nr 2–6 zrobi Claude, te pomiń.
