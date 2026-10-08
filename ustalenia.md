# Ustalenia: zmiany względem instrukcji projektu

Decyzje Tomka zmieniające instrukcję projektu. Najnowsze na górze. Gdy instrukcja i ten plik się różnią, obowiązuje ten plik.

## 2026-10-08

1. **Repozytorium jedynym źródłem prawdy.** Pliki książki są tylko w `BartekRu/Poezja-cmentarna`. Dokumenty projektu na claude.ai nie przechowują kopii.
2. **Dwie części zamiast układu en face** (zastępuje „Układ en face” z §2 i §8):
   - **Część pierwsza, polska:** karta utworu, motto, wstęp, przekład, przypisy; bez oryginału.
   - **Część druga, angielska:** oryginały w tej samej kolejności, numeracji utworów i numeracji wersów.
   - Zasada „wers w wers” zostaje, żeby numery wersów i przypisy działały w obu częściach.
3. **Glosy → słownik** (zastępuje „Glosy przy tekście angielskim” z §6.3): na końcu tomu „Słownik dawnej angielszczyzny” z trudnymi i dawnymi słowami ze wszystkich utworów, alfabetycznie, z odsyłaczami `nr utworu.wers`. Źródłem są pliki `utwory/*/slownik.md`; build łączy je i sortuje.
4. **Build w GitHub Actions.** Każdy push na `main` buduje `antologia-robocza.docx` i publikuje go w wydaniu „robocza”. Plik .docx nie jest wersjonowany w repo.
5. **Korekta poz. 6** (Parnell): ogólna akceptacja stylu przekładu i szablonu opracowania.

## Proponowany układ tomu
1. Część pierwsza: Od tłumacza, Wstęp, rozdziały I–IX (przekład z komentarzem), aneks „Polska recepcja”, noty o autorach.
2. Część druga: oryginały, rozdziały I–IX.
3. Słownik dawnej angielszczyzny.
4. Indeks pierwszych wersów (EN i PL), źródła tekstów i ilustracji, kolofon.
