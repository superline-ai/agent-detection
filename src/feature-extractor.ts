import { EventPort, MetadataPort } from "./ports";
import { StoredEvent } from "./storage";
import { EventPayloads, EventType } from "./types/events";

/**
 * Represents the result of a feature extraction process.
 * @template TFeatures The type of the features object.
 */
export interface FeatureResult<TFeatures extends Record<string, any>> {
  /**
   * A record containing the extracted feature names and their values.
   */
  features: TFeatures;
  /**
   * Indicates whether the component had sufficient data to extract features.
   * If false, the features object might be empty or contain default/placeholder values.
   */
  hasData: boolean;
}

/**
 * Defines a handler for a specific event type
 */
export interface EventHandler<T extends EventType> {
  eventType: T;
  handler: (payload: EventPayloads[T]) => void;
}

/**
 * Abstract base class for components that extract features from metadata or events.
 * @template TFeatures The type of the features object this extractor produces.
 */
export abstract class FeatureExtractor<
  TFeatures extends Record<string, any> = Record<string, any>
> {
  protected metadataProvider: MetadataPort;
  protected eventsProvider: EventPort;
  public isListening: boolean = false;

  /**
   * Initializes the feature extractor with data providers.
   * @param metadataProvider Port for accessing browser/device metadata.
   * @param eventsProvider Port for subscribing to user interaction events.
   */
  constructor(metadataProvider: MetadataPort, eventsProvider: EventPort) {
    this.metadataProvider = metadataProvider;
    this.eventsProvider = eventsProvider;
    this.isListening = false;
  }

  /**
   * Marks the extractor as started. The actual event registration is handled by the manager.
   */
  startListening(): void {
    this.isListening = true;
  }

  /**
   * Marks the extractor as stopped. The actual event deregistration is handled by the manager.
   */
  stopListening(): void {
    this.isListening = false;
  }

  /**
   * Extracts features based on the currently collected data.
   * This method should execute synchronously or resolve immediately.
   * For metadata-based extractors, this might involve an async call to the provider.
   * @returns A FeatureResult or a Promise resolving to a FeatureResult.
   */
  abstract extractFeatures():
    | FeatureResult<TFeatures>
    | Promise<FeatureResult<TFeatures>>;

  /**
   * Returns the default features for this extractor, typically used when hasData is false.
   */
  abstract getDefaultFeatures(): TFeatures;

  /**
   * Process events loaded from storage
   * This method should be implemented by classes that need to process stored events
   * @param events The stored events for this extractor
   */
  abstract processEvents(events: StoredEvent[]): void;

  /**
   * Get event handlers that should be registered by the manager
   * Each handler includes the event type and the function to handle that event
   */
  abstract getEventHandlers(): EventHandler<EventType>[];

  /**
   * Get the list of event types this extractor is interested in
   * Used to determine which events to store for this extractor
   */
  getRelevantEventTypes(): EventType[] {
    // Default implementation derives event types from the handlers
    return this.getEventHandlers().map((handler) => handler.eventType);
  }
}
