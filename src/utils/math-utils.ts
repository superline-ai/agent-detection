/**
 * Utility functions for mathematical and data transformations
 */

/**
 * Sigmoid function to convert log-odds to probability.
 */
export function sigmoid(logit: number): number {
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Converts a camelCase or other format string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .replace(/^_/, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Standardize a numeric value (z-score normalization)
 * Identical to sklearn's StandardScaler transform: (x - mean) / std
 */
export function standardize(value: number, mean: number, std: number): number {
  if (std === 0) return 0; // Avoid division by zero
  return (value - mean) / std;
}

/**
 * One-hot encode a categorical value
 * Replicates sklearn's OneHotEncoder(handle_unknown="ignore", sparse_output=False)
 */
export function oneHotEncode(
  value: string,
  categories: string[]
): Record<string, number> {
  const encoded: Record<string, number> = {};

  // Handle unknown categories gracefully (similar to handle_unknown="ignore")
  if (!categories.includes(value)) {
    // All zeros for unknown category
    categories.forEach((cat) => {
      encoded[cat] = 0;
    });
    return encoded;
  }

  // Create one-hot encoding
  categories.forEach((cat) => {
    encoded[cat] = cat === value ? 1 : 0;
  });

  return encoded;
}
