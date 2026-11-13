import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "kongCowork kan niet starten",
  "startup.failedBody":
    "{message}\n\nJe lokale gegevens zijn niet gereset of overschreven. Bekijk de handleiding voor probleemoplossing voor herstelstappen.",
  "startup.archiveChangedTitle": "kongCowork-bestanden zijn gewijzigd",
  "startup.archiveChangedBody":
    "Een ander programma heeft het kongCowork-bestand app.asar gewijzigd. kongCowork werkt nu, maar opent niet meer nadat je het afsluit.\n\nInstalleer kongCowork opnieuw om het te herstellen. Je lokale gegevens blijven bewaard.",
  "startup.archiveChangedDownload": "kongCowork downloaden",
  "startup.filesDamagedBody":
    "Sommige kongCowork-bestanden zijn beschadigd of ontbreken.\n\nInstalleer kongCowork opnieuw om het te herstellen. Je lokale gegevens blijven bewaard.",
  "startup.newerDataUpdatingTitle": "kongCowork wordt bijgewerkt",
  "startup.newerDataUpdatingBody":
    "Een nieuwere versie van kongCowork heeft je gegevens opgeslagen. kongCowork installeert de nieuwste versie en opent daarna opnieuw.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.newerDataTitle": "Installeer de nieuwste kongCowork",
  "startup.newerDataBody":
    "Een nieuwere versie van kongCowork heeft je gegevens opgeslagen, en deze versie ({version}) kan ze niet openen. Installeer de nieuwste versie om je gegevens te openen.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.newerDataDownload": "kongCowork downloaden",
  "startup.newerDataGuide": "Gids openen",
  "startup.newerDataQuit": "Stoppen",
  "startup.recoveryWindowTitle": "kongCowork-herstel",
  "startup.recoveryTitle": "kongCowork is niet geopend",
  "startup.recoveryBody": {
    one: "kongCowork {version} stopte voordat het openging, {count} keer achter elkaar. Je lokale gegevens zijn niet gewist of overschreven.",
    other:
      "kongCowork {version} stopte voordat het openging, {count} keer achter elkaar. Je lokale gegevens zijn niet gewist of overschreven.",
  },
  "startup.recoveryHint":
    "Probeer het opnieuw, of installeer de laatste versie die wel opende. Exporteer voor hulp de diagnose en stuur het bestand mee met je melding.",
  "startup.recoveryRetry": "Opnieuw",
  "startup.recoveryPreviousVersion": "Vorige versie downloaden",
  "startup.recoveryExportDiagnostics": "Diagnose exporteren",
  "startup.recoveryOpenDataFolder": "Gegevensmap openen",
  "startup.recoveryQuit": "Stoppen",
  "startup.recoveryDiagnosticsSaved": "Het diagnosebestand is opgeslagen.",
  "startup.recoveryActionFailed": "kongCowork kon deze actie niet uitvoeren.",
} as const satisfies PartialTranslation<typeof source>;
