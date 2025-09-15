/**
 * Authentication interfaces and types for the Professional Layout System
 *
 * This file defines type-safe contracts for authentication providers.
 * Currently implements NoOpAuthProvider interface that can be easily
 * replaced with real authentication later.
 *
 * Architecture follows SOLID principles with interface segregation
 * and dependency inversion for future auth provider implementations.
 */

import { ReactNode } from "react";

// ============================================================================
// Core Authentication Interfaces
// ============================================================================

/**
 * User interface - currently null for NoOpAuthProvider
 * Can be extended when real authentication is implemented
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
}

/**
 * Authentication context value interface
 * Provides consistent interface regardless of auth provider implementation
 */
export interface AuthContextValue {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether authentication state is being loaded */
  isLoading: boolean;
  /** Any authentication error that occurred */
  error: string | null;

  // Authentication actions
  /** Login function - implementation varies by provider */
  login: (credentials?: LoginCredentials) => Promise<void>;
  /** Logout function - implementation varies by provider */
  logout: () => Promise<void>;
  /** Clear any authentication errors */
  clearError: () => void;
}

/**
 * Login credentials interface
 * Currently optional for NoOpAuthProvider, required for real auth
 */
export interface LoginCredentials {
  email?: string;
  password?: string;
  [key: string]: unknown; // Allow additional provider-specific fields
}

// ============================================================================
// Provider Props Interfaces
// ============================================================================

/**
 * Base AuthProvider props interface
 */
export interface AuthProviderProps {
  /** Child components that will have access to auth context */
  children: ReactNode;
}

/**
 * NoOpAuthProvider specific props
 * Extends base with no-op specific configuration
 */
export interface NoOpAuthProviderProps extends AuthProviderProps {
  /** Whether to simulate loading states for development */
  simulateLoading?: boolean;
  /** Mock user data for development/testing */
  mockUser?: User | null;
  /** Simulate authentication delay in milliseconds */
  authDelay?: number;
}

// ============================================================================
// Authentication States and Events
// ============================================================================

/**
 * Authentication state enumeration
 */
export enum AuthState {
  IDLE = "idle",
  LOADING = "loading",
  AUTHENTICATED = "authenticated",
  UNAUTHENTICATED = "unauthenticated",
  ERROR = "error",
}

/**
 * Authentication event types for state management
 */
export type AuthEvent =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; user: User }
  | { type: "LOGIN_ERROR"; error: string }
  | { type: "LOGOUT_START" }
  | { type: "LOGOUT_SUCCESS" }
  | { type: "LOGOUT_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; loading: boolean };

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = "invalid_credentials",
  NETWORK_ERROR = "network_error",
  SESSION_EXPIRED = "session_expired",
  UNAUTHORIZED = "unauthorized",
  UNKNOWN_ERROR = "unknown_error",
}

/**
 * Structured authentication error interface
 */
export interface AuthError {
  /** Error code for programmatic handling */
  code: AuthErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: unknown;
}

// ============================================================================
// Future Auth Provider Interfaces
// ============================================================================

/**
 * OAuth provider configuration
 * For future OAuth integration (currently unused)
 */
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
  provider: "google" | "github" | "microsoft";
}

/**
 * JWT token interface
 * For future JWT-based authentication (currently unused)
 */
export interface JWTToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if value is a valid User
 */
export const isUser = (value: unknown): value is User => {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as User).id === "string" &&
    typeof (value as User).email === "string" &&
    typeof (value as User).name === "string"
  );
};

/**
 * Type guard to check if value is a valid AuthError
 */
export const isAuthError = (value: unknown): value is AuthError => {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(AuthErrorCode).includes((value as AuthError).code) &&
    typeof (value as AuthError).message === "string"
  );
};

/**
 * Helper to create structured auth errors
 */
export const createAuthError = (
  code: AuthErrorCode,
  message: string,
  details?: unknown,
): AuthError => ({
  code,
  message,
  details,
});

// ============================================================================
// Default Values and Constants
// ============================================================================

/**
 * Default authentication context value for NoOpAuthProvider
 */
export const DEFAULT_AUTH_CONTEXT: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async () => {
    throw new Error("AuthProvider not configured");
  },
  logout: async () => {
    throw new Error("AuthProvider not configured");
  },
  clearError: () => {
    throw new Error("AuthProvider not configured");
  },
};

/**
 * Authentication configuration constants
 */
export const AUTH_CONFIG = {
  /** Default authentication delay for NoOpAuthProvider simulation */
  DEFAULT_AUTH_DELAY: 1000,
  /** Maximum authentication delay to prevent infinite loading */
  MAX_AUTH_DELAY: 5000,
  /** Default session timeout in milliseconds */
  DEFAULT_SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
} as const;
