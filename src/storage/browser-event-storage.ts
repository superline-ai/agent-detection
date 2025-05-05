import { IDBPDatabase, openDB } from "idb";
import { v4 as uuidv4 } from "uuid";
import { IEventStorage, StoredEvent } from "./event-storage-interface";

/**
 * BrowserEventStorage class for managing event data persistence using IndexedDB
 * Uses buffering for better performance
 */
export class BrowserEventStorage implements IEventStorage {
  private dbPromise: Promise<IDBPDatabase>;
  private readonly DB_NAME = "agent-detection-events";
  private readonly STORE_NAME = "events";
  private readonly DB_VERSION = 1;
  private sessionId: string;

  // Buffering settings
  private buffer: Omit<StoredEvent, "id">[] = [];
  private readonly BUFFER_SIZE = 50; // Flush after 50 events
  private readonly FLUSH_INTERVAL = 5000; // Flush every 5 seconds
  private flushIntervalId: number | null = null;
  private isFlushPending = false;

  constructor() {
    this.sessionId = uuidv4();
    this.dbPromise = this.initDatabase();
    this.setupFlushInterval();
    this.setupPageVisibilityListener();
    this.setupBeforeUnloadListener();
  }

  /**
   * Initialize the IndexedDB database
   */
  private initDatabase(): Promise<IDBPDatabase> {
    return openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("events")) {
          const store = db.createObjectStore("events", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("sessionId", "sessionId", { unique: false });
          store.createIndex("extractorType", "extractorType", {
            unique: false,
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      },
    });
  }

  /**
   * Set up automatic flush interval
   */
  private setupFlushInterval(): void {
    // Use setInterval and store the ID for later cleanup
    this.flushIntervalId = window.setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Set up listener for page visibility changes
   * Flushes when page becomes hidden
   */
  private setupPageVisibilityListener(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && this.buffer.length > 0) {
        this.flushSync();
      }
    });
  }

  /**
   * Set up listener for page unload
   * Uses sync API to ensure data is saved before page unloads
   */
  private setupBeforeUnloadListener(): void {
    window.addEventListener("beforeunload", () => {
      if (this.buffer.length > 0) {
        this.flushSync();
      }
    });
  }

  /**
   * Cleanup event listeners and intervals
   */
  private cleanup(): void {
    if (this.flushIntervalId !== null) {
      window.clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
  }

  /**
   * Store an event in the buffer, flush if buffer is full
   */
  public async storeEvent(event: Omit<StoredEvent, "id">): Promise<number> {
    // Add to buffer
    this.buffer.push(event);

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }

    // Return approximated ID (actual ID will be assigned on flush)
    return Date.now();
  }

  /**
   * Synchronously flush buffer using the synchronous IndexedDB API
   * This is used for beforeunload events to ensure data is saved
   */
  private flushSync(): void {
    if (this.buffer.length === 0 || this.isFlushPending) return;

    try {
      this.isFlushPending = true;
      const bufferCopy = [...this.buffer];
      this.buffer = [];

      // Use legacy synchronous IndexedDB API for unload scenarios
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        const store = tx.objectStore(this.STORE_NAME);

        bufferCopy.forEach((event) => {
          store.add({
            ...event,
            sessionId: this.sessionId,
          });
        });

        tx.oncomplete = () => {
          db.close();
          this.isFlushPending = false;
        };

        tx.onerror = () => {
          db.close();
          this.isFlushPending = false;
        };
      };

      request.onerror = () => {
        this.isFlushPending = false;
      };
    } catch (error) {
      console.error("Error during sync flush:", error);
      this.isFlushPending = false;
    }
  }

  /**
   * Flush buffer to IndexedDB
   */
  public async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushPending) return;

    try {
      this.isFlushPending = true;
      const bufferCopy = [...this.buffer];
      this.buffer = [];

      await this.storeEvents(bufferCopy);
      this.isFlushPending = false;
    } catch (error) {
      // On error, restore events to buffer
      console.error("Error during flush:", error);
      this.buffer = [...this.buffer, ...this.buffer];
      this.isFlushPending = false;
    }
  }

  /**
   * Store multiple events in a single transaction
   */
  public async storeEvents(events: Omit<StoredEvent, "id">[]): Promise<void> {
    if (events.length === 0) return;

    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, "readwrite");

    await Promise.all([
      ...events.map((event) =>
        tx.store.add({
          ...event,
          sessionId: this.sessionId,
        })
      ),
      tx.done,
    ]);
  }

  /**
   * Get all events for a specific extractor type in current session
   */
  public async getEventsByExtractorType(
    extractorType: string
  ): Promise<StoredEvent[]> {
    // Make sure buffer is flushed before reading
    await this.flush();

    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, "readonly");
    const index = tx.store.index("extractorType");

    const events = await index.getAll(IDBKeyRange.only(extractorType));
    return events.filter((event) => event.sessionId === this.sessionId);
  }

  /**
   * Get all events for the current session
   */
  public async getAllEvents(): Promise<StoredEvent[]> {
    // Make sure buffer is flushed before reading
    await this.flush();

    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, "readonly");
    const index = tx.store.index("sessionId");

    return index.getAll(IDBKeyRange.only(this.sessionId));
  }

  /**
   * Get the current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Set a specific session ID (used when restoring a session)
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Check if a session exists and load it
   */
  public async checkForExistingSession(): Promise<boolean> {
    const storedSessionId = sessionStorage.getItem(
      "agent-detection-session-id"
    );

    if (storedSessionId) {
      this.sessionId = storedSessionId;
      return true;
    }

    return false;
  }

  /**
   * Save the current session ID to sessionStorage
   */
  public saveSessionToStorage(): void {
    sessionStorage.setItem("agent-detection-session-id", this.sessionId);
  }

  /**
   * Clear session from sessionStorage
   */
  public clearSessionFromStorage(): void {
    sessionStorage.removeItem("agent-detection-session-id");
  }

  /**
   * Clear all events for the current session
   */
  public async clearCurrentSessionEvents(): Promise<void> {
    // Clear buffer first
    this.buffer = [];

    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    const index = tx.store.index("sessionId");

    let cursor = await index.openCursor(IDBKeyRange.only(this.sessionId));

    while (cursor) {
      cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  /**
   * Clear all events older than the specified time
   */
  public async clearOldEvents(maxAgeMs: number): Promise<void> {
    const cutoffTimestamp = Date.now() - maxAgeMs;
    const db = await this.dbPromise;
    const tx = db.transaction(this.STORE_NAME, "readwrite");
    const index = tx.store.index("timestamp");

    let cursor = await index.openCursor(
      IDBKeyRange.upperBound(cutoffTimestamp)
    );

    while (cursor) {
      cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  /**
   * Close the database connection and clean up
   */
  public async close(): Promise<void> {
    // Flush any remaining events
    await this.flush();

    // Clean up event listeners and intervals
    this.cleanup();

    const db = await this.dbPromise;
    db.close();
  }
}
