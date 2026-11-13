import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "kongCowork לא הצליח להיפתח",
  "startup.failedBody":
    "{message}\n\nהנתונים המקומיים שלך לא אופסו ולא נדרסו. בצעדי השחזור שבמדריך לפתרון בעיות אפשר לקרוא איך להמשיך.",
  "startup.archiveChangedTitle": "קובצי kongCowork שונו",
  "startup.archiveChangedBody":
    "תוכנה אחרת שינתה את קובץ kongCowork app.asar. kongCowork פועל כעת, אך לא ייפתח לאחר היציאה ממנו.\n\nכדי לתקן את kongCowork, יש להתקין אותו מחדש. הנתונים המקומיים נשמרים.",
  "startup.archiveChangedDownload": "הורדת kongCowork",
  "startup.filesDamagedBody":
    "חלק מקובצי kongCowork פגומים או חסרים.\n\nכדי לתקן את kongCowork, יש להתקין אותו מחדש. הנתונים המקומיים נשמרים.",
  "startup.newerDataUpdatingTitle": "kongCowork מתעדכן",
  "startup.newerDataUpdatingBody":
    "גרסה חדשה יותר של kongCowork שמרה את הנתונים שלך. kongCowork מתקין את הגרסה האחרונה ואז נפתח מחדש.\n\nהנתונים המקומיים שלך לא אופסו ולא נדרסו.",
  "startup.newerDataTitle": "התקנת kongCowork העדכני ביותר",
  "startup.newerDataBody":
    "גרסה חדשה יותר של kongCowork שמרה את הנתונים שלך, והגרסה הזו ({version}) אינה יכולה לפתוח אותם. יש להתקין את הגרסה האחרונה כדי לפתוח את הנתונים.\n\nהנתונים המקומיים שלך לא אופסו ולא נדרסו.",
  "startup.newerDataDownload": "הורדת kongCowork",
  "startup.newerDataGuide": "פתיחת המדריך",
  "startup.newerDataQuit": "יציאה",
  "startup.recoveryWindowTitle": "שחזור kongCowork",
  "startup.recoveryTitle": "kongCowork לא נפתח",
  "startup.recoveryBody": {
    one: "kongCowork {version} נעצר לפני שנפתח, פעם אחת ({count}). הנתונים המקומיים שלך לא אופסו ולא נדרסו.",
    two: "kongCowork {version} נעצר לפני שנפתח, פעמיים ברצף ({count}). הנתונים המקומיים שלך לא אופסו ולא נדרסו.",
    other: "kongCowork {version} נעצר לפני שנפתח, {count} פעמים ברצף. הנתונים המקומיים שלך לא אופסו ולא נדרסו.",
  },
  "startup.recoveryHint":
    "נסה שוב, או התקן את הגרסה האחרונה שנפתחה. לקבלת עזרה, ייצא את נתוני האבחון ושלח את הקובץ עם הדיווח שלך.",
  "startup.recoveryRetry": "נסה שוב",
  "startup.recoveryPreviousVersion": "הורדת הגרסה הקודמת",
  "startup.recoveryExportDiagnostics": "ייצוא אבחון",
  "startup.recoveryOpenDataFolder": "פתיחת תיקיית הנתונים",
  "startup.recoveryQuit": "יציאה",
  "startup.recoveryDiagnosticsSaved": "קובץ האבחון נשמר.",
  "startup.recoveryActionFailed": "kongCowork לא הצליח לבצע את הפעולה הזו.",
} as const satisfies PartialTranslation<typeof source>;
