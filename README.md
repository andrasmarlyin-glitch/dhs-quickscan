# DHS QuickScan 1.0

Saját vonalkódok és QR-kódok kamerás, képfájlos és kézi beolvasása. Nincs előre feltöltött demótermék vagy fiktív készlet.

- Minden sikeres dekódolás nyers tartalma és feldolgozási eredménye helyi naplóba kerül.
- GS1/GTIN: új terméknév megadása; LOT és lejárat a kódból, hiány esetén a csomagolásról.
- Tényleges készlet rögzítése termék + LOT + lejárat szerint, naplózott helyesbítésekkel.
- Kiadás kötelező kiadóval és partnerrel, mennyiség- és készletellenőrzéssel.
- Lejárt: tiltva; 0–90 nap: külön megerősítés; a lejárat napján még kiadható külön megerősítéssel.
- Készletnézet, CSV és teljes JSON-mentés letöltése.
- Nincs központi szinkron, hitelesített felhasználókezelés vagy más raktári rendszerbe írás. A napló nem megváltoztathatatlan szerveroldali auditnapló.
- A böngészőadatok törlésével az adatok elveszhetnek: mentés szükséges. A korábbi demóadatokat külön kulcs alatt érintetlenül hagyja, az új adatbázis üresen indul.
- A termékadatok és beolvasások nem kerülnek a nyilvános repositoryba vagy szerverre.
- Tetszőleges QR-szöveget és URL-t megőriz, de nem nyit meg automatikusan. Nem értelmezhető GS1-adatból nem enged kiadást.

Közzététel: https://dhs-quickscan.netlify.app/

Ellenőrzés: npm test && npm run build. A fizikai iPhone kamerás teljesítményét a helyszínen kell kipróbálni; sérült vagy homályos kódok olvasása nem garantálható.
