"use client";

/**
 * NoOpAuthProvider - Authentication Provider Implementation
 *
 * This provider implements a complete authentication interface without
 * actual authentication functionality. It can be easily replaced with
 * real authentication providers while maintaining the same interface.
 *
 * Features:
 * - Full TypeScript interface compliance
 * - Simulated loading states for development
 * - Error boundary integration
 * - Graceful auth call handling
 * - Easy replacement path for real auth
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

import {
  AuthContextValue,
  NoOpAuthProviderProps,
  AuthEvent,
  User,
  LoginCredentials,
  DEFAULT_AUTH_CONTEXT,
  AUTH_CONFIG,
  createAuthError,
  AuthErrorCode,
} from "../../types/auth";

// ============================================================================
// Context Definition
// ============================================================================

/**
 * Authentication context - provides auth state to component tree
 */
const AuthContext = createContext<AuthContextValue>(DEFAULT_AUTH_CONTEXT);

// ============================================================================
// Auth State Reducer
// ============================================================================

/**
 * Authentication state interface for reducer
 */
interface AuthReducerState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial auth state
 */
const initialState: AuthReducerState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

/**
 * Authentication state reducer
 * Handles all auth state transitions in a predictable manner
 */
const authReducer = (
  state: AuthReducerState,
  action: AuthEvent,
): AuthReducerState => {
  switch (action.type) {
    case "LOGIN_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case "LOGIN_ERROR":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.error,
      };

    case "LOGOUT_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case "LOGOUT_SUCCESS":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case "LOGOUT_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.loading,
      };

    default:
      return state;
  }
};

// ============================================================================
// NoOpAuthProvider Component
// ============================================================================

/**
 * NoOpAuthProvider - No-operation authentication provider
 *
 * Provides a complete auth interface without actual authentication.
 * Useful for development and can be easily replaced with real auth providers.
 *
 * @param props - NoOpAuthProvider configuration props
 */
export const NoOpAuthProvider: React.FC<NoOpAuthProviderProps> = ({
  children,
  simulateLoading = false,
  mockUser = null,
  authDelay = AUTH_CONFIG.DEFAULT_AUTH_DELAY,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Validate authDelay to prevent excessive delays
  const validatedAuthDelay = Math.min(
    Math.max(authDelay, 0),
    AUTH_CONFIG.MAX_AUTH_DELAY,
  );

  /**
   * Simulates authentication delay if configured
   */
  const simulateAuthDelay = useCallback(async (): Promise<void> => {
    if (simulateLoading && validatedAuthDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, validatedAuthDelay));
    }
  }, [simulateLoading, validatedAuthDelay]);

  /**
   * No-op login implementation
   * Simulates successful login without actual authentication
   */
  const login = useCallback(
    async (credentials?: LoginCredentials): Promise<void> => {
      try {
        dispatch({ type: "LOGIN_START" });

        await simulateAuthDelay();

        // In real implementation, this would validate credentials and authenticate
        // For now, we either use mockUser or resolve without authentication
        if (mockUser) {
          dispatch({
            type: "LOGIN_SUCCESS",
            user: mockUser,
          });
        } else {
          // Simulate successful "login" without actually setting user
          dispatch({
            type: "LOGIN_SUCCESS",
            user: {
              id: "noop-user-id",
              email: credentials?.email || "noop@example.com",
              name: "No-Op User",
            },
          });
        }
      } catch (error) {
        const authError = createAuthError(
          AuthErrorCode.UNKNOWN_ERROR,
          "Login simulation failed",
          error,
        );
        dispatch({
          type: "LOGIN_ERROR",
          error: authError.message,
        });
      }
    },
    [simulateAuthDelay, mockUser],
  );

  /**
   * No-op logout implementation
   * Simulates successful logout without actual deauthentication
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: "LOGOUT_START" });

      await simulateAuthDelay();

      // In real implementation, this would clear tokens and deauthenticate
      // For now, we just clear the local state
      dispatch({ type: "LOGOUT_SUCCESS" });
    } catch (error) {
      const authError = createAuthError(
        AuthErrorCode.UNKNOWN_ERROR,
        "Logout simulation failed",
        error,
      );
      dispatch({
        type: "LOGOUT_ERROR",
        error: authError.message,
      });
    }
  }, [simulateAuthDelay]);

  /**
   * Clear authentication errors
   */
  const clearError = useCallback((): void => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // Initialize mock user if provided
  useEffect(() => {
    if (mockUser && !state.isAuthenticated && !state.isLoading) {
      dispatch({
        type: "LOGIN_SUCCESS",
        user: mockUser,
      });
    }
  }, [mockUser, state.isAuthenticated, state.isLoading]);

  /**
   * Create context value with current state and actions
   */
  const contextValue: AuthContextValue = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// ============================================================================
// Auth Hook
// ============================================================================

/**
 * useAuth - Hook to access authentication context
 *
 * Provides type-safe access to authentication state and actions.
 * Throws error if used outside of AuthProvider.
 *
 * @returns Authentication context value
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (context === DEFAULT_AUTH_CONTEXT) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
        "Make sure your component is wrapped with NoOpAuthProvider or another AuthProvider.",
    );
  }

  return context;
};

// ============================================================================
// Auth Error Boundary
// ============================================================================

/**
 * Auth error boundary state
 */
interface AuthErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * AuthErrorBoundary - Catches auth provider errors
 *
 * Provides graceful fallback when authentication provider fails.
 * Useful for development and production error handling.
 */
export class AuthErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  AuthErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AuthProvider Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-32 p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Authentication provider failed to load.
              </p>
              <button
                onClick={this.handleReset}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Higher-Order Component for Auth Protection
// ============================================================================

/**
 * withAuth - HOC for components that require authentication
 *
 * Wraps components to ensure they have access to auth context.
 * Useful for protecting routes or components.
 *
 * @param Component - Component to wrap with auth context
 * @returns Component wrapped with auth provider
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => {
    // Ensure auth context is available by calling useAuth
    useAuth();
    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// ============================================================================
// Default Export
// ============================================================================

export default NoOpAuthProvider;
