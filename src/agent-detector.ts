import { FeatureExtractor, FeatureResult } from "./feature-extractor";
import { Logger, LogLevel } from "./logger";
import { MODEL_PARAMETERS } from "./model-parameters";
import { EventPort, MetadataPort } from "./ports";
import { DetectionResult, ModelParameters } from "./types/detection-types";
import {
  oneHotEncode,
  sigmoid,
  standardize,
  toSnakeCase,
} from "./utils/math-utils";

// Import individual extractors
import { ExtractorsManager } from "./extractors-manager";
import { BrowserMetadataExtractor } from "./extractors/browser-metadata-extractor";
import { ClickEventExtractor } from "./extractors/click-event-extractor";
import { KeyboardEventExtractor } from "./extractors/keyboard-event-extractor";
import { MouseEventExtractor } from "./extractors/mouse-event-extractor";
import { ScrollEventExtractor } from "./extractors/scroll-event-extractor";
import { BrowserEventStorage, IEventStorage } from "./storage";

/**
 * Type definition for extractor constructor functions.
 * Requires that the constructor takes metadata and events providers and returns a feature extractor.
 */
type ExtractorClass<T extends Record<string, any> = Record<string, any>> = new (
  metadataProvider: MetadataPort,
  eventsProvider: EventPort
) => FeatureExtractor<T>;

/**
 * Default set of feature extractors used for agent detection.
 * These extractors analyze various aspects of browser behavior and user interaction patterns.
 */
export const DEFAULT_EXTRACTORS: ExtractorClass[] = [
  BrowserMetadataExtractor,
  MouseEventExtractor,
  KeyboardEventExtractor,
  ScrollEventExtractor,
  ClickEventExtractor,
];

/**
 * Main agent detection system that analyzes user behavior to identify automated agents.
 * Uses a combination of browser metadata and user interaction patterns to calculate
 * the probability that current interactions are coming from an automated agent.
 * Supports real-time detection and offline analysis of user sessions.
 */
export class AgentDetector {
  private debug: boolean = false;
  private apiKey: string | null = null;
  private onDetectionCallback: ((result: DetectionResult) => void) | null =
    null;
  private initialized: boolean = false;
  private metadataProvider: MetadataPort;
  private eventsProvider: EventPort;
  private modelParameters: ModelParameters | null = null;
  private logger: Logger;
  private eventStorage: IEventStorage;
  private sessionRestored: boolean = false;
  private extractorsManager: ExtractorsManager;

  // State for managing detection
  private isDetectionActive: boolean = false;
  private isDetectionFinalizing: boolean = false;

  /**
   * Creates a new agent detector instance.
   *
   * @param metadataProvider Provider for browser metadata, used to gather information about the browser environment
   * @param eventsProvider Provider for user interaction events like mouse movements, clicks, keyboard input
   * @param eventStorage Optional storage for event persistence between sessions, defaults to BrowserEventStorage
   */
  constructor(
    metadataProvider: MetadataPort,
    eventsProvider: EventPort,
    eventStorage?: IEventStorage
  ) {
    this.metadataProvider = metadataProvider;
    this.eventsProvider = eventsProvider;
    this.logger = new Logger({
      component: this.constructor.name,
      minLevel: LogLevel.INFO,
      forceEnabled: false,
    });
    this.eventStorage = eventStorage || new BrowserEventStorage();
    this.extractorsManager = new ExtractorsManager(
      this.metadataProvider,
      this.eventsProvider,
      this.eventStorage
    );
  }

  /**
   * Initializes the agent detector with configuration options.
   * Sets up extractors, loads model parameters, and optionally starts detection.
   *
   * @param options Configuration options including callbacks, debug mode, and extractors
   * @param options.onDetection Callback function that will be invoked when detection results are available
   * @param options.debug Whether to enable debug logging
   * @param options.extractorClasses Custom extractor classes to use instead of the default ones
   * @param options.autoStart Whether to automatically start detection after initialization (default: true)
   * @returns The agent detector instance for chaining
   */
  public init(
    options: {
      onDetection?: (result: DetectionResult) => void;
      debug?: boolean;
      extractorClasses?: ExtractorClass[];
      autoStart?: boolean;
    } = {}
  ): AgentDetector {
    this.debug = options.debug || false;
    this.onDetectionCallback = options.onDetection || null;
    // Set autoStart default value to true if not specified
    const autoStart =
      options.autoStart !== undefined ? options.autoStart : true;

    this.logger.setLevel(this.debug ? LogLevel.DEBUG : LogLevel.INFO);

    this.extractorsManager = new ExtractorsManager(
      this.metadataProvider,
      this.eventsProvider,
      this.eventStorage,
      this.debug
    );

    this.resetDetectionState();

    // Check if there's an existing session
    this.checkForExistingSession().then((hasExistingSession) => {
      if (hasExistingSession) {
        this.logger.debug("Restored existing session from storage");
        this.sessionRestored = true;
      } else {
        // Save the current session
        this.eventStorage.saveSessionToStorage();
        this.logger.debug("Created new session and saved to storage");
      }
    });

    if (options.extractorClasses && options.extractorClasses.length > 0) {
      // Extractor classes provided - initialize using manager
      this.extractorsManager.initExtractors(options.extractorClasses);
      this.logger.debug(
        "Initialized extractor classes using ExtractorsManager"
      );
    } else {
      // Use default extractors
      this.extractorsManager.initExtractors(DEFAULT_EXTRACTORS);
      this.logger.debug(
        "Initialized default extractors using ExtractorsManager"
      );
    }

    this.modelParameters = MODEL_PARAMETERS;

    this.initialized = true;

    this.logger.debug(`Initialized with autoStart=${autoStart}.`, {
      debug: this.debug,
      hasApiKey: !!this.apiKey,
      hasCallback: !!this.onDetectionCallback,
      hasModelParameters: !!this.modelParameters,
      autoStart,
      sessionRestored: this.sessionRestored,
    });

    // Auto-start detection if enabled
    if (autoStart) {
      this.logger.debug("Auto-starting detection...");
      this.startDetection();
    }

    return this;
  }

  /**
   * Checks if there's an existing session stored and loads it if found.
   * This allows for continuity between page reloads or navigation.
   *
   * @returns Promise resolving to true if an existing session was found and loaded
   */
  private async checkForExistingSession(): Promise<boolean> {
    const hasExistingSession =
      await this.eventStorage.checkForExistingSession();
    return hasExistingSession;
  }

  /**
   * Resets the internal detection state flags to their default values.
   * Used during initialization and cleanup processes.
   */
  private resetDetectionState(): void {
    this.isDetectionActive = false;
    this.isDetectionFinalizing = false;
  }

  /**
   * Preprocesses features based on their type (numeric, categorical, boolean).
   * Implements scikit-learn style preprocessing with StandardScaler, OneHotEncoder, etc.
   * This transforms raw feature values into a format suitable for the detection model.
   *
   * @param features Raw features extracted from various sources
   * @returns Preprocessed features ready for scoring
   */
  private preprocessFeatures(
    features: Record<string, any>
  ): Record<string, number | Record<string, number>> {
    const preprocessed: Record<string, any> = {};

    if (!this.modelParameters || !this.modelParameters.preprocessing) {
      // If no preprocessing parameters, return features as-is
      return features;
    }

    const {
      numeric_features = {},
      categorical_features = {},
      boolean_features = [],
    } = this.modelParameters.preprocessing;

    // Process each feature based on its type
    for (const [key, value] of Object.entries(features)) {
      const snakeCaseKey = toSnakeCase(key);

      // Handle numeric features with StandardScaler
      if (snakeCaseKey in numeric_features) {
        const { mean, std } = numeric_features[snakeCaseKey];
        const numericValue =
          typeof value === "number" ? value : parseFloat(value) || 0;
        preprocessed[snakeCaseKey] = standardize(numericValue, mean, std);
      }
      // Handle boolean features (convert to 0/1)
      else if (boolean_features.includes(snakeCaseKey)) {
        preprocessed[snakeCaseKey] = value === true ? 1 : 0;
      }
      // Handle categorical features with OneHotEncoder
      else if (snakeCaseKey in categorical_features) {
        const categories = categorical_features[snakeCaseKey];
        const stringValue = String(value);
        const encodedValues = oneHotEncode(stringValue, categories);

        // Add encoded values to preprocessed features
        for (const [encodedKey, encodedValue] of Object.entries(
          encodedValues
        )) {
          preprocessed[`${snakeCaseKey}_${encodedKey}`] = encodedValue;
        }
      }
      // Pass through other features unchanged
      else {
        preprocessed[snakeCaseKey] = value;
      }
    }

    return preprocessed;
  }

  /**
   * Extracts features from all registered extractors without stopping listeners.
   * This collects all available behavioral data from various sources and combines them.
   *
   * @returns Promise resolving to combined features from all extractors
   */
  private async extractFeatures(): Promise<Record<string, any>> {
    this.logger.debug("Extracting features from all extractors...");

    // Check if model parameters are loaded
    if (!this.modelParameters) {
      throw new Error("Model parameters not loaded.");
    }

    const combinedFeatures: Record<string, any> = {};
    type ExtractionOutcome =
      | FeatureResult<any>
      | { features: any; hasData: boolean; error: boolean };

    const extractors = this.extractorsManager.getExtractors();
    const results: ExtractionOutcome[] = await Promise.all(
      extractors.map(async (extractor): Promise<ExtractionOutcome> => {
        try {
          // Use resolve to handle both sync and async extractFeatures results consistently
          const featureResult = await Promise.resolve(
            extractor.extractFeatures()
          );
          // Always include default features for consistent structure, even if an error occurred during promise resolution
          return {
            ...featureResult,
            features: {
              ...extractor.getDefaultFeatures(),
              ...(featureResult?.features || {}),
            },
          };
        } catch (error) {
          // Log error and return default features with error flag
          this.logger.error(
            `Error extracting features from ${extractor.constructor.name}:`,
            error
          );
          return {
            hasData: false,
            error: true,
            features: extractor.getDefaultFeatures(),
          };
        }
      })
    );

    // Combine all features from extractors
    for (const result of results) {
      Object.assign(combinedFeatures, result.features);
    }

    // Debug log the raw feature values
    this.logger.debug("Raw features:", combinedFeatures);

    return combinedFeatures;
  }

  /**
   * Scores preprocessed features to determine the probability of an automated agent.
   * Applies the trained model weights to calculate a prediction score.
   *
   * @param features Preprocessed features to score
   * @returns Detection result with score and probability information
   */
  private scoreFeatures(features: Record<string, any>): DetectionResult {
    this.logger.debug("Scoring features...");

    if (!this.modelParameters) {
      throw new Error("Model parameters not loaded.");
    }

    // Use weights and bias from the model parameters
    const { weights, bias } = this.modelParameters;

    // Calculate linear sum
    let linearSum = bias;

    // Add up all applicable weights
    for (const [name, value] of Object.entries(weights)) {
      const featureValue = features[name];

      // Skip features that are not present in the input
      if (featureValue === undefined) {
        continue;
      }

      // Add contribution of this feature
      linearSum += featureValue * value;
    }

    // Convert to probability using sigmoid function
    const probabilityAgent = sigmoid(linearSum);

    // Create detection result
    return {
      isAgent: probabilityAgent >= 0.5,
      score: probabilityAgent,
      features: features,
    };
  }

  /**
   * Performs a complete detection cycle by extracting features,
   * preprocessing them, and applying the scoring model.
   * This is the core detection logic that produces a final decision.
   *
   * @returns Promise resolving to detection result
   */
  private async _performDetection(): Promise<DetectionResult> {
    // Extract features
    const features = await this.extractFeatures();

    // Preprocess features
    const preprocessedFeatures = this.preprocessFeatures(features);
    this.logger.debug("Preprocessed features:", preprocessedFeatures);

    // Score features
    const result = this.scoreFeatures(preprocessedFeatures);
    this.logger.debug("Detection result:", result);

    // Invoke detection callback if provided
    if (this.onDetectionCallback) {
      this.onDetectionCallback(result);
    }

    return result;
  }

  /**
   * Starts the detection process. Sets up event listeners and begins collecting
   * data for agent detection.
   * This initiates ongoing monitoring of user behavior to detect automated agents.
   *
   * @returns The agent detector instance for chaining
   */
  public startDetection(): AgentDetector {
    if (!this.initialized) {
      this.logger.error("Cannot start detection - not initialized.");
      return this;
    }

    if (this.isDetectionActive) {
      this.logger.warn(
        "Detection already active, ignoring startDetection call"
      );
      return this;
    }

    this.isDetectionActive = true;
    this.isDetectionFinalizing = false;
    this.logger.debug("Starting detection...");

    // Register listeners for extractors
    this.extractorsManager.startListening();

    this.logger.debug("Detection started");

    return this;
  }

  /**
   * Gets the current detection result based on data collected so far.
   * Does not stop the detection process or remove event listeners.
   * Useful for ongoing monitoring without interrupting data collection.
   *
   * @returns Promise resolving to current detection result
   */
  public async getCurrentDetectionResult(): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error("AgentDetector not initialized. Call init() first.");
    }

    if (!this.isDetectionActive) {
      this.logger.warn(
        "Detection not active, results may be limited. Consider calling startDetection() first."
      );
    }

    try {
      const result = await this._performDetection();
      this.logger.debug("Current detection result", result);
      return result;
    } catch (error) {
      this.logger.error("Error getting detection result:", error);
      throw error;
    }
  }

  /**
   * Finalizes the detection process, computes a final result, and cleans up resources.
   * Stops collecting new events but keeps the current session data.
   * Use this when you want to complete a detection cycle and get a definitive result.
   *
   * @returns Promise resolving to final detection result
   */
  public async finalizeDetection(): Promise<DetectionResult> {
    if (!this.initialized) {
      throw new Error("AgentDetector not initialized. Call init() first.");
    }

    if (this.isDetectionFinalizing) {
      this.logger.warn(
        "Detection already finalizing, returning previous result"
      );
      const result = await this._performDetection();
      return result;
    }

    this.isDetectionFinalizing = true;
    this.logger.debug("Finalizing detection...");

    let result: DetectionResult;

    try {
      // Extract final features and score
      result = await this._performDetection();

      // Clean up listeners
      this.extractorsManager.stopListening();
      this.isDetectionActive = false;
      this.isDetectionFinalizing = false;

      this.logger.debug("Detection finalized", result);
    } catch (error) {
      this.isDetectionFinalizing = false;
      this.logger.error("Error finalizing detection:", error);
      throw error;
    }

    return result;
  }

  /**
   * Cleans up all resources used by the agent detector.
   * Stops all event listeners and clears stored sessions.
   * Call this when the detector is no longer needed to free resources.
   */
  public cleanup(): void {
    if (this.isDetectionActive || this.isDetectionFinalizing) {
      // Stop extractors if they're running
      this.extractorsManager.stopListening();
      this.isDetectionActive = false;
      this.isDetectionFinalizing = false;
    }

    // Clean up event storage
    this.eventStorage.clearCurrentSessionEvents();

    this.logger.debug("Agent detector cleaned up");
  }

  /**
   * Cleans up old events from storage based on age.
   * Helps manage storage size by removing outdated event data.
   *
   * @param maxAgeMs Maximum age of events to keep in milliseconds, defaults to 24 hours
   */
  public async cleanupOldEvents(
    maxAgeMs: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    try {
      await this.eventStorage.clearOldEvents(maxAgeMs);
      this.logger.debug(`Cleaned up events older than ${maxAgeMs}ms`);
    } catch (error) {
      this.logger.error("Error cleaning up old events:", error);
    }
  }
}
