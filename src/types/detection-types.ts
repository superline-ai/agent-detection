/**
 * Result of agent detection process
 */
export interface DetectionResult {
  isAgent: boolean;
  confidence: number;
  features?: Record<string, any>; // Combined features used for scoring
}

/**
 * Model parameters for detection algorithm
 */
export interface ModelParameters {
  weights: Record<string, number>;
  bias: number;
  feature_order: string[];
  preprocessing?: {
    numeric_features?: Record<string, { mean: number; std: number }>;
    categorical_features?: Record<string, string[]>;
    boolean_features?: string[];
  };
  evaluation?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
    confusion_matrix: {
      true_negatives: number;
      false_positives: number;
      false_negatives: number;
      true_positives: number;
    };
  };
}
