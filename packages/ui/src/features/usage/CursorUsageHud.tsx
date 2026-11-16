import { ProviderLogo } from "@openbot/brand";
import { Button, Check, Popover } from "@openbot/ui";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { useText } from "../../text";
import { type AccountUsageProviderRow, accountUsageRowLabel } from "../account/account-usage-view";
import { type CursorHudMachine, type UsageHudReading, usageHudReading, usageHudRowKey } from "./cursor-usage-hud-view";
import { UsageHudSkin } from "./UsageHudSkin";

export type { CursorHudMachine } from "./cursor-usage-hud-view";

/** The reset countdown shows minutes, so a half-minute tick keeps it current. */
const RESET_CLOCK_MS = 30_000;

interface HudChoice {
  key: string;
  row: AccountUsageProviderRow;
  reading: UsageHudReading;
}

/**
 * The plan usage HUD that GPT drew, always at the bottom of the agent list. It shows one provider at a
 * time, Cursor first; a click lists every provider with a reading to show another one. `selected` is
 * the key the owner picked before (`usageHudRowKey`), and `onSelect` keeps a new pick. With no reading
 * at all, nothing shows.
 */
export function CursorUsageHud(props: {
  rows: readonly AccountUsageProviderRow[];
  machine?: CursorHudMachine | null | undefined;
  selected?: string | null | undefined;
  onSelect?: ((key: string) => void) | undefined;
}) {
  const text = useText();
  const { t, format } = text;
  const choices = createMemo((): HudChoice[] =>
    props.rows.flatMap((row) => {
      const reading = usageHudReading(row);
      return reading ? [{ key: usageHudRowKey(row), row, reading }] : [];
    }),
  );
  const [picked, setPicked] = createSignal<string | null>(null);
  const current = createMemo(() => {
    const list = choices();
    const wanted = picked() ?? props.selected ?? null;
    return (
      list.find((choice) => choice.key === wanted) ??
      list.find((choice) => choice.row.provider === "cursor" && choice.row.accountId === null) ??
      list[0] ??
      null
    );
  });
  const [open, setOpen] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());
  const clock = window.setInterval(() => setNow(Date.now()), RESET_CLOCK_MS);
  onCleanup(() => window.clearInterval(clock));
  const choose = (key: string) => {
    setPicked(key);
    props.onSelect?.(key);
    setOpen(false);
  };
  return (
    <Show when={current()}>
      {(choice) => (
        <Popover.Root open={open()} onOpenChange={setOpen} placement="right-end" gutter={10}>
          <Popover.Trigger class="usage-hud" aria-label={accountUsageRowLabel(choice().row, text)}>
            <UsageHudSkin reading={choice().reading} machine={props.machine ?? null} now={now()} />
            <ProviderLogo provider={choice().row.provider} class="usage-hud-provider" />
          </Popover.Trigger>
          <Popover.Portal>
            {/* The list in the HUD's own neon, each provider with the bar and the number of its HP. */}
            <Popover.Content class="usage-hud-picker">
              <Popover.Title class="usage-hud-picker-title">{t("account.usage.providers")}</Popover.Title>
              <For each={choices()} keyed={(item) => item.key}>
                {(item) => (
                  <Button
                    variant="ghost"
                    type="button"
                    class="usage-hud-picker-row"
                    aria-pressed={item().key === choice().key ? "true" : "false"}
                    onClick={() => choose(item().key)}
                  >
                    <ProviderLogo provider={item().row.provider} class="usage-hud-picker-logo" />
                    <span class="usage-hud-picker-name">{item().row.name}</span>
                    <span class="usage-hud-picker-bar" data-usage-tone={item().reading.hp.tone} aria-hidden="true">
                      <span
                        class="usage-hud-picker-fill"
                        style={{ "inline-size": `${Math.round(item().reading.hp.remainingPercent)}%` }}
                      />
                    </span>
                    <span class="usage-hud-picker-percent" data-usage-tone={item().reading.hp.tone}>
                      {format.percent(Math.round(item().reading.hp.remainingPercent) / 100)}
                    </span>
                    <Show when={item().key === choice().key} fallback={<span class="usage-hud-picker-check" />}>
                      <Check class="usage-hud-picker-check" aria-hidden="true" />
                    </Show>
                  </Button>
                )}
              </For>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </Show>
  );
}
