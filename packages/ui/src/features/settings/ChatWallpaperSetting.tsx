import {
  APP_CHAT_WALLPAPERS,
  type AppChatWallpaper,
  CHAT_WALLPAPER_BLUR_RANGE,
  CHAT_WALLPAPER_STRENGTH_RANGE,
} from "@openbot/contracts/app-appearance";
import type { AppTextKey } from "@openbot/i18n";
import { Button, SliderField, SwitchField } from "@openbot/ui";
import type { JSX } from "@solidjs/web";
import { createSignal, For, Show } from "solid-js";
import { Ban, Binary, Image } from "../../icons";
import { useText } from "../../text";

const WALLPAPER_LABEL = {
  none: "settings.wallpaper.none",
  glow: "settings.wallpaper.glow",
  glyphs: "settings.wallpaper.glyphs",
  dots: "settings.wallpaper.dots",
  photo: "settings.wallpaper.photo",
} as const satisfies Record<AppChatWallpaper, AppTextKey>;

export interface ChatWallpaperSettingProps {
  /** The saved choice. `photo` with no saved photo shows as none. */
  wallpaper: AppChatWallpaper;
  strength: number;
  blur: number;
  glass: boolean;
  /** True while main keeps a photo. The photo tile then selects it, and a button picks another. */
  hasPhoto: boolean;
  /** The saved photo as the data URL that the preload checked, for the tile. */
  photoUrl: string | null;
  onWallpaper: (wallpaper: AppChatWallpaper) => void;
  /** `commit` is false while a slider moves, so a caller can show the value, and true once, at the end. */
  onStrength: (value: number, commit: boolean) => void;
  onBlur: (value: number, commit: boolean) => void;
  onGlass: (glass: boolean) => void;
  /** Opens the image dialog. The caller saves the picture and chooses the photo wallpaper. */
  onPickPhoto: () => void;
}

/** What a tile draws. The art is CSS over the accent tokens, so the tile follows the main color. */
function WallpaperTileArt(props: { wallpaper: AppChatWallpaper; photoUrl: string | null }): JSX.Element {
  return (
    <span class={["wallpaper-tile-art", `wallpaper-tile-art-${props.wallpaper}`]} aria-hidden="true">
      <Show when={props.wallpaper === "none"}>
        <Ban />
      </Show>
      <Show when={props.wallpaper === "glyphs"}>
        <Binary />
      </Show>
      <Show when={props.wallpaper === "photo"}>
        <Show when={props.photoUrl} fallback={<Image />}>
          {(url) => <span class="wallpaper-tile-photo" style={{ "--wallpaper-tile-photo": `url("${url()}")` }} />}
        </Show>
      </Show>
    </span>
  );
}

/**
 * The chat wallpaper of Settings › Appearance (AC-005): None, Glow, Glyphs, Dots or the user's photo,
 * a strength and a blur, and the frosted glass of the bubbles and the message box.
 */
export function ChatWallpaperSetting(props: ChatWallpaperSettingProps): JSX.Element {
  const { t, format } = useText();
  const shown = (): AppChatWallpaper => (props.wallpaper === "photo" && !props.hasPhoto ? "none" : props.wallpaper);
  // The slider keeps the value of a drag until the user lets go, so it follows the pointer.
  const [strengthDrag, setStrengthDrag] = createSignal<number | null>(null);
  const [blurDrag, setBlurDrag] = createSignal<number | null>(null);
  const select = (wallpaper: AppChatWallpaper) => {
    if (wallpaper === "photo" && !props.hasPhoto) props.onPickPhoto();
    else props.onWallpaper(wallpaper);
  };
  return (
    <div class="wallpaper-setting">
      <fieldset class="wallpaper-tiles" aria-label={t("settings.wallpaper.title")}>
        <For each={APP_CHAT_WALLPAPERS}>
          {(wallpaper) => (
            <Button
              variant="ghost"
              type="button"
              class={["wallpaper-tile", { "wallpaper-tile-selected": shown() === wallpaper }]}
              aria-pressed={shown() === wallpaper ? "true" : "false"}
              data-cuelume-tap="select"
              onClick={() => select(wallpaper)}
            >
              <WallpaperTileArt wallpaper={wallpaper} photoUrl={props.photoUrl} />
              <span class="ui-text-truncate">{t(WALLPAPER_LABEL[wallpaper])}</span>
            </Button>
          )}
        </For>
      </fieldset>
      <Show when={props.hasPhoto}>
        <Button variant="outline" size="sm" type="button" class="wallpaper-change-photo" onClick={props.onPickPhoto}>
          <Image aria-hidden="true" />
          {t("settings.wallpaper.changePhoto")}
        </Button>
      </Show>
      <div class="wallpaper-options">
        <div class="wallpaper-levels">
          <SliderField
            label={t("settings.wallpaper.strength")}
            minValue={CHAT_WALLPAPER_STRENGTH_RANGE.min}
            maxValue={CHAT_WALLPAPER_STRENGTH_RANGE.max}
            value={strengthDrag() ?? props.strength}
            disabled={shown() === "none"}
            formatValue={(value) => format.percent(value / 100)}
            onChange={(value) => {
              setStrengthDrag(value);
              props.onStrength(value, false);
            }}
            onChangeEnd={(value) => {
              setStrengthDrag(null);
              props.onStrength(value, true);
            }}
          />
          <SliderField
            label={t("settings.wallpaper.blur")}
            minValue={CHAT_WALLPAPER_BLUR_RANGE.min}
            maxValue={CHAT_WALLPAPER_BLUR_RANGE.max}
            value={blurDrag() ?? props.blur}
            disabled={shown() === "none"}
            formatValue={(value) => t("settings.wallpaper.blurValue", { value })}
            onChange={(value) => {
              setBlurDrag(value);
              props.onBlur(value, false);
            }}
            onChangeEnd={(value) => {
              setBlurDrag(null);
              props.onBlur(value, true);
            }}
          />
        </div>
        <SwitchField
          class="wallpaper-glass"
          checked={props.glass}
          disabled={shown() === "none"}
          onChange={props.onGlass}
          label={t("settings.wallpaper.glass")}
        />
      </div>
    </div>
  );
}
