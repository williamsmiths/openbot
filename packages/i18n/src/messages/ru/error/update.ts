import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  "error.update.unsupported": "Обновления доступны в установленных сборках для компьютера.",
  "error.update.notReady": "Обновление не готово к установке.",
  "error.update.restartFailed": "kongCowork не смог перезапуститься для установки обновления.",
  "error.update.downloadStalled": "Загрузка обновления перестала отвечать. Повторите попытку.",
  "error.update.installFailed":
    "Не удалось установить обновление. Закройте и снова откройте kongCowork, затем повторите попытку.",
  "error.update.downloadFailed": "Не удалось загрузить обновление. Повторите попытку.",
  "error.update.checkFailed": "Не удалось проверить обновления. Повторите попытку.",
  "error.update.checkStalled": "Проверка обновлений перестала отвечать. Повторите попытку.",
  "error.update.checkOffline":
    "Не удалось связаться со службой обновлений. Проверьте подключение к интернету и повторите попытку.",
  "error.update.checkUnavailable":
    "Служба обновлений не ответила. kongCowork сам повторит попытку через несколько минут.",
  "error.update.checkNoRelease":
    "Для этой платформы не найдено опубликованных обновлений. kongCowork сам повторит попытку через несколько минут.",
  "error.update.managedByNix": "Обновления этой копии kongCowork устанавливает Nix. Обновите её через Nix.",
  "error.update.managedByHost":
    "Обновления на этом Mac устанавливает хост. Обновление остаётся готовым до начала обслуживания хоста.",
  "error.update.siblingSession":
    "Из этого приложения всё ещё запущена другая сессия kongCowork. Сначала закройте kongCowork во всех других учётных записях macOS, затем установите обновление снова.",
  "error.update.siblingSessionSameAccount":
    "В этой учётной записи всё ещё работает другой процесс kongCowork. Завершите его, затем установите обновление снова.",
  "error.update.siblingCheckFailed":
    "Не удалось проверить другие сессии kongCowork. Повторите попытку перед установкой.",
  "error.update.readOnlyLocation":
    "kongCowork не может устанавливать обновления из этого места. Закройте kongCowork. В Finder перетащите kongCowork в папку «Программы» (если он уже там, перетащите его наружу и обратно). Затем откройте kongCowork и установите обновление снова.",
  "error.update.remoteDisabled": "Обновления от администраторов сервера отключены на этом компьютере.",
  "error.update.restartStarted": "kongCowork уже перезапускается для установки обновления.",
  "error.update.alreadyRestarting": "kongCowork уже перезапускается.",
} as const satisfies PartialTranslation<typeof source>;
