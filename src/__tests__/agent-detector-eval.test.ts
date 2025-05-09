import * as fs from "fs";
import * as path from "path";
import { AgentDetector } from "../agent-detector";
import { loadSessionEnvironment } from "../environments/replay/environment";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BrowserMetadata } from "../types/browser-metadata";

// Extend the BrowserMetadata type to include session label
declare module "../types/browser-metadata" {
  interface BrowserMetadata {
    label?: string;
  }
}

interface EvaluationResult {
  sessionId: string;
  groundTruth: "human" | "agent";
  prediction: boolean;
  confidence: number;
  metadata?: {
    userAgent?: string;
    timestamp?: string | number;
    [key: string]: unknown;
  };
}

interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  specificity: number;
  npv: number;
}

interface BaselineData {
  timestamp: string;
  results: EvaluationResult[];
  confusionMatrix: ConfusionMatrix;
  metrics: PerformanceMetrics;
}

/**
 * This test suite evaluates the agent detector against recorded sessions.
 * It can be used to measure if changes to the implementation improve detection performance.
 */
describe("Agent Detector Evaluation", () => {
  // Increase timeout for all tests in this suite
  jest.setTimeout(60000);

  let sessionFiles: string[] = [];
  let results: EvaluationResult[] = [];
  let confusionMatrix: ConfusionMatrix;
  let metrics: PerformanceMetrics;
  let baselineResults: BaselineData | null = null;

  // Find all session files once before running tests
  beforeAll(async () => {
    const sessionsDir = path.resolve(__dirname, "data", "sessions");

    if (fs.existsSync(sessionsDir)) {
      sessionFiles = fs
        .readdirSync(sessionsDir)
        .filter((file) => file.endsWith(".tar.gz"))
        .map((file) => path.join(sessionsDir, file));
    }

    // Process all sessions and collect results
    results = await processAllSessions(sessionFiles);

    // Calculate confusion matrix and metrics
    confusionMatrix = calculateConfusionMatrix(results);
    metrics = calculateMetrics(confusionMatrix);

    // Try to load baseline results from previous run
    const baselinePath = path.resolve(
      __dirname,
      "data",
      "baseline-results.json",
    );
    if (fs.existsSync(baselinePath)) {
      try {
        baselineResults = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
      } catch (error) {
        console.warn("Failed to load baseline results:", error);
      }
    }
  });

  // Save current results as baseline for future comparison
  afterAll(() => {
    const baselinePath = path.resolve(
      __dirname,
      "data",
      "baseline-results.json",
    );
    const baselineData = {
      timestamp: new Date().toISOString(),
      results,
      confusionMatrix,
      metrics,
    };

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(baselinePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2));
      console.log(`Saved baseline results to: ${baselinePath}`);
    } catch (error) {
      console.error("Failed to save baseline results:", error);
    }
  });

  test("should find at least one session to evaluate", () => {
    expect(sessionFiles.length).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
  });

  test("should report current performance metrics", () => {
    // Display confusion matrix and metrics
    console.log("==========================================");
    console.log("🔍 AGENT DETECTOR EVALUATION RESULTS");
    console.log("==========================================");
    console.log(`Sessions processed: ${results.length}`);
    console.log(
      `Human sessions: ${
        results.filter((r) => r.groundTruth === "human").length
      }`,
    );
    console.log(
      `Agent sessions: ${
        results.filter((r) => r.groundTruth === "agent").length
      }`,
    );
    console.log("------------------------------------------");
    console.log("CONFUSION MATRIX:");
    console.log(`True Positives: ${confusionMatrix.truePositives}`);
    console.log(`False Positives: ${confusionMatrix.falsePositives}`);
    console.log(`True Negatives: ${confusionMatrix.trueNegatives}`);
    console.log(`False Negatives: ${confusionMatrix.falseNegatives}`);
    console.log("------------------------------------------");
    console.log("PERFORMANCE METRICS:");
    console.log(`Accuracy: ${metrics.accuracy.toFixed(4)}`);
    console.log(`Precision: ${metrics.precision.toFixed(4)}`);
    console.log(`Recall: ${metrics.recall.toFixed(4)}`);
    console.log(`F1 Score: ${metrics.f1Score.toFixed(4)}`);
    console.log(`False Positive Rate: ${metrics.falsePositiveRate.toFixed(4)}`);
    console.log(`False Negative Rate: ${metrics.falseNegativeRate.toFixed(4)}`);
    console.log(`Specificity: ${metrics.specificity.toFixed(4)}`);
    console.log(`Negative Predictive Value: ${metrics.npv.toFixed(4)}`);
    console.log("==========================================");

    // Compare with baseline if available
    if (baselineResults) {
      console.log("COMPARISON WITH BASELINE:");
      console.log(`Baseline date: ${baselineResults.timestamp}`);
      console.log(
        `Accuracy change: ${(
          metrics.accuracy - baselineResults.metrics.accuracy
        ).toFixed(4)}`,
      );
      console.log(
        `F1 Score change: ${(
          metrics.f1Score - baselineResults.metrics.f1Score
        ).toFixed(4)}`,
      );
      console.log("==========================================");
    }

    // This is a reporting test, so it always passes
    expect(true).toBeTruthy();
  });

  test("should provide per-session details", () => {
    // Display detailed results table
    console.table(
      results.slice(0, 20).map((r) => ({
        sessionId: r.sessionId,
        groundTruth: r.groundTruth,
        prediction: r.prediction ? "agent" : "human",
        confidence: r.confidence.toFixed(4),
        correct:
          (r.groundTruth === "agent" && r.prediction) ||
          (r.groundTruth === "human" && !r.prediction),
      })),
    );

    // Log how many more records exist beyond the displayed ones
    if (results.length > 20) {
      console.log(
        `... and ${
          results.length - 20
        } more records not displayed in the table.`,
      );
    }

    // This is a reporting test, so it always passes
    expect(true).toBeTruthy();
  });
});

/**
 * Process all session files and evaluate the agent detector against them
 */
async function processAllSessions(
  sessionFiles: string[],
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (const sessionFile of sessionFiles) {
    let detector: AgentDetector | null = null;
    try {
      const sessionId = path.basename(sessionFile, ".tar.gz");

      // Load the session environment
      const env = await loadSessionEnvironment(sessionFile);

      // Get the ground truth from metadata
      const metadata = await env.metadata.getMetadata();
      let groundTruth: "human" | "agent" = "agent";
      if (metadata.label === "human") {
        groundTruth = "human";
      }

      // Create and initialize the agent detector
      detector = new AgentDetector(env.metadata, env.events, env.eventStorage);
      detector.init({ debug: false, autoStart: true });

      // Start the environment to process all events. In replay, this is synchronous
      // and completes when all events are processed. The underlying event provider
      // *should* emit 'end' when env.start() finishes, but we now use finalizeDetection()
      await env.start();

      // Now await the result promise
      const detectionResult = await detector.finalizeDetection();

      // Store the result
      results.push({
        sessionId,
        groundTruth,
        prediction: detectionResult.isAgent,
        confidence: detectionResult.confidence,
        metadata: {
          userAgent: metadata.userAgent,
          timestamp: metadata.timestamp,
        },
      });
    } catch (error) {
      console.error(`Error processing session ${sessionFile}:`, error);
      // Ensure cleanup happens even on error during processing
      if (detector) {
        detector.cleanup();
      }
    }
  }

  return results;
}

/**
 * Calculate confusion matrix from evaluation results
 */
function calculateConfusionMatrix(
  results: EvaluationResult[],
): ConfusionMatrix {
  const matrix: ConfusionMatrix = {
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
  };

  results.forEach((result) => {
    const isActualAgent = result.groundTruth === "agent";

    if (isActualAgent && result.prediction) {
      matrix.truePositives += 1;
    } else if (!isActualAgent && result.prediction) {
      matrix.falsePositives += 1;
    } else if (!isActualAgent && !result.prediction) {
      matrix.trueNegatives += 1;
    } else if (isActualAgent && !result.prediction) {
      matrix.falseNegatives += 1;
    }
  });

  return matrix;
}

/**
 * Calculate performance metrics from confusion matrix
 */
function calculateMetrics(matrix: ConfusionMatrix): PerformanceMetrics {
  const { truePositives, falsePositives, trueNegatives, falseNegatives } =
    matrix;

  // Calculate base metrics
  const accuracy =
    (truePositives + trueNegatives) /
    (truePositives + trueNegatives + falsePositives + falseNegatives);

  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;

  // F1 score is the harmonic mean of precision and recall
  const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

  // Calculate additional metrics
  const specificity = trueNegatives / (trueNegatives + falsePositives) || 0;
  const npv = trueNegatives / (trueNegatives + falseNegatives) || 0; // Negative Predictive Value

  // Calculate error rates
  const falsePositiveRate =
    falsePositives / (falsePositives + trueNegatives) || 0;
  const falseNegativeRate =
    falseNegatives / (falseNegatives + truePositives) || 0;

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    specificity,
    npv,
    falsePositiveRate,
    falseNegativeRate,
  };
}
