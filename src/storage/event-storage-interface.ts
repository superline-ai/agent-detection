import { EventPayloads, EventType } from "../types/events";

/**
 * Event data structure stored in storage
 */
export interface StoredEvent<T extends EventType = EventType> {
  id?: number;
  type: T;
  timestamp: number;
  data: EventPayloads[T];
  extractorType: string;
}

/**
 * Interface for event storage implementations
 */
export interface IEventStorage {
  /**
   * Store an event
   */
  storeEvent<T extends EventType>(
    event: Omit<StoredEvent<T>, "id">
  ): Promise<number>;

  /**
   * Store multiple events in a single operation
   */
  storeEvents<T extends EventType>(
    events: Omit<StoredEvent<T>, "id">[]
  ): Promise<void>;

  /**
   * Flush any buffered events to storage
   */
  flush(): Promise<void>;

  /**
   * Get all events for a specific extractor type in current session
   */
  getEventsByExtractorType(extractorType: string): Promise<StoredEvent[]>;

  /**
   * Get all events for the current session
   */
  getAllEvents(): Promise<StoredEvent[]>;

  /**
   * Get the current session ID
   */
  getSessionId(): string;

  /**
   * Set a specific session ID (used when restoring a session)
   */
  setSessionId(sessionId: string): void;

  /**
   * Check if a session exists and load it
   */
  checkForExistingSession(): Promise<boolean>;

  /**
   * Save the current session ID to storage
   */
  saveSessionToStorage(): void;

  /**
   * Clear session from storage
   */
  clearSessionFromStorage(): void;

  /**
   * Clear all events for the current session
   */
  clearCurrentSessionEvents(): Promise<void>;

  /**
   * Clear all events older than the specified time
   */
  clearOldEvents(maxAgeMs: number): Promise<void>;

  /**
   * Close the storage and clean up
   */
  close(): Promise<void>;
}
