# Weekly Data Update - Anleitung

Dieses System führt automatisch jeden Montag die Datenaktualisierung für DroneMaps durch.

## 📋 Was macht das Script?

Das Script `weekly-update.js` führt folgende Schritte aus:

1. **BAZL Data Retriever ausführen** - Holt aktuelle Schweizer Flugbeschränkungen
2. **DJI Data Retriever ausführen** - Holt DJI Hersteller No-Fly-Zones
3. **Benutzerbestätigung** - Fragt ob Daten auf GitHub hochgeladen werden sollen
4. **Dateien kopieren & umbenennen**:
   - `BAZLdata_DD-MM-YYYY.json` → `FlightObstacleData/unifiedFlightObstacles.json`
   - `DJI-NoFlyZones_DD-MM-YYYY.json` → `FlightObstacleData/manufacturerFlightObstacles.json`
5. **Git Commit & Push** - Lädt die neuen Daten auf GitHub hoch

## 🚀 Manuelles Ausführen

Sie können das Script jederzeit manuell ausführen:

```bash
cd Code
node weekly-update.js
```

## ⏰ Automatische wöchentliche Ausführung einrichten

### Option 1: Windows Task Scheduler (Empfohlen für Windows)

1. **Task Scheduler öffnen**:
   - Windows-Taste drücken
   - "Task Scheduler" oder "Aufgabenplanung" eingeben und öffnen

2. **Task importieren**:
   - Im Task Scheduler: Rechtsklick auf "Task Scheduler Library"
   - "Import Task..." auswählen
   - Die Datei `weekly-update-task.xml` auswählen
   - Auf "OK" klicken

3. **Task konfigurieren** (falls nötig anpassen):
   - Zeitplan: Jeden Montag um 9:00 Uhr
   - Aktion: Führt `node weekly-update.js` aus
   - Bedingungen: Läuft nur wenn Netzwerk verfügbar ist

4. **Testen**:
   - Rechtsklick auf den Task "DroneMaps\WeeklyDataUpdate"
   - "Run" auswählen

### Option 2: Manuelle Erinnerung

Wenn Sie lieber manuell ausführen möchten:
- Setzen Sie sich eine wöchentliche Erinnerung (z.B. jeden Montag)
- Führen Sie dann `node weekly-update.js` aus

## 📝 Ablauf bei automatischer Ausführung

1. **Montag 9:00 Uhr**: Script startet automatisch
2. **Data Retrieval**: Beide Retriever laufen (~5-10 Minuten)
3. **Benachrichtigung**: Sie erhalten eine Eingabeaufforderung (Konsole öffnet sich)
4. **Ihre Entscheidung**:
   - `y` eingeben = Daten werden auf GitHub hochgeladen
   - `n` eingeben = Daten bleiben lokal gespeichert
5. **Abschluss**: Script zeigt Zusammenfassung und schließt sich

## ⚙️ Konfiguration anpassen

### Zeitplan ändern

Bearbeiten Sie `weekly-update-task.xml` und ändern Sie:

```xml
<CalendarTrigger>
  <StartBoundary>2025-12-22T09:00:00</StartBoundary>  <!-- Datum und Uhrzeit -->
  <ScheduleByWeek>
    <DaysOfWeek>
      <Monday />  <!-- Wochentag -->
    </DaysOfWeek>
    <WeeksInterval>1</WeeksInterval>  <!-- 1 = jede Woche, 2 = alle 2 Wochen -->
  </ScheduleByWeek>
</CalendarTrigger>
```

Mögliche Wochentage:
- `<Monday />` - Montag
- `<Tuesday />` - Dienstag
- `<Wednesday />` - Mittwoch
- `<Thursday />` - Donnerstag
- `<Friday />` - Freitag
- `<Saturday />` - Samstag
- `<Sunday />` - Sonntag

### Script-Verhalten anpassen

Bearbeiten Sie `weekly-update.js` um:
- Commit-Nachrichten zu ändern
- Zusätzliche Validierung hinzuzufügen
- Benachrichtigungen anzupassen

## 🔍 Logs und Fehlersuche

### Script-Ausgabe ansehen

Bei manueller Ausführung sehen Sie die komplette Ausgabe in der Konsole.

Bei automatischer Ausführung über Task Scheduler:
1. Task Scheduler öffnen
2. "DroneMaps\WeeklyDataUpdate" auswählen
3. Tab "History" ansehen

### Häufige Probleme

**Problem: Script startet nicht automatisch**
- Lösung: Prüfen Sie ob der Task Scheduler Dienst läuft
- Lösung: Überprüfen Sie die Pfade in `weekly-update-task.xml`

**Problem: API-Fehler bei Data Retrieval**
- Lösung: Normal, einige Drohnenmodelle können Fehler verursachen
- Lösung: Solange 60%+ der Drohnentypen erfolgreich sind, ist es OK

**Problem: Git Push schlägt fehl**
- Lösung: Überprüfen Sie Ihre Git-Anmeldedaten
- Lösung: Stellen Sie sicher, dass keine Merge-Konflikte existieren

**Problem: Keine Änderungen zum Committen**
- Lösung: Daten sind identisch zur vorherigen Version (normal wenn keine Updates)
- Script fragt ob Sie trotzdem fortfahren möchten

## 📊 Erwartete Dateigrößen

- **unifiedFlightObstacles.json** (BAZL): ~3-4 MB
- **manufacturerFlightObstacles.json** (DJI): ~2-3 MB

Wenn die Größen stark abweichen, überprüfen Sie die Daten vor dem Upload.

## 🛡️ Sicherheit

**WICHTIG**: Dieses Script pusht automatisch auf GitHub nach Ihrer Bestätigung.

- Überprüfen Sie immer die Dateigrößen vor der Bestätigung
- Bei Zweifeln: Antworten Sie `n` und überprüfen Sie die Daten manuell
- Die Daten bleiben immer in den jeweiligen `data/` Ordnern gespeichert

## 📞 Support

Bei Problemen:
1. Überprüfen Sie die Console-Ausgabe auf Fehlermeldungen
2. Stellen Sie sicher, dass Node.js und npm korrekt installiert sind
3. Prüfen Sie ob alle Dependencies in beiden Retriever-Ordnern installiert sind:
   ```bash
   cd "Code/BAZL Data retriever"
   npm install

   cd "../DJI NoFlyZones/dji_data_retriever"
   npm install
   ```

## 🔄 Workflow-Diagramm

```
┌─────────────────────────────────────┐
│  Montag 9:00 Uhr - Script startet  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  1. BAZL Data Retriever läuft      │
│     (~3-5 Minuten)                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. DJI Data Retriever läuft       │
│     (~5-10 Minuten)                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. Neue Dateien gefunden:         │
│     - BAZLdata_21-12-2025.json     │
│     - DJI-NoFlyZones_21-12-2025... │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. ❓ Benutzer-Eingabe erforderlich│
│     "Upload to GitHub? (y/n)"      │
└──────┬──────────────────────┬───────┘
       │                      │
     [n]                    [y]
       │                      │
       ▼                      ▼
┌─────────────┐    ┌─────────────────────┐
│  Abbruch    │    │ 5. Dateien kopieren │
│  Daten      │    │    nach FlightObs...│
│  bleiben    │    └──────────┬──────────┘
│  lokal      │               │
└─────────────┘               ▼
                   ┌─────────────────────┐
                   │ 6. Git Commit       │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ 7. Git Push         │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ ✅ Fertig!          │
                   │ Daten auf GitHub    │
                   └─────────────────────┘
```
