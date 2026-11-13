import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "kongCowork konnte nicht starten",
  "startup.failedBody":
    "{message}\n\nDeine lokalen Daten wurden weder zurückgesetzt noch überschrieben. Schritte zur Wiederherstellung findest du in der Anleitung zur Fehlerbehebung.",
  "startup.archiveChangedTitle": "kongCowork-Dateien wurden geändert",
  "startup.archiveChangedBody":
    "Ein anderes Programm hat die kongCowork-Datei app.asar geändert. kongCowork läuft jetzt, startet aber nicht mehr, wenn du es beendest.\n\nInstalliere kongCowork erneut, um es zu reparieren. Deine lokalen Daten bleiben erhalten.",
  "startup.archiveChangedDownload": "kongCowork laden",
  "startup.filesDamagedBody":
    "Einige kongCowork-Dateien sind beschädigt oder fehlen.\n\nInstalliere kongCowork erneut, um es zu reparieren. Deine lokalen Daten bleiben erhalten.",
  "startup.newerDataUpdatingTitle": "kongCowork wird aktualisiert",
  "startup.newerDataUpdatingBody":
    "Eine neuere Version von kongCowork hat deine Daten gespeichert. kongCowork installiert die neueste Version und startet dann neu.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataTitle": "Neueste kongCowork-Version installieren",
  "startup.newerDataBody":
    "Eine neuere Version von kongCowork hat deine Daten gespeichert, und diese Version ({version}) kann sie nicht öffnen. Installiere die neueste Version, um deine Daten zu öffnen.\n\nDeine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  "startup.newerDataDownload": "kongCowork laden",
  "startup.newerDataGuide": "Anleitung öffnen",
  "startup.newerDataQuit": "Beenden",
  "startup.recoveryWindowTitle": "kongCowork-Wiederherstellung",
  "startup.recoveryTitle": "kongCowork wurde nicht geöffnet",
  "startup.recoveryBody": {
    one: "kongCowork {version} wurde {count} Mal in Folge vor dem Öffnen beendet. Deine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
    other:
      "kongCowork {version} wurde {count} Mal in Folge vor dem Öffnen beendet. Deine lokalen Daten wurden nicht zurückgesetzt oder überschrieben.",
  },
  "startup.recoveryHint":
    "Versuche es erneut oder installiere die letzte Version, die sich geöffnet hat. Für Hilfe exportiere die Diagnosedaten und sende die Datei mit deinem Bericht.",
  "startup.recoveryRetry": "Wiederholen",
  "startup.recoveryPreviousVersion": "Vorherige Version laden",
  "startup.recoveryExportDiagnostics": "Diagnose exportieren",
  "startup.recoveryOpenDataFolder": "Datenordner öffnen",
  "startup.recoveryQuit": "Beenden",
  "startup.recoveryDiagnosticsSaved": "Die Diagnosedatei ist gespeichert.",
  "startup.recoveryActionFailed": "kongCowork konnte diese Aktion nicht ausführen.",
} as const satisfies PartialTranslation<typeof source>;
