import { TRANSPARENT_WINDOW_LEVEL_RANGE } from "@openbot/contracts/app-appearance";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  SettingsSection,
  SliderField,
  SwitchField,
  toast,
} from "@openbot/ui";
import { documentColorScheme } from "@openbot/ui/document-color-scheme";
import { AccentColorSetting } from "@openbot/ui/features/settings/AccentColorSetting";
import { AppearancePreview } from "@openbot/ui/features/settings/AppearancePreview";
import { ChatBackgroundSetting } from "@openbot/ui/features/settings/ChatBackgroundSetting";
import { ChatWallpaperSetting } from "@openbot/ui/features/settings/ChatWallpaperSetting";
import { ComposerGlowSetting } from "@openbot/ui/features/settings/ComposerGlowSetting";
import { ThemeCardGrid, type ThemeFilter, ThemeModeFilter } from "@openbot/ui/features/settings/ThemeCardGrid";
import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, onSettled, Show } from "solid-js";
import { useAppearanceChoice, windowGlassTint } from "../../appearance-choice";
import { previewWallpaperLevel, wallpaperPhotoUrl, wantWallpaperPhoto } from "../../chat-wallpaper";
import { useI18n } from "../../i18n-context";

/** A Transparency drag shows at once; the saved value follows when the user lets go (AC-012). */
function previewWindowGlassLevel(level: number): void {
  document.documentElement.style.setProperty("--openbot-window-glass-tint", String(windowGlassTint(level)));
}

interface SettingsAppearanceTabProps {
  platform?: "darwin" | "win32" | "linux" | undefined;
}

/**
 * Settings › Appearance (AC-001): the theme cards, the main color, the chat wallpaper and the glow of
 * the message box. The theme, transparent window and chat background rows moved here from General.
 * Everything here is a per computer choice, so a joined server does not change it.
 */
export function SettingsAppearanceTab(props: SettingsAppearanceTabProps) {
  const i18n = useI18n();
  const { errorMessage, format } = useText();
  const appearance = useAppearanceChoice();
  // The photo tile needs the saved photo while this page is open.
  onSettled(() => wantWallpaperPhoto());
  // A slider drag shows at once. The saved value comes back when a save fails, and when the page
  // closes in the middle of a drag.
  createEffect(
    () => [appearance.chatWallpaperStrength(), appearance.chatWallpaperBlur()] as const,
    ([strength, blur]) => previewWallpaperLevel({ strength, blur }),
  );
  onSettled(
    () => () =>
      previewWallpaperLevel({ strength: appearance.chatWallpaperStrength(), blur: appearance.chatWallpaperBlur() }),
  );
  // The Transparency slider follows the pointer until the user lets go. As for the wallpaper, the saved
  // level comes back when a save fails, and when the page closes in the middle of a drag.
  const [glassDrag, setGlassDrag] = createSignal<number | null>(null);
  createEffect(
    () => appearance.transparentWindowLevel(),
    (level) => previewWindowGlassLevel(level),
  );
  onSettled(() => () => previewWindowGlassLevel(appearance.transparentWindowLevel()));
  const [filter, setFilter] = createSignal<ThemeFilter>("all");
  const pickPhoto = () =>
    void appearance
      .pickPhoto()
      .catch((error: unknown) => toast.error(errorMessage(error, i18n.t("settings.wallpaper.photoFailed")), { error }));
  return (
    <>
      <AppearancePreview />

      <SettingsSection
        title={i18n.t("settings.appearance.theme.title")}
        data-settings-row="settings.appearance.theme.title"
        actions={<ThemeModeFilter value={filter()} onChange={setFilter} />}
      >
        <ThemeCardGrid
          value={appearance.theme()}
          onChange={(value) => appearance.changeTheme(value)}
          palettes={appearance.palettes()}
          filter={filter()}
        />
        <Show when={props.platform === "darwin"}>
          <ItemGroup class="settings-modal-card">
            <SwitchField
              data-settings-row="settings.appearance.transparentWindow.title"
              checked={appearance.transparentWindow()}
              onChange={appearance.changeTransparentWindow}
              label={i18n.t("settings.appearance.transparentWindow.title")}
              description={i18n.t("settings.appearance.transparentWindow.description")}
            />
            <Show when={appearance.transparentWindow()}>
              <SliderField
                class="appearance-glass-level"
                label={i18n.t("settings.appearance.transparentWindow.level")}
                minValue={TRANSPARENT_WINDOW_LEVEL_RANGE.min}
                maxValue={TRANSPARENT_WINDOW_LEVEL_RANGE.max}
                value={glassDrag() ?? appearance.transparentWindowLevel()}
                formatValue={(value) => format.percent(value / 100)}
                onChange={(value) => {
                  setGlassDrag(value);
                  previewWindowGlassLevel(value);
                }}
                onChangeEnd={(value) => {
                  setGlassDrag(null);
                  appearance.changeTransparentWindowLevel(value);
                }}
              />
            </Show>
          </ItemGroup>
        </Show>
      </SettingsSection>

      <SettingsSection title={i18n.t("settings.accent.title")} data-settings-row="settings.accent.title">
        <AccentColorSetting value={appearance.accentColor()} onChange={appearance.changeAccentColor} />
      </SettingsSection>

      <SettingsSection title={i18n.t("settings.wallpaper.title")} data-settings-row="settings.wallpaper.title">
        <ChatWallpaperSetting
          wallpaper={appearance.chatWallpaper()}
          strength={appearance.chatWallpaperStrength()}
          blur={appearance.chatWallpaperBlur()}
          glass={appearance.chatGlass()}
          hasPhoto={appearance.hasPhoto()}
          photoUrl={wallpaperPhotoUrl()}
          onWallpaper={appearance.changeChatWallpaper}
          onStrength={(value, commit) =>
            commit ? appearance.changeChatWallpaperStrength(value) : previewWallpaperLevel({ strength: value })
          }
          onBlur={(value, commit) =>
            commit ? appearance.changeChatWallpaperBlur(value) : previewWallpaperLevel({ blur: value })
          }
          onGlass={appearance.changeChatGlass}
          onPickPhoto={pickPhoto}
        />
        <ItemGroup class="settings-modal-card">
          <Item data-settings-row="settings.chatBackground.title" class="settings-modal-row">
            <ItemContent>
              <ItemTitle>{i18n.t("settings.chatBackground.title")}</ItemTitle>
              <ItemDescription>{i18n.t("settings.chatBackground.description")}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChatBackgroundSetting
                scheme={documentColorScheme()}
                light={appearance.chatBackgroundLight()}
                dark={appearance.chatBackgroundDark()}
                onChange={(scheme, value) =>
                  scheme === "light"
                    ? appearance.changeChatBackgroundLight(value)
                    : appearance.changeChatBackgroundDark(value)
                }
              />
            </ItemActions>
          </Item>
        </ItemGroup>
      </SettingsSection>

      <SettingsSection title={i18n.t("settings.composerGlow.title")} data-settings-row="settings.composerGlow.title">
        <ComposerGlowSetting
          value={appearance.composerGlow()}
          onChange={appearance.changeComposerGlow}
          gradient={appearance.composerGlowGradient()}
          onGradient={appearance.changeComposerGlowGradient}
        />
      </SettingsSection>
    </>
  );
}
