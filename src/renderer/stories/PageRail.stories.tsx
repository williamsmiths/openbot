import { ServerMenu } from "@openbot/ui/features/servers/ServerMenu";
import {
  type CustomAgentUsageRailRow,
  PageRail,
  type PageRailPage,
  type PageRailPinnablePage,
  type PageRailProps,
} from "@openbot/ui/features/window/PageRail";
import { useText } from "@openbot/ui/text";
import { createSignal } from "solid-js";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { STORY_SERVERS } from "./fixtures";

/** An example answer. Each agent writes its own text, which the card shows as it is. */
const customAgentUsage: CustomAgentUsageRailRow[] = [
  { id: "devin", name: "Devin", text: "Plan: Team\nACUs used this cycle: 42 of 250\nThe cycle resets in 12 days." },
];

/** The page rail as the desktop window shows it, with the menu of the open server at its end. Hover a button, or move to it with Tab, to see its tooltip. */
function RailPreview(props: {
  updateReady?: boolean;
  logo?: PageRailProps["logo"];
  customAgentUsage?: readonly CustomAgentUsageRailRow[];
}) {
  const { t } = useText();
  const [current, setCurrent] = createSignal<PageRailPage | null>("agents");
  const [pinned, setPinned] = createSignal<readonly PageRailPinnablePage[]>(["usage"]);
  return (
    // The extra box keeps the rail out of the rule that hides it in a narrow window.
    <div class="app-window" style={{ height: "100vh" }}>
      <div style={{ display: "flex" }}>
        <PageRail
          hidden={false}
          current={current()}
          pinned={pinned()}
          onPinChange={(page, pin) =>
            setPinned((pages) => (pin ? [...pages, page] : pages.filter((other) => other !== page)))
          }
          customAgentUsage={props.customAgentUsage}
          onAgents={() => setCurrent("agents")}
          onRoutines={() => setCurrent("routines")}
          onSchedule={() => setCurrent("schedule")}
          onUsage={() => setCurrent("usage")}
          onMarketplace={fn()}
          onSettings={() => setCurrent("settings")}
          settingsNotice={props.updateReady ? t("account.update.ready") : undefined}
          logo={props.logo}
          server={
            <ServerMenu
              rail
              serverName={STORY_SERVERS.find((server) => server.active)?.name ?? ""}
              servers={STORY_SERVERS}
              view="menu"
              onViewChange={fn()}
              onSelect={fn()}
              onAdd={fn()}
              onSetMuted={fn()}
              onOpenNotificationSettings={fn()}
              onOpenSettings={fn()}
            />
          }
        />
      </div>
    </div>
  );
}

const meta = {
  title: "Window/PageRail",
  component: RailPreview,
} satisfies Meta<typeof RailPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The Settings tooltip also says what the dot stands for. */
export const SettingsNotice: Story = {
  args: { updateReady: true },
};

/** A custom agent with a usage command: its logo with no ring. Hover it to see the answer. */
export const CustomAgentUsage: Story = {
  args: { customAgentUsage },
};

/** The web client: no macOS window buttons, so the logo in the top row links to the OpenBot site. */
export const WebLogo: Story = {
  args: { logo: { variant: "production", href: "/" } },
};

/** Windows and Linux: the logo is in the top row, with no link. */
export const DesktopLogo: Story = {
  args: { logo: { variant: "production" } },
};
