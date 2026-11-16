import { Bubble, BubbleContent, Button } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { ArrowUp } from "../../icons";
import { useText } from "../../text";

/**
 * A small chat for Settings › Appearance: the real bubble and message box classes, so the main
 * color, the wallpaper, the glass and the glow show at once, as they do in a conversation. The
 * wallpaper layer comes from the renderer stylesheet, which lists this element beside the
 * conversation. The preview does nothing: it is not focusable and not read to screen readers.
 */
export function AppearancePreview(): JSX.Element {
  const { t } = useText();
  return (
    <div class="appearance-preview" aria-hidden="true" inert>
      <div class="appearance-preview-messages">
        <Bubble variant="secondary" align="end" class="message-entry-user appearance-preview-user">
          <BubbleContent>{t("settings.preview.user")}</BubbleContent>
        </Bubble>
        <Bubble variant="muted">
          <BubbleContent>{t("settings.preview.agent")}</BubbleContent>
        </Bubble>
      </div>
      <div class="composer" data-compact>
        <span />
        <span class="appearance-preview-hint">{t("settings.preview.composer")}</span>
        <Button variant="ghost" type="button" class="voice-button composer-send-button" tabindex={-1}>
          <ArrowUp aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
