/**
 * Snapshot feed — contract scaffold for future pixel-streaming tier.
 *
 * This file defines the interface and event schema for a future snapshot
 * feed that would provide real-time visual state of operator worktrees
 * (e.g., screenshot streams, terminal captures). The current implementation
 * is interface-only — no streaming or pixel transport is included.
 *
 * Future pixel layer can plug in without changing control-plane contracts
 * by implementing SnapshotFeedProvider and emitting SnapshotFrameEvent.
 *
 * Privacy note: snapshot data may contain sensitive code or terminal output.
 * Any future implementation must respect cursorDrive.privacy settings and
 * apply the same redaction pipeline as other Drive outputs.
 */

// ── Snapshot frame event ────────────────────────────────────────────────

/** Types of snapshot frames. */
export type SnapshotFrameType =
  | "screenshot"  // Full or partial screenshot of operator IDE
  | "terminal"    // Terminal output capture
  | "diff"        // Code diff snapshot
  | "metadata";   // Lightweight metadata-only frame (no pixels)

/** A single frame in the snapshot feed. */
export interface SnapshotFrameEvent {
  type: SnapshotFrameType;
  operatorId: string;
  operatorName: string;
  timestamp: number;
  /** Frame sequence number (monotonically increasing per operator). */
  sequence: number;
  /** MIME type of the payload (e.g., "image/png", "text/plain"). */
  mimeType?: string;
  /**
   * Base64-encoded payload for binary frames (screenshots).
   * Plain text for terminal/diff frames.
   * Undefined for metadata-only frames.
   */
  payload?: string;
  /** Metadata associated with this frame. */
  metadata?: {
    /** Active file in the operator's editor (if known). */
    activeFile?: string;
    /** Terminal command being executed (if applicable). */
    command?: string;
    /** Size of the viewport (if applicable). */
    viewport?: { width: number; height: number };
  };
}

// ── Provider interface ──────────────────────────────────────────────────

/**
 * Interface for snapshot feed providers.
 *
 * A provider captures visual/terminal state from an operator's worktree
 * and emits SnapshotFrameEvent instances. Multiple providers can coexist
 * (e.g., one for screenshots, one for terminal capture).
 */
export interface SnapshotFeedProvider {
  /** Unique identifier for this provider. */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Frame types this provider can emit. */
  readonly supportedTypes: SnapshotFrameType[];

  /**
   * Start capturing frames for an operator.
   * @param operatorId  The operator to capture.
   * @param onFrame     Callback invoked for each captured frame.
   */
  startCapture(
    operatorId: string,
    onFrame: (event: SnapshotFrameEvent) => void
  ): Promise<void>;

  /** Stop capturing frames for an operator. */
  stopCapture(operatorId: string): Promise<void>;

  /** Check if this provider is available in the current environment. */
  isAvailable(): Promise<boolean>;

  /** Dispose of all resources. */
  dispose(): void;
}

// ── Placeholder consumer for Agent Screen ───────────────────────────────

/**
 * Activity event type for snapshot frames in the Agent Screen.
 * This extends the existing ActivityEvent union in agentScreen.ts.
 *
 * When a SnapshotFeedProvider is active, the extension would:
 *   1. Start capture for each active operator
 *   2. Forward SnapshotFrameEvent → AgentScreen via postEvent
 *   3. The webview would render the latest frame in a dedicated panel
 *
 * This scaffold establishes the contract without any implementation.
 */
export interface SnapshotActivityEvent {
  type: "snapshotFrame";
  operatorId: string;
  operatorName: string;
  frameType: SnapshotFrameType;
  timestamp: number;
  /** For metadata frames only — lightweight summary for the activity log. */
  summary?: string;
}
