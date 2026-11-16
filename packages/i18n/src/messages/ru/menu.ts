import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/menu";

export const messages = {
  "menu.stopAllAgents": "Остановить всех агентов",
  "menu.checkForUpdates": "Проверить обновления…",
  "menu.preferences": "Настройки…",
  "menu.actualSize": "Фактический размер",
  "menu.zoomIn": "Увеличить",
  "menu.zoomOut": "Уменьшить",
  "menu.copyLink": "Скопировать ссылку",
  "menu.copyImage": "Скопировать изображение",
  "menu.quit": "Выйти из kongCowork",
  "menu.quitConfirmTitle": "Выйти из kongCowork?",
  "menu.quitConfirmBody": "Агенты и автозадачи остановятся, пока вы снова не откроете kongCowork.",
  "menu.quitConfirm": "Выйти",
  "menu.quitHint": "Удерживайте ⌘Q или нажмите дважды, чтобы выйти",
  "menu.closeWorkingTitle": {
    one: "{count} агент ещё работает",
    few: "{count} агента ещё работают",
    many: "{count} агентов ещё работают",
    other: "{count} агента ещё работают",
  },
  "menu.closeWorkingBody":
    "Если выйти из kongCowork, агенты остановятся. Оставьте kongCowork работать, чтобы они закончили. Чтобы снова показать окно, откройте kongCowork.",
  "menu.closeKeepRunning": "Не выходить",
  "menu.trayOpen": "Открыть kongCowork",
  "menu.trayQuit": "Выйти из kongCowork",
  "menu.trayTooltip": "kongCowork",
  "menu.hideDynamicIsland": "Скрыть Dynamic Island",
  "menu.undo": "Отменить",
  "menu.redo": "Повторить",
  "menu.cut": "Вырезать",
  "menu.copy": "Копировать",
  "menu.paste": "Вставить",
  "menu.pasteAndMatchStyle": "Вставить в том же стиле",
  "menu.delete": "Удалить",
  "menu.selectAll": "Выделить все",
} as const satisfies PartialTranslation<typeof source>;
