# Automatikus Gmail-küldés – 1.2

Feladó: andras.marlyin@gmail.com
Címzett: mr.marlyin@gmail.com

Az 1.2 változat helyi mentés után kezdeményez küldést, szöveges összesítővel és CSV-melléklettel. A feladó és címzett szerveroldalon rögzített. A telefon megkapja a Gmail által visszaadott üzenetazonosítót; csak ekkor jelenik meg az elküldve állapot.

## Bekapcsolás feltételei

1. Google Cloud-projekt és Gmail API engedélyezése.
2. Saját OAuth-kliens létrehozása, kizárólag gmail.send jogosultsággal.
3. Az andras.marlyin@gmail.com fiók felhasználói engedélye és offline hozzáférése. Tesztelési állapotú OAuth-alkalmazásnál a Google korlátozhatja a token érvényességét; a tartós üzem előtt az alkalmazás állapotát ellenőrizni kell.
4. A szerver titkos környezeti beállításai: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, DHS_DEVICE_KEY. Egyik sem kerülhet a nyilvános repositoryba vagy a közzétett böngészőkódba.
5. A céges telefon egyszeri párosítása a DHS_DEVICE_KEY értékével. A telefon kulcsa külön helyi tárhelyen van, a teljes kivitelmentés nem exportálja.
6. Küldési próba és beérkezés ellenőrzése a megadott címzettnél, csak ezután bekapcsolás.

## Állapotok

Offline: küldésre vár, az app online állapotában újra próbálja.
Hiányzó Gmail-beállítás: nem küld, hiba látszik.
Bizonytalan hálózati eredmény a Gmail-kérés után: ellenőrizendő állapot, automatikus újraküldés nélkül, hogy ne duplázzon.
A sikeres API-válasz a Gmail általi átvételt igazolja, a címzett postaládájába érkezést külön ellenőrizzük.

Google dokumentáció: https://developers.google.com/workspace/gmail/api/auth/web-server

Jelenlegi állapot (2026-10-28): közzétéve a Netlify-on. Gmail send engedély megadva, négy titkos szerverbeállítás mentve. Éles alkalmazásból mesterséges tesztkivitel elküldve; Gmail sikeres visszaigazolása az app Naplójában látszik. Kivitelazonosító: 73651d4a-d26d-4acf-b18b-50132896660e. A címzett postaládájában a beérkezést a tulajdonosnak még ellenőriznie kell.

Google OAuth státusz: Testing. A Publish app gomb letiltva maradt, a Branding konfiguráció befejezését kéri a mentett név, kapcsolattartó, kezdőlap és domain mellett is. A gmail.send hatókör deklarálva és mentve. Emiatt a jelenlegi engedély hét nap után lejár; a tartós működés NINCS lezárva. A hétfői teszt előtt működik a kapcsolat, amennyiben nem vonják vissza, de ezt küldési próbával kell ellenőrizni. Nem szabad végleges, karbantartásmentes megoldásként átadni.

Telefon párosítása: a külön, privát quickscan-telefon-parositas.png képet a telefonon futó app Beolvasás kamerájával kell beolvasni, majd a párosítást jóváhagyni. A QR-kép nem része a nyilvános repositorynak vagy weboldalnak. A kép birtokosa a rögzített címzettnek küldhet, ezért bizalmasan kezelendő.

25 automatizált ellenőrzés és a build sikeres. A böngészőben az éles összegyűjtés → véglegesítés → szerver → Gmail folyamat sikeres. Telefonon a kamera és a párosítás a tulajdonos ellenőrzésére vár.
