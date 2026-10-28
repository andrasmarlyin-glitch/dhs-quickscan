# DHS QuickScan 1.1 – Raktári kivitel

Cél: a raktáros távollétében a saleses több terméket olvas be, majd egy közös kivitelben a saját nevéhez és a célkórházhoz rendeli őket. Nincs készletfelvitel, készlethelyesbítés vagy készletcsökkentés.

A kivitel piszkozata és a véglegesített kivitelek helyben mentődnek. Véglegesítés előtt minden tétel lejárata újra ellenőrzött. Lejárt nem vihető ki, 0–90 napnál külön megerősítés kell.

Napló: kivitelazonosító, dátum, saleses, kórház, megjegyzés és minden termék GTIN/LOT/lejárat/sorozatszám/darabszám/nyers kód. Egy kivitel vagy az összes kivitel CSV-ben exportálható; telefonon támogatott natív fájlmegosztás. E-mail automatikusan nem megy ki.

A korábbi adatok megmaradnak, a régi készletadatokat a működés nem használja. Teljes JSON-mentés külön elérhető. A böngészőadat-törlés helyi adatvesztést okozhat. Nincs hitelesített szerepkör vagy központi szinkron.

Kamerás teljes GS1-kódnál a tétel automatikusan hozzáadódik; egyébként a hiányzó LOT/lejárat kézzel pótolható. Azonos sorozatszám duplázása tiltott. Nem értelmezhető QR/GS1-kód megőrződik a beolvasási naplóban, de nem véglegesíthető termékként.

Közzététel: https://dhs-quickscan.netlify.app/
Ellenőrzés: npm test && npm run build. Fizikai telefon kamerája külön helyszíni próbát igényel.
