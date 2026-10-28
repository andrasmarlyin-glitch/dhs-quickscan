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

Google OAuth státusz: In production (2026-10-28). A hiányzó privacy.html és terms.html oldalak elkészültek, a tulajdonos jóváhagyásával közzétéve, címük a Google Branding beállításaiba mentve. Ezután elérhetővé vált a Publish app; a tulajdonos külön engedélyével élesítve. Az új Gmail send engedély már ebben az állapotban lett kiadva, és az új refresh token a Netlify védett Production beállításába mentve. Az OAuth-válaszban refresh_token_expires_in nem szerepelt. Új kliens-titok is beállítva; a telefonpárosító kulcs változatlan. A tesztállapot hét napos lejárata így nem vonatkozik az új engedélyre, de a Google más okokból visszavonhatja/érvénytelenítheti a hozzáférést. Teljes Google-alkalmazásellenőrzés nem történt: az újraengedélyezésnél az ellenőrizetlen alkalmazás figyelmeztetése megmaradhat, saját fiókos használatban.

Telefon párosítása: a külön, privát quickscan-telefon-parositas.png képet a telefonon futó app Beolvasás kamerájával kell beolvasni, majd a párosítást jóváhagyni. A QR-kép nem része a nyilvános repositorynak vagy weboldalnak. A kép birtokosa a rögzített címzettnek küldhet, ezért bizalmasan kezelendő.

25 automatizált ellenőrzés és a build sikeres. A böngészőben az éles összegyűjtés → véglegesítés → szerver → Gmail folyamat sikeres. A telefon párosítását a tulajdonos késznek jelezte. Az éles állapotban frissített engedéllyel végzett új alkalmazáson belüli teszt (2026-10-28 21:36 Europe/Budapest), 8d351538-a6db-464c-9e24-ad0c49d7637b kivitelazonosítóval sikeres: a Gmail átvette az üzenetet. A címzett postaládájába érkezést ez nem igazolja. A szerverfrissítés sikeres kiadása: 6ae25c9ec82d06526e9f7be6.
