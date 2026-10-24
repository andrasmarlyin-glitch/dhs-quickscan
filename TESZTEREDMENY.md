# DHS QuickScan 0.2 – ellenőrzés

2026. október 24.

Sikeres: 6 automatikus teszt (GS1 zárójeles/FNC1, EAN, hibás kód és dátum, hónap vége, készletkorlátok, CSV escaping és képletvédelem).

Sikeres statikus build. Böngészőben ellenőrizve: GS1 termékazonosítás; GTIN/LOT/lejárat/sorozatszám megjelenítés; 2 darabos saleses kivétel Teszt Elek / Demo rendelő adatokkal; szimulált értesítés; napló megmaradása újratöltés után; CSV fájl tényleges letöltése és tartalmának ellenőrzése. A service worker Offline használatra kész állapotba jutott.

Nem ellenőrzött: fizikai iPhone/Android kamera, valódi Data Matrix optikai felismerés, főképernyős telepítés és hálózat nélküli futtatás.

GitHub repository létrejött: https://github.com/andrasmarlyin-glitch/dhs-quickscan
A telepítés böngészős GitHub feltöltéssel készül. A korábbi integrációs 403 hiba miatt a közvetlen GitHub felületet használjuk.

Nincs éles DHS-adat, központi adatbázis vagy valódi e-mail-küldés.
