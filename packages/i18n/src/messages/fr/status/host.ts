import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/host";

export const messages = {
  // Status lines of the WebRTC host.
  "status.host.registered": "Ce kongCowork est enregistré pour l’accès WebRTC.",
  "status.host.keyRotated": "Clé du serveur changée. Les appareils associés restent associés.",
  "status.host.identityUpdated": "Identité du serveur mise à jour.",
  "status.host.starting": "Démarrage de l’hôte WebRTC…",
  "status.host.ready": "Ce kongCowork est prêt pour les connexions WebRTC.",
  "status.host.signalLost":
    "Les autres appareils ne peuvent pas joindre ce kongCowork pour le moment. Il se reconnecte.",
  "status.host.stopping": "Passage de ce kongCowork en mode privé…",
  "status.host.private": "Ce kongCowork est privé.",
  "status.host.removed": "Ce kongCowork a été retiré de votre compte. Publiez-le à nouveau pour le partager.",
} as const satisfies PartialTranslation<typeof source>;
