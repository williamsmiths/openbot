import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  // Updater state the user reads.
  "error.update.unsupported":
    "Les mises à jour sont disponibles dans les versions installées de l’application de bureau.",
  "error.update.notReady": "Une mise à jour n’est pas prête à être installée.",
  "error.update.restartFailed": "kongCowork n’a pas pu redémarrer pour installer la mise à jour.",
  "error.update.downloadStalled": "Le téléchargement de la mise à jour ne répond plus. Réessayez.",
  "error.update.installFailed": "Impossible d’installer la mise à jour. Quittez puis rouvrez kongCowork, et réessayez.",
  "error.update.downloadFailed": "Impossible de télécharger la mise à jour. Réessayez.",
  "error.update.checkFailed": "Impossible de rechercher des mises à jour. Réessayez.",
  "error.update.checkStalled": "La recherche de mise à jour ne répond plus. Réessayez.",
  "error.update.checkOffline":
    "Impossible de joindre le service de mise à jour. Vérifiez votre connexion Internet, puis réessayez.",
  "error.update.checkUnavailable":
    "Le service de mise à jour n’a pas répondu. kongCowork réessaiera de lui-même dans quelques minutes.",
  "error.update.checkNoRelease":
    "Aucune mise à jour publiée n’a été trouvée pour cette plateforme. kongCowork réessaiera de lui-même dans quelques minutes.",
  "error.update.managedByNix": "Nix installe les mises à jour de cette copie de kongCowork. Mettez-la à jour avec Nix.",
  "error.update.managedByHost":
    "Sur ce Mac, l’hôte installe les mises à jour. La mise à jour reste prête jusqu’à la maintenance de l’hôte.",
  "error.update.siblingSession":
    "Une autre session kongCowork utilise encore cette application. Quittez d’abord kongCowork dans tous les autres comptes utilisateur macOS, puis installez de nouveau la mise à jour.",
  "error.update.siblingSessionSameAccount":
    "Un autre processus kongCowork est toujours en cours d’exécution dans ce compte utilisateur. Quittez-le, puis installez à nouveau la mise à jour.",
  "error.update.siblingCheckFailed":
    "Impossible de vérifier les autres sessions kongCowork. Réessayez avant l’installation.",
  "error.update.readOnlyLocation":
    "kongCowork ne peut pas installer de mises à jour depuis cet emplacement. Quittez kongCowork. Dans le Finder, faites glisser kongCowork dans le dossier Applications (s’il y est déjà, sortez-le puis remettez-le). Ouvrez ensuite kongCowork et installez de nouveau la mise à jour.",
  "error.update.remoteDisabled": "Les mises à jour des administrateurs du serveur sont désactivées sur cet ordinateur.",
  "error.update.restartStarted": "kongCowork redémarre déjà pour installer la mise à jour.",
  "error.update.alreadyRestarting": "kongCowork redémarre déjà.",
} as const satisfies PartialTranslation<typeof source>;
