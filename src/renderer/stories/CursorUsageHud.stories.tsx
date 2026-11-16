import type { AccountUsageLimit, MachineMetrics } from "@openbot/contracts/ipc";
import { accountUsageProviderRows } from "@openbot/ui/features/account/account-usage-view";
import { type CursorHudMachine, CursorUsageHud } from "@openbot/ui/features/usage/CursorUsageHud";
import type { Meta, StoryObj } from "storybook-solidjs-vite";

const monthlyReset = Math.floor(Date.now() / 1_000) + 23 * 86_400 + 4 * 3_600;
const cycle = { windowDurationMins: 43_200, resetsAt: monthlyReset };
const GIB = 1024 ** 3;

/** The rows of one Cursor reading, built by the same view model as the app. */
function cursorRows(limit: Omit<AccountUsageLimit, "id">) {
  return accountUsageProviderRows({ limits: [{ id: "cursor", ...limit }] });
}

function machine(cpuPercent: number | null, memoryUsedGib: number): CursorHudMachine {
  const metrics: MachineMetrics = {
    diskUsedBytes: 120 * GIB,
    diskFreeBytes: 380 * GIB,
    diskTotalBytes: 500 * GIB,
    memoryAvailableBytes: (32 - memoryUsedGib) * GIB,
    memoryTotalBytes: 32 * GIB,
    cpuPercent,
    cpuMillicores: 8_000,
    checkedAt: new Date().toISOString(),
  };
  return { name: "kong-lab", metrics };
}

const meta = {
  title: "Usage/Cursor HUD",
  component: CursorUsageHud,
  parameters: { layout: "padded" },
  decorators: [
    // The default width of the agent list, at whose bottom the HUD sits.
    (Story) => (
      <div
        style={{
          width: "280px",
          display: "flex",
          "flex-direction": "column",
          padding: "8px 0",
          background: "var(--openbot-bg-sidebar)",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CursorUsageHud>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A split plan with the machine use of the kong-lab server in the ring. */
export const SplitPlan: Story = {
  args: {
    rows: cursorRows({
      primary: { usedPercent: 25, ...cycle },
      secondary: { usedPercent: 1, ...cycle },
      tertiary: { usedPercent: 23, ...cycle },
    }),
    machine: machine(34, 14),
  },
};

/** Little left, and a busy server: the parts take the warning and the critical tones. */
export const Low: Story = {
  args: {
    rows: cursorRows({
      primary: { usedPercent: 96, ...cycle, resetsAt: monthlyReset - 21 * 86_400 },
      secondary: { usedPercent: 69, ...cycle, resetsAt: monthlyReset - 21 * 86_400 },
      tertiary: { usedPercent: 91, ...cycle, resetsAt: monthlyReset - 21 * 86_400 },
    }),
    machine: machine(97, 28),
  },
};

/** A merged plan reports its total only, so the HUD has no pool bars. */
export const MergedPlan: Story = {
  args: {
    rows: cursorRows({ primary: { usedPercent: 42, ...cycle }, secondary: null, sharedQuotaWith: "grok" }),
    machine: machine(null, 9),
  },
};

/** Claude, Codex and Cursor report usage: a click on the HUD lists them to show another one. */
export const Providers: Story = {
  args: {
    rows: accountUsageProviderRows({
      limits: [
        {
          id: "claude",
          primary: { usedPercent: 38, windowDurationMins: 300, resetsAt: monthlyReset - 22 * 86_400 },
          secondary: { usedPercent: 64, windowDurationMins: 10_080, resetsAt: monthlyReset - 18 * 86_400 },
        },
        {
          id: "codex",
          primary: { usedPercent: 12, windowDurationMins: 300, resetsAt: monthlyReset - 22 * 86_400 },
          secondary: { usedPercent: 30, windowDurationMins: 10_080, resetsAt: monthlyReset - 19 * 86_400 },
        },
        {
          id: "cursor",
          primary: { usedPercent: 72, ...cycle },
          secondary: { usedPercent: 13, ...cycle },
          tertiary: { usedPercent: 72, ...cycle },
        },
      ],
    }),
    machine: machine(18, 20),
  },
};

/** The web client, or a member who cannot read the machine: the reactor stays dark. HP is the lower pool. */
export const NoMachine: Story = {
  args: {
    rows: cursorRows({ primary: { usedPercent: 40, ...cycle }, secondary: { usedPercent: 12, ...cycle } }),
  },
};
