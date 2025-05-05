import { IEventStorage, StoredEvent } from "./event-storage-interface";

/**
 * MockEventStorage provides an in-memory implementation of the IEventStorage interface
 * for testing and replay environments where browser APIs are not available.
 */
export class MockEventStorage implements IEventStorage {
  private sessionId: string;
  private events: StoredEvent[] = [];
  private nextId: number = 1;
  private sessionStorage: Record<string, string> = {};

  constructor(initialSessionId?: string) {
    this.sessionId = initialSessionId || this.generateSessionId();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `session-${timestamp}-${random}`;
  }

  /**
   * Store an event in memory
   */
  public async storeEvent(event: Omit<StoredEvent, "id">): Promise<number> {
    const id = this.nextId++;
    const storedEvent: StoredEvent = {
      ...event,
      id,
    };

    this.events.push(storedEvent);
    return id;
  }

  /**
   * No-op flush for mock implementation
   */
  public async flush(): Promise<void> {
    // No buffering in mock implementation, so flush is a no-op
    return Promise.resolve();
  }

  /**
   * Store multiple events in memory
   */
  public async storeEvents(events: Omit<StoredEvent, "id">[]): Promise<void> {
    for (const event of events) {
      await this.storeEvent(event);
    }
  }

  /**
   * Get all events for a specific extractor type in current session
   */
  public async getEventsByExtractorType(
    extractorType: string
  ): Promise<StoredEvent[]> {
    return this.events.filter((event) => event.extractorType === extractorType);
  }

  /**
   * Get all events for the current session
   */
  public async getAllEvents(): Promise<StoredEvent[]> {
    return [...this.events];
  }

  /**
   * Get the current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set a specific session ID
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Check if a session exists (always returns false for mock implementation)
   */
  public async checkForExistingSession(): Promise<boolean> {
    const storedSessionId = this.sessionStorage["agent-detection-session-id"];

    if (storedSessionId) {
      this.sessionId = storedSessionId;
      return true;
    }

    return false;
  }

  /**
   * Save the current session ID to in-memory storage
   */
  public saveSessionToStorage(): void {
    this.sessionStorage["agent-detection-session-id"] = this.sessionId;
  }

  /**
   * Clear session from in-memory storage
   */
  public clearSessionFromStorage(): void {
    delete this.sessionStorage["agent-detection-session-id"];
  }

  /**
   * Clear all events for the current session
   */
  public async clearCurrentSessionEvents(): Promise<void> {
    this.events = [];
  }

  /**
   * Clear all events older than the specified time
   */
  public async clearOldEvents(maxAgeMs: number): Promise<void> {
    const cutoffTimestamp = Date.now() - maxAgeMs;
    this.events = this.events.filter(
      (event) => event.timestamp >= cutoffTimestamp
    );
  }

  /**
   * Close the storage and clean up (no-op for mock implementation)
   */
  public async close(): Promise<void> {
    // No resources to clean up in mock implementation
    return Promise.resolve();
  }

  /**
   * Preload events into the mock storage (useful for testing and replay)
   */
  public preloadEvents(events: StoredEvent[]): void {
    // Ensure we preserve the provided IDs when preloading
    this.events = [...events];

    // Update the next ID to be greater than any existing ID
    const maxId = Math.max(0, ...events.map((e) => e.id || 0));
    this.nextId = maxId + 1;
  }
}
