# Ilustracje: jak dodawać

## 1. Nazwa pliku
Plik trafia do tego folderu. Nazwa mówi, gdzie obraz stoi w książce:

| Nazwa | Miejsce |
|---|---|
| `rozdzial-I.jpg` … `rozdzial-IX.jpg` | otwarcie rozdziału (strona przed tytułem rozdziału) |
| `NN-nazwisko.jpg`, np. `09-blair.jpg` | ilustracja do utworu nr NN (numer zawsze dwucyfrowy) |
| `okladka.jpg` | okładka (nie trafia do pliku Word) |

- Małe litery, bez polskich znaków i spacji. Tylko `.jpg` albo `.png`.
- Ilustracja do utworu stoi zaraz pod przekładem wiersza (przed przypisami). Gdy na stronie brak miejsca, Word przenosi ją na następną stronę, a przypisy płyną dalej. Żaden obraz nie zajmuje osobnej strony.
- Obraz otwierający rozdział stoi pod tytułem rozdziału, na tej samej stronie.

## 2. Parametry
- JPG (jakość 90+) dla obrazów, PNG dla rycin, jeśli skan jest w PNG.
- Rozdzielczość: co najmniej 1500 px na dłuższym boku (≥ 300 dpi pod wierszem na stronie A5); najlepiej 2500–3000 px. Pliki większe niż 3000 px Claude zmniejsza do 3000 px.
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
Stan na 2026-10-09. Szczegóły i ocena jakości każdego pliku: `zrodla.md`.

| Plik | Miejsce | Obraz | Stan |
|---|---|---|---|
| `rozdzial-I.jpg` | I. Prolog | Friedrich, *Opactwo w dębowym lesie* | ✓ |
| `rozdzial-II.jpg` | II. Ojcowie założyciele | Friedrich, *Cmentarz w śniegu* | za mała |
| `rozdzial-III.jpg` | III. Gray | Leypold, *Mgła nad rosyjskim cmentarzem* | za mała |
| `rozdzial-IV.jpg` … `rozdzial-IX.jpg` | IV–IX | propozycje w `rozdzialy.md` | – |
| `01-milton.jpg` | nr 1 | Cole, *Il Penseroso* | za mała |
| `02-watts.jpg` | nr 2 | H. Robert, *La Promenade solitaire* | za mała |
| `03-finch.jpg` | nr 3 | Loutherbourg, *Filozof na cmentarzu* | ✓ |
| `04-pope.jpg` | nr 4 | Friedrich, *Krzyż w górach* | ✓ |
| `05-pope.jpg` | nr 5 | Hesselbom, *Wigilia na cmentarzu* | za mała |
| `06-parnell.jpg` | nr 6 | Vedder, *The End of a Misspent Life* | za mała |
| `07-parnell.jpg` | nr 7 | Mistrz flamandzki, *Droga do Emaus* | ✓ |
| `08-young.jpg` | nr 8 | Friedrich, *Spacer o zmierzchu* | ✓ |
| `09-blair.jpg` | nr 9 | Knab, *Elegia* | za mała |
| `10-gray.jpg` … `43-….jpg` | nr 10–43 | – | – |
| `okladka.jpg` | okładka | do decyzji | – |
