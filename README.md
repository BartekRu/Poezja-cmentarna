# Poezja cmentarna

Dwujęzyczna antologia angielskiej poezji cmentarnej XVIII wieku (Graveyard School) z prekursorami. Część pierwsza: polski przekład roboczy z komentarzem. Część druga: oryginały angielskie w tej samej numeracji. Na końcu słownik dawnej angielszczyzny. Egzemplarz prywatny, nie do sprzedaży.

Decyzje zmieniające instrukcję projektu: [`ustalenia.md`](ustalenia.md).

Przekład roboczy: Claude (Anthropic); redakcja: Tomek.

## Struktura

```
wprowadzenie/   Od tłumacza, Wstęp (markdown; początek części pierwszej)
utwory/NN-autor-tytul/
  karta.md      karta utworu (autor, lata, tytuły, rok, rozdział, żywa pagina, ilustracja)
  en.txt        tekst angielski; pusta linia = nowy akapit wierszowy
  pl.txt        przekład wers w wers; ta sama liczba wersów i akapitów co en.txt
  motto.md      motto: oryginał, przekład, źródło
  wstep.md      wstęp (markdown)
  slownik.md    hasła do słownika dawnej angielszczyzny: `wers | hasło | znaczenie`
  przypisy.md   przypisy: `wers | treść`
  zrodlo.md     wydanie bazowe, zasady edycji, bibliografia
rozdzialy.md    rozdziały: `nr | tytuł | ilustracja otwierająca`
glosariusz.md   stałe odpowiedniki EN → PL
status.md       postęp prac i otwarte sprawy
ustalenia.md    decyzje zmieniające instrukcję projektu
ilustracje/     obrazy (rozdzial-I.jpg, 09-blair.jpg …) i zrodla.md; zasady w ilustracje/README.md
materialy/      surowe teksty źródłowe przed opracowaniem (nie trafiają do buildu)
build/          skrypt budujący wersję roboczą .docx
.github/        GitHub Action: build przy każdym pushu
```

## Wersja robocza (Word)

Każdy push na `main` buduje plik automatycznie. Najnowsza wersja do pobrania:
https://github.com/BartekRu/poezja-cmentarna/releases/download/robocza/antologia-robocza.docx

Lokalnie: `npm install`, potem `npm run build` (wynik w `wyjscie/`, poza repo). Build przerywa się, jeśli `en.txt` i `pl.txt` mają różny podział na akapity. Pliku .docx nie edytuj ręcznie: źródłem prawdy są pliki tekstowe.

Docelowy skład do druku (A5, Typst) powstanie później.

## Korekta

Uwagi do przekładu najlepiej podawać po numerach wersów, np. `06, w. 23: …`. Fragmenty niepewne są w plikach oznaczone `[do weryfikacji]`, a w Wordzie wyróżnione na żółto.
