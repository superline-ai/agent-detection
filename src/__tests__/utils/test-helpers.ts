import { DetectionResult } from "../../types/detection-types";

export interface EvaluationResult {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface TestCase {
  data: any;
  expected: boolean; // true if agent, false if human
}

/**
 * Evaluates detection results against expected outcomes
 * @param results - Array of detection results
 * @param testCases - Array of test cases with expected outcomes
 * @returns Evaluation metrics including false positive and negative rates
 */
export function evaluateDetectionResults(
  results: DetectionResult[],
  testCases: TestCase[]
): EvaluationResult {
  if (results.length !== testCases.length) {
    throw new Error("Results and test cases arrays must have the same length");
  }

  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const expected = testCases[i].expected;

    if (expected === true && result.isAgent === true) {
      truePositives++;
    } else if (expected === false && result.isAgent === false) {
      trueNegatives++;
    } else if (expected === false && result.isAgent === true) {
      falsePositives++;
    } else if (expected === true && result.isAgent === false) {
      falseNegatives++;
    }
  }

  const total = results.length;
  const accuracy = (truePositives + trueNegatives) / total;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

  return {
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
    accuracy,
    precision,
    recall,
    f1Score,
  };
}

/**
 * Generates a simple report for evaluation results
 */
export function printEvaluationReport(results: EvaluationResult): void {
  console.log("\n--- Agent Detection Evaluation Report ---");
  console.log(`True Positives: ${results.truePositives}`);
  console.log(`True Negatives: ${results.trueNegatives}`);
  console.log(`False Positives: ${results.falsePositives}`);
  console.log(`False Negatives: ${results.falseNegatives}`);
  console.log(`Accuracy: ${(results.accuracy * 100).toFixed(2)}%`);
  console.log(`Precision: ${(results.precision * 100).toFixed(2)}%`);
  console.log(`Recall: ${(results.recall * 100).toFixed(2)}%`);
  console.log(`F1 Score: ${(results.f1Score * 100).toFixed(2)}%`);
  console.log("----------------------------------------\n");
}
