/**
 * WebhookSubscriber — forwards workflow events to an external webhook URL.
 *
 * Subscribes to the WorkflowEventEmitter singleton (same as WorkflowEventBridge)
 * and POSTs mapped events to WEBHOOK_URL. Fire-and-forget: delivery failures
 * are logged but never block the workflow executor.
 *
 * Config: WEBHOOK_URL env var. If not set, the subscriber is a no-op.
 */
import { createLogger } from '@archon/paths';
import {
  getWorkflowEventEmitter,
  type WorkflowEmitterEvent,
} from '@archon/workflows/event-emitter';
import { mapWorkflowEvent } from './workflow-bridge';

let cachedLog: ReturnType<typeof createLogger> | undefined;
function getLog(): ReturnType<typeof createLogger> {
  if (!cachedLog) cachedLog = createLogger('webhook');
  return cachedLog;
}

/** Events worth sending over the wire (skip noisy tool-level events) */
const WEBHOOK_EVENT_TYPES = new Set([
  'workflow_started',
  'workflow_completed',
  'workflow_failed',
  'step_started',
  'step_completed',
  'step_failed',
  'node_started',
  'node_completed',
  'node_failed',
  'node_skipped',
  'parallel_agent_started',
  'parallel_agent_completed',
  'parallel_agent_failed',
  'loop_iteration_started',
  'loop_iteration_completed',
  'loop_iteration_failed',
  'workflow_artifact',
]);

export class WebhookSubscriber {
  private unsubscribe: (() => void) | null = null;
  private webhookUrl: string | null;
  private webhookSecret: string | null;

  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL ?? null;
    this.webhookSecret = process.env.WEBHOOK_SECRET ?? null;
  }

  start(): void {
    if (!this.webhookUrl) {
      getLog().info('webhook_disabled (WEBHOOK_URL not set)');
      return;
    }

    getLog().info({ url: this.webhookUrl }, 'webhook_subscriber_started');
    const emitter = getWorkflowEventEmitter();

    this.unsubscribe = emitter.subscribe((event: WorkflowEmitterEvent) => {
      if (!WEBHOOK_EVENT_TYPES.has(event.type)) return;

      const conversationId = emitter.getConversationId(event.runId);
      const mapped = mapWorkflowEvent(event);
      if (!mapped) return;

      const payload = {
        source: 'archon',
        conversationId: conversationId ?? null,
        runId: event.runId,
        event: JSON.parse(mapped),
      };

      // Fire-and-forget POST
      this.deliver(payload).catch((err: unknown) => {
        getLog().warn(
          { err, eventType: event.type, runId: event.runId },
          'webhook_delivery_failed'
        );
      });
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private async deliver(payload: Record<string, unknown>): Promise<void> {
    if (!this.webhookUrl) return;

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.webhookSecret) {
      headers.Authorization = `Bearer ${this.webhookSecret}`;
    }

    // Bun-specific: skip TLS verification for local self-signed certs
    const fetchOptions: RequestInit & { tls?: { rejectUnauthorized: boolean } } = {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(5000),
      tls: { rejectUnauthorized: false },
    };

    const response = await fetch(this.webhookUrl, fetchOptions);

    if (!response.ok) {
      getLog().warn({ status: response.status, url: this.webhookUrl }, 'webhook_delivery_rejected');
    }
  }
}
