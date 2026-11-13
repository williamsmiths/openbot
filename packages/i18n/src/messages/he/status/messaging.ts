import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/messaging";

export const messages = {
  "status.messaging.working": "עובד על זה…",
  "status.messaging.queued": "בהמתנה: kongCowork עובד על בקשה אחרת. התשובה תגיע לכאן.",
  "status.messaging.busy": "יותר מדי בקשות ממתינות. אפשר לנסות שוב מאוחר יותר.",
  "status.messaging.failed": "kongCowork לא הצליח לסיים את הבקשה הזו. הפרטים נמצאים במארח kongCowork.",
  "status.messaging.noAnswer": "kongCowork סיים בלי תשובה כתובה.",
  "status.messaging.noAgent": "עדיין אין סוכן שיכול לענות כאן. יש להוסיף את Slack Orchestrator ב-kongCowork.",
  "status.messaging.delegated": "חבר צוות עובד על זה. התשובה תגיע לכאן.",
  "status.messaging.stopped": "נעצר.",
  "status.messaging.stop": "עצירה",
  "status.messaging.approvalTitle": "kongCowork מבקש אישור כדי להמשיך.",
  "status.messaging.approvalCommand": "הרצת פקודה",
  "status.messaging.approvalFileChange": "שינוי קבצים",
  "status.messaging.approvalPermissions": "קבלת הרשאות נוספות",
  "status.messaging.approve": "אישור",
  "status.messaging.deny": "דחייה",
  "status.messaging.approvedBy": "אושר על ידי {user}.",
  "status.messaging.deniedBy": "נדחה על ידי {user}.",
  "status.messaging.answeredOnHost": "נענה במארח kongCowork.",
  "status.messaging.requestInactive": "הבקשה הזו כבר אינה פעילה.",
  "status.messaging.onlyRequester": "רק {user} יכול לבצע זאת. אפשר גם לענות במארח kongCowork.",
  "status.messaging.hostOnly": "רק מארח kongCowork יכול לענות על הבקשה הזו.",
  "status.messaging.filesSkipped": "חלק מהקבצים לא נשלחו: {names}.",
  "status.messaging.orchestratorName": "Slack Orchestrator",
  "status.messaging.orchestratorTitle": "עונה ב-Slack ושואל את הצוות",
  "status.messaging.discordNoAgent": "עדיין אין סוכן שיכול לענות כאן. יש להוסיף את Discord Orchestrator ב-kongCowork.",
  "status.messaging.discordOrchestratorName": "Discord Orchestrator",
  "status.messaging.discordOrchestratorTitle": "עונה ב-Discord ושואל את הצוות",
  "status.messaging.integrationsSection": "שילובים",
  "status.messaging.signInReceived": "kongCowork קיבל את התקנת Slack. אפשר לסגור את הלשונית הזו.",
  "status.messaging.signInUnknown": "kongCowork לא התחיל את התקנת Slack הזו. יש להתחיל אותה שוב ב-kongCowork.",
  "status.messaging.telegramNoAgent":
    "עדיין אין סוכן שיכול לענות כאן. יש להוסיף את Telegram Orchestrator ב-kongCowork.",
  "status.messaging.telegramLinked":
    "kongCowork מחובר לצ'אט הזה. אפשר לתייג את {bot} או להשיב להודעה של kongCowork כדי לשאול את הסוכנים.",
  "status.messaging.telegramOrchestratorName": "Telegram Orchestrator",
  "status.messaging.telegramOrchestratorTitle": "עונה ב-Telegram ושואל את הצוות",
  "status.messaging.whatsappNoAgent":
    "עדיין אין סוכן שיכול לענות כאן. יש להוסיף את WhatsApp Orchestrator ב-kongCowork.",
  "status.messaging.whatsappApprovalMenu": "יש להשיב 1 לאישור או 2 לדחייה.",
  "status.messaging.whatsappStopMenu": "יש להשיב stop כדי לעצור.",
  "status.messaging.whatsappPairingCode":
    "המספר הזה עונה רק לאנשים שהבעלים שלו אישר. יש לתת לבעלים את הקוד הזה: {code}",
  "status.messaging.whatsappPairingApproved": "אפשר לשלוח עכשיו בקשות למספר הזה.",
  "status.messaging.whatsappOwnChat": "הודעה לעצמך",
  "status.messaging.whatsappWelcomeOwn":
    "👋 *kongCowork מחובר*\n\nאפשר לכתוב כאן כדי לשאול את הסוכנים. WhatsApp Orchestrator עונה, או מעביר את העבודה לסוכן המתאים.\n\nיש לשלוח *stop* כדי לעצור בקשה.",
  "status.messaging.whatsappWelcomeDedicated":
    "👋 *kongCowork מחובר*\n\nהאנשים שאישרת ב-kongCowork יכולים עכשיו לכתוב למספר הזה. אדם חדש מקבל קוד: יש לאשר אותו ב-kongCowork תחת בקשות.\n\nיש לשלוח *stop* כדי לעצור בקשה.",
  "status.messaging.whatsappOrchestratorName": "WhatsApp Orchestrator",
  "status.messaging.whatsappOrchestratorTitle": "עונה ב-WhatsApp ושואל את הצוות",
} as const satisfies PartialTranslation<typeof source>;
