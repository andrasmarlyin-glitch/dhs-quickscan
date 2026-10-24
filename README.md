# DHS QuickScan 0.2
Magyar, mobilos, statikus PWA prototípus. Kizárólag kitalált tesztadatok; nincs DHS-kapcsolat, központi adatbázis, valódi bejelentkezés, e-mail vagy push küldés.

## Használat
HTTPS-ről Safari/Chrome böngészőben nyisd meg. Kamera indítása után engedélyezd a hátsó kamerát. GS1 Data Matrix, EAN és Code 128 olvasás ZXing Browser 0.2.0 könyvtárral. Kézi beviteli tartalék és két tesztkód is rendelkezésre áll.

Támogatott GS1 alkalmazásazonosítók: 01 (14 jegyű GTIN), 17 (ÉÉHHNN lejárat, 00 = hónap vége), 10 (LOT), 21 (sorozatszám). Zárójeles és nyers, GS elválasztós formátum. Más mezőket szándékosan visszautasít. A kézi GTIN nem végez ellenőrzőszám-validálást. A tesztkatalógus nem teljes GS1 adatbázis.

Saleses kivételhez név, partner, pozitív egész mennyiség és megerősítés szükséges. Túlkivétel és lejárt tétel tiltott. A készlet és a napló egy helyi localStorage mentésben frissül. A CSV pontosvesszős, UTF-8 BOM-mal, képletinjekció elleni előtaggal. Valós személyes adatokat ne használj.

Első online megnyitás után a service worker gyorsítótárazza az alkalmazást és a helyi kameraolvasó könyvtárát. Az offline kész jelzés után a kézi folyamat hálózat nélkül is használható. Privát böngészésben és tárhelykorlátozásnál a mentés sikertelen lehet, erről hibaüzenet jelenik meg. Böngészőadat-törlés elveszíti a tesztnaplót.

## Fejlesztés és GitHub Pages
Node.js 20+ szükséges, külső npm telepítés nélkül:
```
npm test
npm run build
```
A build a `dist` könyvtárba másolja az alkalmazást. GitHub Pages a main ág gyökérkönyvtárát is közvetlenül publikálhatja: minden futásidejű fájl ott is megtalálható, relatív URL-ekkel. `.nojekyll` kikapcsolja a Jekyll feldolgozást.

## Ellenőrzés
A feldolgozó, dátumok, készletkorlátok és CSV automatikus tesztjei a tests könyvtárban. A valódi kamera, engedélykérés és a főképernyős telepítés fizikai iPhone/Android készüléken külön ellenőrzendő; az asztali ellenőrzés ezeket nem igazolja.

## Külső komponens
ZXing Browser 0.2.0, MIT licenc. A helyi UMD csomag forrása: https://unpkg.com/@zxing/browser@0.2.0/umd/zxing-browser.min.js . A könyvtár és függőségei szerzői jogi közleményei a csomagban és a THIRD-PARTY-NOTICES.md fájlban.
