import { BrowserMetadata } from "./types/browser-metadata";
import { EventPayloads, EventType } from "./types/events";

/**
 * Interface for retrieving browser metadata information.
 * Abstracts the implementation details for different environments.
 */
export interface MetadataPort {
  getMetadata(): Promise<BrowserMetadata>;
}

/**
 * Interface for managing event listeners.
 * Provides methods to subscribe to and unsubscribe from browser events.
 */
export interface EventPort {
  on<K extends EventType>(
    evt: K,
    handler: (payload: EventPayloads[K]) => void
  ): void;
  off<K extends EventType>(
    evt: K,
    handler: (payload: EventPayloads[K]) => void
  ): void;
}

/**
 * Provides access to both metadata and event systems.
 * Acts as the main entry point for interacting with the agent detection system.
 */
export interface Environment {
  metadata: MetadataPort;
  events: EventPort;
  start(): Promise<void>;
}
