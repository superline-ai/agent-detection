import { Environment, EventPort, MetadataPort } from "../../ports";
import { BrowserMetadataAdapter } from "./browser-metadata.adapter";
import { BrowserEventAdapter } from "./event.adapter";

/**
 * Implementation of Environment interface for web browser environments.
 * Provides access to browser-specific metadata and event handling.
 * Serves as the primary interface for interacting with browser-based user sessions.
 */
export class BrowserEnvironment implements Environment {
  metadata: MetadataPort;
  events: EventPort;

  /**
   * Creates a new browser environment with metadata and event adapters.
   */
  constructor() {
    this.metadata = new BrowserMetadataAdapter();
    this.events = new BrowserEventAdapter();
  }

  /**
   * Initializes the browser environment.
   * Currently a no-op as browser environment is ready immediately upon construction.
   */
  async start(): Promise<void> {}
}
