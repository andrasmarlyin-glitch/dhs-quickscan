# QuickScan – 90 napos lejáratvédelem

DHS arculatú tesztváltozat, kizárólag fiktív készlettel. Közzétételi cím: https://dhs-quickscan.netlify.app/

Helyi adattárolás: nem központi, többfelhasználós raktári rendszer. A fizikai telefon kamerája külön készülékpróbát igényel.

- Lejárt: kiadás tiltva.
- 0–90 nap hátralévő idő (90. nap is): külön jóváhagyás kell.
- 91 naptól: normál kiadás.
- Lejárat napján még kiadható, külön jóváhagyással.
- Hiányzó / hibás lejárat vagy LOT: kiadás tiltva.
- Budapesti naptári napok; véglegesítéskor ismételt ellenőrzés.
- Közeli lejárat jóváhagyása: kiadó, partner, lejárat és hátralévő napok a helyi naplóban és CSV-ben.
- Ez személyes megerősítés, nem jogosultsághoz kötött vezetői engedély.

Futtatás: npm test, npm run build. A dist mappa helyi webkiszolgálóval nyitható meg. A készülék óráját használja; nem központi raktári rendszer.
