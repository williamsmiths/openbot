import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/menu";

export const messages = {
  "menu.stopAllAgents": "עצירת כל הסוכנים",
  "menu.checkForUpdates": "בדיקת עדכונים…",
  "menu.preferences": "הגדרות…",
  "menu.actualSize": "גודל בפועל",
  "menu.zoomIn": "הגדלה",
  "menu.zoomOut": "הקטנה",
  "menu.copyLink": "העתקת קישור",
  "menu.copyImage": "העתקת תמונה",
  "menu.quit": "יציאה מ-kongCowork",
  "menu.quitConfirmTitle": "לצאת מ-kongCowork?",
  "menu.quitConfirmBody": "סוכנים ושגרות נעצרים עד שתפתח את kongCowork שוב.",
  "menu.quitConfirm": "יציאה",
  "menu.quitHint": "יש להחזיק את ⌘Q או ללחוץ עליו פעמיים כדי לצאת",
  "menu.closeWorkingTitle": {
    one: "סוכן אחד עדיין עובד",
    two: "שני סוכנים עדיין עובדים",
    other: "{count} סוכנים עדיין עובדים",
  },
  "menu.closeWorkingBody":
    "יציאה מ-kongCowork עוצרת את הסוכנים. אפשר להשאיר אותו פועל כדי שיסיימו. כדי להציג שוב את החלון, יש לפתוח את kongCowork.",
  "menu.closeKeepRunning": "להמשיך לפעול",
  "menu.trayOpen": "פתיחת kongCowork",
  "menu.trayQuit": "יציאה מ-kongCowork",
  "menu.trayTooltip": "kongCowork",
  "menu.hideDynamicIsland": "הסתרת Dynamic Island",
  "menu.undo": "ביטול",
  "menu.redo": "ביצוע חוזר",
  "menu.cut": "גזירה",
  "menu.copy": "העתקה",
  "menu.paste": "הדבקה",
  "menu.pasteAndMatchStyle": "הדבקה והתאמת סגנון",
  "menu.delete": "מחיקה",
  "menu.selectAll": "בחירת הכול",
} as const satisfies PartialTranslation<typeof source>;
