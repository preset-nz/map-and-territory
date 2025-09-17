/**
 * BFS Flood Fill Algorithm for Hex Grids
 *
 * Implements breadth-first search flood fill with hex neighbors.
 * Supports empty-only and same-value replacement modes with boundary detection.
 */

import type { Axial } from "@/lib/hex";
import { AppAPI } from "@/appapi";
import { axialKey } from "@/layers/hex-utils";

/**
 * Fill mode configuration
 */
export type FloodFillMode = "empty-only" | "same-value";

/**
 * Paper bounds for boundary detection
 */
export interface PaperBounds {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
}

/**
 * Configuration for flood fill operation
 */
export interface FloodFillConfig {
  /** Starting position */
  origin: Axial;
  /** Fill mode behavior */
  mode: FloodFillMode;
  /** Maximum number of cells to fill (default: 1000) */
  maxCells?: number;
  /** Paper bounds to respect (optional) */
  paperBounds?: PaperBounds;
  /** Current terrain/cell data lookup */
  getCellValue: (axial: Axial) => string | undefined;
}

/**
 * Result of a flood fill operation
 */
export interface FloodFillResult {
  /** List of cells that would be filled */
  cells: Axial[];
  /** Whether the operation was truncated due to limits */
  truncated: boolean;
  /** Reason for truncation if applicable */
  truncationReason?: string;
  /** Total cells evaluated during the search */
  cellsEvaluated: number;
}

/**
 * Core BFS flood fill algorithm using hex neighbors
 */
export function floodFill(config: FloodFillConfig): FloodFillResult {
  const { origin, mode, maxCells = 1000, paperBounds, getCellValue } = config;

  // Result tracking
  const fillCells: Axial[] = [];
  const visited = new Set<string>();
  const queue: Axial[] = [];
  let cellsEvaluated = 0;
  let truncated = false;
  let truncationReason: string | undefined;

  // Get origin value for same-value mode
  const originValue = getCellValue(origin);

  // Determine what values should be filled
  const shouldFill = (value: string | undefined): boolean => {
    switch (mode) {
      case "empty-only":
        return value === undefined;
      case "same-value":
        return value === originValue;
      default:
        return false;
    }
  };

  // Check if position is within bounds
  const isWithinBounds = (pos: Axial): boolean => {
    if (!paperBounds) return true;
    return (
      pos.q >= paperBounds.minQ &&
      pos.q <= paperBounds.maxQ &&
      pos.r >= paperBounds.minR &&
      pos.r <= paperBounds.maxR
    );
  };

  // Early exit if origin doesn't match fill criteria
  if (!shouldFill(originValue)) {
    return {
      cells: [],
      truncated: false,
      cellsEvaluated: 1,
    };
  }

  // Early exit if origin is out of bounds
  if (!isWithinBounds(origin)) {
    return {
      cells: [],
      truncated: false,
      cellsEvaluated: 1,
    };
  }

  // If no paper bounds provided and filling empty cells, provide reasonable default bounds
  // to prevent infinite expansion of empty regions
  const effectiveBounds =
    paperBounds ||
    (mode === "empty-only"
      ? {
          minQ: origin.q - 50,
          maxQ: origin.q + 50,
          minR: origin.r - 50,
          maxR: origin.r + 50,
        }
      : undefined);

  // Check if position is within effective bounds
  const isWithinEffectiveBounds = (pos: Axial): boolean => {
    if (!effectiveBounds) return true;
    return (
      pos.q >= effectiveBounds.minQ &&
      pos.q <= effectiveBounds.maxQ &&
      pos.r >= effectiveBounds.minR &&
      pos.r <= effectiveBounds.maxR
    );
  };

  // Initialize BFS
  queue.push(origin);
  visited.add(axialKey(origin.q, origin.r));

  // BFS flood fill
  while (queue.length > 0) {
    const current = queue.shift()!;
    cellsEvaluated++;

    // Check max cells limit
    if (fillCells.length >= maxCells) {
      truncated = true;
      truncationReason = `Maximum cell limit reached (${maxCells})`;
      break;
    }

    // Add current cell to fill list
    fillCells.push(current);

    // Get neighbors using hex library
    const neighbors = AppAPI.hex.neighbors(current);

    for (const neighbor of neighbors) {
      const neighborKey = axialKey(neighbor.q, neighbor.r);

      // Skip if already visited
      if (visited.has(neighborKey)) continue;

      // Mark as visited to prevent duplicate processing
      visited.add(neighborKey);
      cellsEvaluated++;

      // Check bounds
      if (!isWithinBounds(neighbor) || !isWithinEffectiveBounds(neighbor))
        continue;

      // Get neighbor value and check if it should be filled
      const neighborValue = getCellValue(neighbor);
      if (shouldFill(neighborValue)) {
        queue.push(neighbor);
      }
    }
  }

  return {
    cells: fillCells,
    truncated,
    truncationReason,
    cellsEvaluated,
  };
}

/**
 * Utility to create paper bounds from aspect ratio and size
 */
export function createPaperBounds(
  aspect: "square" | "4:3" | "16:10",
  hexRadius: number = 50,
): PaperBounds {
  // Rough hex grid size calculations based on aspect ratio
  let width: number, height: number;

  switch (aspect) {
    case "square":
      width = height = 2 * hexRadius;
      break;
    case "4:3":
      width = 2.4 * hexRadius;
      height = 1.8 * hexRadius;
      break;
    case "16:10":
      width = 3.2 * hexRadius;
      height = 2.0 * hexRadius;
      break;
  }

  // Convert to hex coordinate bounds (rough approximation)
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);

  return {
    minQ: -halfWidth,
    maxQ: halfWidth,
    minR: -halfHeight,
    maxR: halfHeight,
  };
}

/**
 * Type guard for FloodFillConfig validation
 */
export function isValidFloodFillConfig(
  config: unknown,
): config is FloodFillConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false;
  }

  const c = config as Partial<FloodFillConfig>;

  // Check required origin
  if (!c.origin || typeof c.origin !== "object" || Array.isArray(c.origin)) {
    return false;
  }

  const origin = c.origin as Partial<Axial>;
  if (typeof origin.q !== "number" || typeof origin.r !== "number") {
    return false;
  }

  // Check required mode
  if (c.mode !== "empty-only" && c.mode !== "same-value") {
    return false;
  }

  // Check required getCellValue function
  if (typeof c.getCellValue !== "function") {
    return false;
  }

  // Check optional maxCells
  if (
    c.maxCells !== undefined &&
    (typeof c.maxCells !== "number" || c.maxCells <= 0)
  ) {
    return false;
  }

  // Check optional paperBounds
  if (c.paperBounds !== undefined) {
    if (
      !c.paperBounds ||
      typeof c.paperBounds !== "object" ||
      Array.isArray(c.paperBounds)
    ) {
      return false;
    }

    const bounds = c.paperBounds as Partial<PaperBounds>;
    if (
      typeof bounds.minQ !== "number" ||
      typeof bounds.maxQ !== "number" ||
      typeof bounds.minR !== "number" ||
      typeof bounds.maxR !== "number"
    ) {
      return false;
    }
  }

  return true;
}
