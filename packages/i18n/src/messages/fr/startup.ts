import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  // The one native error box: the app could not start, so no renderer exists to show it.
  "startup.failedTitle": "kongCowork n’a pas pu démarrer",
  "startup.failedBody":
    "{message}\n\nVos données locales n’ont pas été réinitialisées ni écrasées. Consultez le guide de dépannage pour savoir comment récupérer la situation.",
  "startup.archiveChangedTitle": "Des fichiers de kongCowork ont été modifiés",
  "startup.archiveChangedBody":
    "Un autre programme a modifié le fichier app.asar de kongCowork. kongCowork fonctionne maintenant, mais il ne s’ouvrira plus après sa fermeture.\n\nPour le réparer, réinstallez kongCowork. Vos données locales sont conservées.",
  "startup.archiveChangedDownload": "Télécharger kongCowork",
  "startup.filesDamagedBody":
    "Certains fichiers de kongCowork sont endommagés ou manquants.\n\nPour le réparer, réinstallez kongCowork. Vos données locales sont conservées.",
  "startup.newerDataUpdatingTitle": "Mise à jour de kongCowork",
  "startup.newerDataUpdatingBody":
    "Une version plus récente de kongCowork a enregistré vos données. kongCowork installe la dernière version, puis se rouvre.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.newerDataTitle": "Installez la dernière version de kongCowork",
  "startup.newerDataBody":
    "Une version plus récente de kongCowork a enregistré vos données, et cette version ({version}) ne peut pas les ouvrir. Installez la dernière version pour ouvrir vos données.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.newerDataDownload": "Télécharger kongCowork",
  "startup.newerDataGuide": "Ouvrir le guide",
  "startup.newerDataQuit": "Quitter",
  "startup.recoveryWindowTitle": "Récupération de kongCowork",
  "startup.recoveryTitle": "kongCowork ne s’est pas ouvert",
  "startup.recoveryBody": {
    one: "kongCowork {version} s’est arrêté avant de s’ouvrir, {count} fois de suite. Vos données locales n’ont pas été réinitialisées ni écrasées.",
    other:
      "kongCowork {version} s’est arrêté avant de s’ouvrir, {count} fois de suite. Vos données locales n’ont pas été réinitialisées ni écrasées.",
  },
  "startup.recoveryHint":
    "Réessayez, ou installez la dernière version qui s’est ouverte. Pour obtenir de l’aide, exportez le diagnostic et envoyez le fichier avec votre rapport.",
  "startup.recoveryRetry": "Réessayer",
  "startup.recoveryPreviousVersion": "Télécharger la version précédente",
  "startup.recoveryExportDiagnostics": "Exporter le diagnostic",
  "startup.recoveryOpenDataFolder": "Ouvrir le dossier des données",
  "startup.recoveryQuit": "Quitter",
  "startup.recoveryDiagnosticsSaved": "Le fichier de diagnostic est enregistré.",
  "startup.recoveryActionFailed": "kongCowork n’a pas pu effectuer cette action.",
} as const satisfies PartialTranslation<typeof source>;
