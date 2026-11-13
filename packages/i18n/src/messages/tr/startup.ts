import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "kongCowork başlatılamadı",
  "startup.failedBody":
    "{message}\n\nYerel verileriniz sıfırlanmadı veya üzerine yazılmadı. Kurtarma adımları için sorun giderme kılavuzuna bakın.",
  "startup.archiveChangedTitle": "kongCowork dosyaları değiştirildi",
  "startup.archiveChangedBody":
    "Başka bir program kongCowork’un app.asar dosyasını değiştirdi. kongCowork şu an çalışıyor, ancak kapattıktan sonra açılmayacak.\n\nOnarmak için kongCowork’u yeniden yükleyin. Yerel verileriniz korunur.",
  "startup.archiveChangedDownload": "kongCowork’u indir",
  "startup.filesDamagedBody":
    "Bazı kongCowork dosyaları hasarlı veya eksik.\n\nOnarmak için kongCowork’u yeniden yükleyin. Yerel verileriniz korunur.",
  "startup.newerDataUpdatingTitle": "kongCowork güncelleniyor",
  "startup.newerDataUpdatingBody":
    "kongCowork’un daha yeni bir sürümü verilerinizi kaydetti. kongCowork en son sürümü yüklüyor ve ardından yeniden açılacak.\n\nYerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
  "startup.newerDataTitle": "En son kongCowork’u yükleyin",
  "startup.newerDataBody":
    "kongCowork’un daha yeni bir sürümü verilerinizi kaydetti ve bu sürüm ({version}) onları açamıyor. Verilerinizi açmak için en son sürümü yükleyin.\n\nYerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
  "startup.newerDataDownload": "kongCowork’u indir",
  "startup.newerDataGuide": "Kılavuzu aç",
  "startup.newerDataQuit": "Çık",
  "startup.recoveryWindowTitle": "kongCowork kurtarma",
  "startup.recoveryTitle": "kongCowork açılmadı",
  "startup.recoveryBody": {
    one: "kongCowork {version}, açılmadan önce art arda {count} kez durdu. Yerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
    other:
      "kongCowork {version}, açılmadan önce art arda {count} kez durdu. Yerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
  },
  "startup.recoveryHint":
    "Yeniden deneyin veya açılan son sürümü yükleyin. Yardım almak için tanılamayı dışa aktarın ve dosyayı raporunuzla gönderin.",
  "startup.recoveryRetry": "Yeniden dene",
  "startup.recoveryPreviousVersion": "Önceki sürümü indir",
  "startup.recoveryExportDiagnostics": "Tanılamayı dışa aktar",
  "startup.recoveryOpenDataFolder": "Veri klasörünü aç",
  "startup.recoveryQuit": "Çık",
  "startup.recoveryDiagnosticsSaved": "Tanılama dosyası kaydedildi.",
  "startup.recoveryActionFailed": "kongCowork bu işlemi yapamadı.",
} as const satisfies PartialTranslation<typeof source>;
