/**
 * Shared types for batch operations
 *
 * These types are used by both the store and plugin system
 * to enable efficient bulk updates to layer state.
 */

import type { FreeformCell } from "@/stores/campaign";

/**
 * Delta object for batch cell operations
 */
export interface CellsDelta<TCell = FreeformCell> {
  set?: Record<string, TCell>;
  delete?: string[];
}

/**
 * Result of a batch operation with optional metrics
 */
export interface BatchResult<T = unknown> {
  success: boolean;
  error?: string;
  result?: T;
  metrics?: BatchMetrics;
}

/**
 * Performance metrics for batch operations
 */
export interface BatchMetrics {
  executionTimeMs: number;
  memoryUsageMB?: number;
  operationCount: number;
  immerPatches?: number;
}
