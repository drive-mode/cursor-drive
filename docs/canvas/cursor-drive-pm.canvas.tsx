import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  CollapsibleSection,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  TodoList,
  TodoListCard,
  UsageBar,
  type Color,
  type TodoItem,
  type TodoStatus,
  type UsageBarSegment,
} from "cursor/canvas";

type TrackRow = {
  id: string;
  track: string;
  item: string;
  status: TodoStatus;
  doc: string;
};

type BoardModel = {
  meta: { project: string; source: string; generatedAt: string };
  title: string;
  subtitle: string;
  stats: { value: string; label: string; tone?: "neutral" | "success" | "warning" }[];
  progress?: {
    segments: UsageBarSegment[];
    total: number;
    topLeftLabel: string;
    topRightLabel: string;
    caption?: string;
  };
  focusCallout?: { tone: "info" | "warning"; title: string; body: string };
  nextActions: TodoItem[];
  trackSections: { title: string; color: Color; rows: TrackRow[] }[];
  collapsiblePlans?: {
    title: string;
    defaultOpen?: boolean;
    goal?: string;
    todos?: TodoItem[];
    acceptance?: string[];
  }[];
  verification: { check: string; cmd: string; status: TodoStatus }[];
  backlog: { item: string; source: string }[];
  footer?: string;
};

const BOARD: BoardModel = {
    "meta": {
      "project": "cursor-drive",
      "source": "ai-secretagent/active/cursor-drive · 155 sessions",
      "generatedAt": "2026-06-01"
    },
    "title": "cursor-drive program board",
    "subtitle": "What shipped, what is in flight, and what still needs a plan.",
    "stats": [
      {
        "value": "155",
        "label": "Mapped sessions",
        "tone": "neutral"
      },
      {
        "value": "12",
        "label": "Action items",
        "tone": "neutral"
      },
      {
        "value": "yes",
        "label": "GitHub remote",
        "tone": "success"
      }
    ],
    "nextActions": [
      {
        "id": "a1",
        "content": "any TypeScript or build errors if they occur",
        "status": "pending"
      },
      {
        "id": "a2",
        "content": "| Result |",
        "status": "pending"
      },
      {
        "id": "a3",
        "content": "s successfully. No TypeScript or build errors",
        "status": "pending"
      },
      {
        "id": "a4",
        "content": ".inspectContextKeys` | See why UI is enabled/disabled | Yes ([drive-ui-surfaces-and-devtools.md](docs/design/ux/drive-ui",
        "status": "pending"
      },
      {
        "id": "a5",
        "content": ".setLogLevel` | Change extension log verbosity (Trace/Debug/Info) | Yes |",
        "status": "pending"
      },
      {
        "id": "a6",
        "content": ".webview.openDeveloperTools` | DevTools for Agent Screen webview | Yes (`cursorDrive.openWebviewDevTools`) |",
        "status": "pending"
      },
      {
        "id": "a7",
        "content": ".toggleScreencastMode` | Show mouse + keystrokes for demos | Yes |",
        "status": "pending"
      },
      {
        "id": "a8",
        "content": "a VS Code extension |",
        "status": "pending"
      }
    ],
    "trackSections": [
      {
        "title": "Recent session topics",
        "color": "blue",
        "rows": [
          {
            "id": "s1",
            "track": "Session",
            "item": "<user_query>",
            "status": "in_progress",
            "doc": "155 mapped sessions"
          },
          {
            "id": "s2",
            "track": "Session",
            "item": "<user_query>",
            "status": "pending",
            "doc": "155 mapped sessions"
          },
          {
            "id": "s3",
            "track": "Session",
            "item": "<attached_files>",
            "status": "pending",
            "doc": "155 mapped sessions"
          },
          {
            "id": "s4",
            "track": "Session",
            "item": "<user_query>",
            "status": "pending",
            "doc": "155 mapped sessions"
          },
          {
            "id": "s5",
            "track": "Session",
            "item": "<attached_files>",
            "status": "pending",
            "doc": "155 mapped sessions"
          }
        ]
      }
    ],
    "verification": [
      {
        "check": "Node tests",
        "cmd": "npm test",
        "status": "pending"
      }
    ],
    "backlog": [
      {
        "item": ".github/ISSUE_TEMPLATE/",
        "source": "session history"
      },
      {
        "item": ".github/labeler.yml",
        "source": "session history"
      },
      {
        "item": ".github/workflows",
        "source": "session history"
      },
      {
        "item": ".github/workflows/",
        "source": "session history"
      },
      {
        "item": ".github/workflows/ci.yml",
        "source": "session history"
      },
      {
        "item": ".github/workflows/cloudflare-token-test.yml",
        "source": "session history"
      }
    ],
    "progress": {
      "segments": [
        {
          "id": "done",
          "value": 0,
          "color": "green"
        },
        {
          "id": "left",
          "value": 12,
          "color": "gray"
        }
      ],
      "total": 12,
      "topLeftLabel": "0 of 12 action items done",
      "topRightLabel": "from session history",
      "caption": "Heuristic extraction from Cursor transcripts; review and edit."
    },
    "focusCallout": {
      "tone": "info",
      "title": "Retro-populated board",
      "body": "Seed data from Cursor session history. Edit docs/canvas and re-run generate_canvas after major milestones."
    },
    "collapsiblePlans": [
      {
        "title": "Kickoff reminders",
        "goal": "Run /project-kickoff for items not yet addressed.",
        "acceptance": [
          "README and docs/ exist",
          "CI wired or planned",
          "Secrets checklist reviewed if using cloud agents"
        ]
      }
    ],
    "footer": "Project path: C:\\Users\\harri\\Documents\\dev\\profiles\\ai-secretagent\\active\\cursor-drive"
  };

function countByStatus(rows: readonly TrackRow[]): Record<TodoStatus, number> {
  const out: Record<TodoStatus, number> = {
    completed: 0,
    in_progress: 0,
    pending: 0,
    cancelled: 0,
  };
  for (const r of rows) out[r.status] += 1;
  return out;
}

function statusPill(status: TodoStatus) {
  const map: Record<TodoStatus, { label: string; tone: "success" | "info" | "neutral" | "warning" }> = {
    completed: { label: "Done", tone: "success" },
    in_progress: { label: "Active", tone: "info" },
    pending: { label: "Todo", tone: "neutral" },
    cancelled: { label: "Cut", tone: "neutral" },
  };
  const m = map[status];
  return (
    <Pill tone={m.tone} active={status !== "pending"}>
      {m.label}
    </Pill>
  );
}

function trackTable(rows: readonly TrackRow[], color: Color) {
  return (
    <Table
      headers={["Track", "Work item", "Status", "Doc"]}
      rows={rows.map((r) => [
        <Row key={`${r.id}-sw`} gap={8} align="center">
          <Swatch color={color} />
          <Text weight="medium">{r.track}</Text>
        </Row>,
        r.item,
        statusPill(r.status),
        <Text tone="tertiary">{r.doc}</Text>,
      ])}
    />
  );
}

export default function CursorDrivePmCanvas() {
  const { meta, title, subtitle, stats, progress, focusCallout, nextActions, trackSections, collapsiblePlans, verification, backlog, footer } = BOARD;

  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>{title}</H1>
        <Text tone="tertiary">{subtitle}</Text>
        <Text tone="tertiary" size="small">
          Source: {meta.source} · generated {meta.generatedAt}
        </Text>
      </Stack>

      {stats.length > 0 ? (
        <Grid columns={Math.min(4, stats.length)} gap={12}>
          {stats.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} tone={s.tone ?? "neutral"} />
          ))}
        </Grid>
      ) : null}

      {progress ? (
        <Stack gap={6}>
          <H3>Progress</H3>
          <UsageBar
            segments={progress.segments}
            total={progress.total}
            topLeftLabel={progress.topLeftLabel}
            topRightLabel={progress.topRightLabel}
          />
          {progress.caption ? (
            <Text tone="tertiary" size="small">{progress.caption}</Text>
          ) : null}
        </Stack>
      ) : null}

      {focusCallout ? (
        <Callout tone={focusCallout.tone} title={focusCallout.title}>
          {focusCallout.body}
        </Callout>
      ) : null}

      {nextActions.length > 0 ? <TodoListCard todos={nextActions} defaultExpanded /> : null}

      {trackSections.map((sec) => (
        <Stack key={sec.title} gap={16}>
          <Divider />
          <H2>{sec.title}</H2>
          {trackTable(sec.rows, sec.color)}
        </Stack>
      ))}

      {collapsiblePlans?.map((plan) => (
        <Stack key={plan.title} gap={16}>
          <Divider />
          <CollapsibleSection title={plan.title} defaultOpen={plan.defaultOpen ?? false}>
            <Stack gap={16}>
              {plan.goal ? <Text>{plan.goal}</Text> : null}
              {plan.todos && plan.todos.length > 0 ? <TodoList todos={plan.todos} /> : null}
              {plan.acceptance && plan.acceptance.length > 0 ? (
                <Card variant="borderless">
                  <CardHeader>Acceptance</CardHeader>
                  <CardBody>
                    <Stack gap={8}>
                      {plan.acceptance.map((line) => (
                        <Text key={line}>{line}</Text>
                      ))}
                    </Stack>
                  </CardBody>
                </Card>
              ) : null}
            </Stack>
          </CollapsibleSection>
        </Stack>
      ))}

      {verification.length > 0 ? (
        <Stack gap={16}>
          <Divider />
          <H2>Verification gates</H2>
          <Table
            headers={["Gate", "Command / workflow", "Status"]}
            rows={verification.map((v) => [v.check, <Text tone="tertiary">{v.cmd}</Text>, statusPill(v.status)])}
          />
        </Stack>
      ) : null}

      {backlog.length > 0 ? (
        <Stack gap={16}>
          <Divider />
          <H2>Backlog</H2>
          <Table
            headers={["Item", "Source"]}
            rows={backlog.map((r) => [r.item, r.source])}
          />
        </Stack>
      ) : null}

      {footer ? (
        <Text tone="tertiary" size="small">{footer}</Text>
      ) : null}
    </Stack>
  );
}
