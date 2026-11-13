import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "O kongCowork não conseguiu iniciar",
  "startup.failedBody":
    "{message}\n\nSeus dados locais não foram redefinidos nem sobrescritos. Consulte o guia de solução de problemas para ver os passos de recuperação.",
  "startup.archiveChangedTitle": "Arquivos do kongCowork foram alterados",
  "startup.archiveChangedBody":
    "Outro programa alterou o arquivo app.asar do kongCowork. O kongCowork funciona agora, mas não vai abrir depois que você fechá-lo.\n\nPara reparar, instale o kongCowork novamente. Seus dados locais são mantidos.",
  "startup.archiveChangedDownload": "Baixar kongCowork",
  "startup.filesDamagedBody":
    "Alguns arquivos do kongCowork estão danificados ou faltando.\n\nPara reparar, instale o kongCowork novamente. Seus dados locais são mantidos.",
  "startup.newerDataUpdatingTitle": "Atualizando o kongCowork",
  "startup.newerDataUpdatingBody":
    "Uma versão mais recente do kongCowork salvou seus dados. O kongCowork instala a versão mais recente e depois abre de novo.\n\nSeus dados locais não foram redefinidos nem substituídos.",
  "startup.newerDataTitle": "Instale o kongCowork mais recente",
  "startup.newerDataBody":
    "Uma versão mais recente do kongCowork salvou seus dados, e esta versão ({version}) não consegue abri-los. Instale a versão mais recente para abrir seus dados.\n\nSeus dados locais não foram redefinidos nem substituídos.",
  "startup.newerDataDownload": "Baixar kongCowork",
  "startup.newerDataGuide": "Abrir guia",
  "startup.newerDataQuit": "Sair",
  "startup.recoveryWindowTitle": "Recuperação do kongCowork",
  "startup.recoveryTitle": "O kongCowork não abriu",
  "startup.recoveryBody": {
    one: "O kongCowork {version} parou antes de abrir, {count} vez seguida. Seus dados locais não foram redefinidos nem substituídos.",
    other:
      "O kongCowork {version} parou antes de abrir, {count} vezes seguidas. Seus dados locais não foram redefinidos nem substituídos.",
  },
  "startup.recoveryHint":
    "Tente novamente ou instale a última versão que abriu. Para obter ajuda, exporte o diagnóstico e envie o arquivo com seu relato.",
  "startup.recoveryRetry": "Tentar de novo",
  "startup.recoveryPreviousVersion": "Baixar versão anterior",
  "startup.recoveryExportDiagnostics": "Exportar diagnóstico",
  "startup.recoveryOpenDataFolder": "Abrir pasta de dados",
  "startup.recoveryQuit": "Sair",
  "startup.recoveryDiagnosticsSaved": "O arquivo de diagnóstico foi salvo.",
  "startup.recoveryActionFailed": "O kongCowork não conseguiu fazer esta ação.",
} as const satisfies PartialTranslation<typeof source>;
