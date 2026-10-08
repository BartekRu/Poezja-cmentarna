# Poezja cmentarna

Dwujęzyczna antologia angielskiej poezji cmentarnej XVIII wieku (Graveyard School) z prekursorami: oryginał angielski i polski przekład roboczy en face. Egzemplarz prywatny, nie do sprzedaży.

Przekład roboczy: Claude (Anthropic); redakcja: Tomek.

## Struktura

```
utwory/NN-autor-tytul/
  karta.md      karta utworu (autor, lata, tytuły, rok, rozdział, żywa pagina, ilustracja)
  en.txt        tekst angielski; pusta linia = nowy akapit wierszowy
  pl.txt        przekład wers w wers; ta sama liczba wersów i akapitów co en.txt
  motto.md      motto: oryginał, przekład, źródło
  wstep.md      wstęp (markdown)
  glosy.md      glosy do tekstu EN: `wers | słowo | znaczenie`
  przypisy.md   przypisy: `wers | treść`
  zrodlo.md     wydanie bazowe, zasady edycji, bibliografia
rozdzialy.md    rozdziały: `nr | tytuł | ilustracja otwierająca`
glosariusz.md   stałe odpowiedniki EN → PL
status.md       postęp prac i otwarte sprawy
build/          skrypt budujący wersję roboczą .docx
wyjscie/        wynik buildu
```

## Build wersji roboczej (Word)

```
npm install
npm run build
```

Wynik: `wyjscie/antologia-robocza.docx`. Skrypt przerywa build, jeśli `en.txt` i `pl.txt` mają różny podział na akapity. Pliku .docx nie edytuj ręcznie: źródłem prawdy są pliki tekstowe.

Docelowy skład do druku (A5, Typst) powstanie później.

## Korekta

Uwagi do przekładu najlepiej podawać po numerach wersów, np. `06, w. 23: …`. Fragmenty niepewne są w plikach oznaczone `[do weryfikacji]`, a w Wordzie wyróżnione na żółto.
