# Penge Trick

Penge Trick er en mobil webapp til et simpelt pengetrick: appen viser et billede af din egen hjemmeskærm, mens en foldet seddel eller mønt kan trækkes ud af skærmen. Effekten virker bedst, når appen er installeret på hjemmeskærmen og kører som fuldskærms-webapp.

Appen kan bruges direkte her:

[penge-trick.vercel.app](https://penge-trick.vercel.app)

## Funktioner

- Vælg et screenshot af din egen hjemmeskærm som baggrund.
- Vælg mellem flere sedler og mønter.
- Juster størrelse, rotation, baggrundsplacering og hvilken kant sedlen skal trækkes ud fra.
- Brug skjulte kontroller til indstillinger og nulstilling.
- Slå tilt til, hvis du vil styre effekten med telefonens bevægelse.

## Sådan installerer du appen på iPhone

1. Åbn Safari, gå til [penge-trick.vercel.app](https://penge-trick.vercel.app), og tryk på menuen nederst i browseren.

   ![Safari-menu](docs/guide/attachments/15FA9664-1BC5-425C-AA7C-D2038C7BAC08.png)

2. Tryk på **Del**.

   ![Del-menu](docs/guide/attachments/49788B87-286F-46C0-8E0C-FFE87E924DFB.png)

3. Tryk på **Se mere**, hvis du ikke med det samme kan se muligheden for at føje appen til hjemmeskærmen.

   ![Se mere](docs/guide/attachments/9A5DA0C7-539F-49CE-AFC1-0CF6A9362974.png)

4. Scroll ned, og vælg **Føj til hjemmeskærm**.

   ![Føj til hjemmeskærm](docs/guide/attachments/8E5FC196-BEB0-49BE-BEE3-EBE0E0CD6772.png)

5. Tjek, at **Åbn som webapp** er slået til, og tryk derefter på **Tilføj**.

   ![Åbn som webapp](docs/guide/attachments/A3A13B8B-8213-45D4-B059-04280C2BB171.png)

## Klargør dit hjemmeskærms-billede

1. Gå til din hjemmeskærm, og tag et screenshot.

   ![Hjemmeskærm](docs/guide/attachments/C9D03E9F-EB70-4DF9-B563-19673078228C.png)

2. Åbn screenshottet i Fotos, og tryk på **Rediger**.

   Hvis du har en iPhone med Apple Intelligence, kan du bruge **Visk ud** til at fjerne klokkeslættet og statuslinjen i toppen.

   ![Rediger billede](docs/guide/attachments/61979959-69C7-45AC-9166-56A449C8076D.png)

3. Marker toppen af billedet som vist. Det fjerner klokkeslættet og statuslinjen, så de ikke ligger oven i den rigtige tid, når appen bruges.

   ![Fjern statuslinje](docs/guide/attachments/238BB5D7-1085-4987-923E-459D9134AD17.png)

4. Tryk på **OK**, og gem billedet.

   ![Gem redigering](docs/guide/attachments/5C21B3B0-BB6E-4AD9-BCFF-46DA44CA6A9E.png)

## Sådan bruger du tricket

1. Åbn Penge Trick fra hjemmeskærmen.

   ![Penge Trick app](docs/guide/attachments/0A27C53C-069A-49A8-AA75-C0E6235A5F53.png)

2. Tryk på **Vælg foto af hjemmeskærm**, og vælg det redigerede screenshot.

   ![Vælg foto](docs/guide/attachments/B62B8F58-8D0B-4F8B-B354-B37E6B3E981C.png)

3. Når billedet er valgt, skal appen ligne din normale hjemmeskærm.

   ![Hjemmeskærm i appen](docs/guide/attachments/0D91B6D6-CEA0-4AAD-8165-0FCAD0847A9D.png)

4. Tryk i øverste højre hjørne for at vise de skjulte kontroller. Her kan du åbne indstillinger eller nulstille sedlen, så den kommer tilbage.

   ![Skjulte kontroller](docs/guide/attachments/DB930521-EDB9-4F9D-B06C-C0CBA3C3C7A0.png)

5. I indstillinger kan du vælge seddel eller mønt, hvilken side den skal trækkes ud fra, størrelse på sedlen og justering af baggrunden.

   ![Indstillinger](docs/guide/attachments/7261D389-408C-4611-A6D3-E0B3C2B5CA95.png)

   ![Valg af seddel](docs/guide/attachments/6AECD912-92C2-4117-906B-20523817BF90.png)

6. Tilt kan slås til, hvis du vil eksperimentere med bevægelsesstyring. Du skal acceptere tilladelsen i popuppen, før funktionen virker.

   ![Tilt-indstilling](docs/guide/attachments/0B777113-9408-42DA-BAC0-A2E9A9FDC2ED.png)

7. Læg den rigtige seddel bag telefonen. Hold telefonen og sedlen, så du kan trække den rigtige seddel ud samtidig med, at du trækker sedlen på skærmen mod den valgte kant.

   ![Udfør tricket](docs/guide/attachments/24701535-1635-4141-A937-2754C63205AF.png)

## Udvikling lokalt

Projektet er en statisk webapp uden build-step. Start den lokale server med:

```bash
node dev-server.js
```

Serveren kører som standard på:

```text
http://127.0.0.1:4173/
```

Hvis porten skal ændres, kan du sætte `PORT` før serveren startes.
