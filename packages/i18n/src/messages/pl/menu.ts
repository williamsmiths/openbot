import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/menu";

export const messages = {
  "menu.stopAllAgents": "Zatrzymaj wszystkich agentów",
  "menu.checkForUpdates": "Sprawdź aktualizacje…",
  "menu.preferences": "Ustawienia…",
  "menu.actualSize": "Rzeczywisty rozmiar",
  "menu.zoomIn": "Powiększ",
  "menu.zoomOut": "Pomniejsz",
  "menu.copyLink": "Kopiuj link",
  "menu.copyImage": "Kopiuj obraz",
  "menu.quit": "Zamknij kongCowork",
  "menu.quitConfirmTitle": "Zamknąć kongCowork?",
  "menu.quitConfirmBody": "Agenci i rutyny zatrzymają się, dopóki nie otworzysz kongCowork ponownie.",
  "menu.quitConfirm": "Zamknij",
  "menu.quitHint": "Przytrzymaj ⌘Q lub naciśnij dwa razy, aby zamknąć",
  "menu.closeWorkingTitle": {
    one: "{count} agent nadal pracuje",
    few: "{count} agenci nadal pracują",
    many: "{count} agentów nadal pracuje",
    other: "{count} agenta nadal pracuje",
  },
  "menu.closeWorkingBody":
    "Jeśli zamkniesz kongCowork, agenci się zatrzymają. Zostaw go uruchomionego, aby skończyli. Aby znowu pokazać okno, otwórz kongCowork.",
  "menu.closeKeepRunning": "Nie zamykaj",
  "menu.trayOpen": "Otwórz kongCowork",
  "menu.trayQuit": "Zamknij kongCowork",
  "menu.trayTooltip": "kongCowork",
  "menu.hideDynamicIsland": "Ukryj Dynamic Island",
  "menu.undo": "Cofnij",
  "menu.redo": "Przywróć",
  "menu.cut": "Wytnij",
  "menu.copy": "Kopiuj",
  "menu.paste": "Wklej",
  "menu.pasteAndMatchStyle": "Wklej i dopasuj styl",
  "menu.delete": "Usuń",
  "menu.selectAll": "Zaznacz wszystko",
} as const satisfies PartialTranslation<typeof source>;
