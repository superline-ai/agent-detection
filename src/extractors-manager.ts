import { FeatureExtractor } from "./feature-extractor";
import { Logger, LogLevel } from "./logger";
import { EventPort, MetadataPort } from "./ports";
import { IEventStorage, StoredEvent } from "./storage";
import { EventType } from "./types/events";
import {
  createThrottledEventHandler,
  DEFAULT_THROTTLE_CONFIG,
  ThrottleConfig,
} from "./utils/throttle";

/**
 * Type definition for extractor constructor
 */
type ExtractorClass<T extends Record<string, any> = Record<string, any>> = new (
  metadataProvider: MetadataPort,
  eventsProvider: EventPort
) => FeatureExtractor<T>;

/**
 * Manages extractors and centralized event storage
 */
export class ExtractorsManager {
  private extractors: FeatureExtractor<any>[] = [];
  private logger: Logger;
  private isActive: boolean = false;
  private registeredHandlers: Map<EventType, Array<(payload: any) => void>> =
    new Map();
  private throttleConfig: ThrottleConfig;

  constructor(
    private metadataProvider: MetadataPort,
    private eventsProvider: EventPort,
    private eventStorage: IEventStorage,
    private debug: boolean = false,
    throttleConfig?: ThrottleConfig
  ) {
    this.logger = new Logger({
      component: this.constructor.name,
      minLevel: this.debug ? LogLevel.DEBUG : LogLevel.INFO,
      forceEnabled: false,
    });
    this.throttleConfig = throttleConfig || DEFAULT_THROTTLE_CONFIG;
  }

  /**
   * Initialize extractors
   */
  public initExtractors(extractorClasses: ExtractorClass[]): void {
    this.extractors = extractorClasses.map(
      (ExtractorClass) =>
        new ExtractorClass(this.metadataProvider, this.eventsProvider)
    );
    this.logger.debug(`Initialized ${this.extractors.length} extractors`);
  }

  /**
   * Start capturing events for all extractors
   */
  public async startListening(): Promise<void> {
    if (this.isActive) return;

    this.logger.debug("Starting extractors and registering event handlers");

    // First, load and process existing events
    await this.loadAndProcessEvents();

    // Register event handlers for all extractors
    this.registerEventHandlers();

    // Start all extractors (sets their internal isListening flag)
    for (const extractor of this.extractors) {
      extractor.startListening();
    }

    this.isActive = true;
  }

  /**
   * Stop capturing events for all extractors
   */
  public stopListening(): void {
    if (!this.isActive) return;

    this.logger.debug("Stopping extractors and removing event handlers");

    // Unregister event handlers
    this.unregisterEventHandlers();

    // Stop all extractors (sets their internal isListening flag)
    for (const extractor of this.extractors) {
      extractor.stopListening();
    }

    this.isActive = false;
  }

  /**
   * Get all initialized extractors
   */
  public getExtractors(): FeatureExtractor<any>[] {
    return this.extractors;
  }

  /**
   * Load events from storage and process them for each extractor
   */
  private async loadAndProcessEvents(): Promise<void> {
    this.logger.debug(
      "Loading and processing stored events for all extractors"
    );

    // Get all events from storage
    const allEvents = await this.eventStorage.getAllEvents();
    this.logger.debug(`Loaded ${allEvents.length} total events from storage`);

    // Process events by extractor type
    for (const extractor of this.extractors) {
      const extractorType = extractor.constructor.name;
      const extractorEvents = allEvents.filter(
        (event) => event.extractorType === extractorType
      );

      if (extractorEvents.length > 0) {
        this.logger.debug(
          `Found ${extractorEvents.length} events for ${extractorType}`
        );
        // Process events in the extractor
        extractor.processEvents(extractorEvents);
      }
    }
  }

  /**
   * Register all event handlers from extractors
   */
  private registerEventHandlers(): void {
    this.registeredHandlers.clear();

    for (const extractor of this.extractors) {
      const extractorType = extractor.constructor.name;
      const handlers = extractor.getEventHandlers();

      for (const { eventType, handler } of handlers) {
        // Create a wrapped handler that handles throttling and storing events
        const storeAndHandleEvent = (payload: any) => {
          // Only process if the extractor is still listening
          if (extractor.isListening) {
            // Call the extractor's handler
            handler(payload);

            // Store the event in the central storage after handler is called
            this.storeEvent(eventType, payload, extractorType);
          }
        };

        // Apply throttling to the handler
        const throttledHandler = createThrottledEventHandler(
          eventType,
          storeAndHandleEvent,
          this.throttleConfig
        );

        // Add to our internal map for later removal
        if (!this.registeredHandlers.has(eventType)) {
          this.registeredHandlers.set(eventType, []);
        }
        this.registeredHandlers.get(eventType)!.push(throttledHandler);

        // Register with the event provider
        this.eventsProvider.on(eventType, throttledHandler);

        this.logger.debug(
          `Registered ${
            this.throttleConfig.eventThrottleTimes.has(eventType)
              ? "throttled "
              : ""
          }handler for ${eventType} event from ${extractorType}`
        );
      }
    }
  }

  /**
   * Unregister all event handlers
   */
  private unregisterEventHandlers(): void {
    for (const [eventType, handlers] of this.registeredHandlers.entries()) {
      for (const handler of handlers) {
        this.eventsProvider.off(eventType as EventType, handler);
      }
    }

    this.registeredHandlers.clear();
    this.logger.debug("Unregistered all event handlers");
  }

  /**
   * Store an event in the storage
   */
  private storeEvent(
    eventType: EventType,
    payload: any,
    extractorType: string
  ): void {
    const event: Omit<StoredEvent<typeof eventType>, "id"> = {
      type: eventType,
      data: payload,
      timestamp: payload.timestamp,
      extractorType,
    };

    this.eventStorage.storeEvent(event);
  }
}
