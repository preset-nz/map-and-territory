/**
 * Type Definitions Export Barrel
 *
 * Provides clean imports for all type definitions used throughout
 * the Professional Layout System. Follows TypeScript best practices
 * for type organization and exports.
 */

// Layout types
export type {
  // Core state interfaces
  LayoutState,
  LayoutActions,
  LayoutStore,
  BreadcrumbItem,
  SidebarState,
  LayoutPreferences,
  NavigationState,

  // Component prop interfaces
  BaseLayoutProps,
  AppLayoutProps,
  AppHeaderProps,
  AppSidebarProps,
  MainContentProps,
  ContentHeaderProps,

  // Provider interfaces
  LayoutProviderProps,
  StorePersistConfig,

  // Utility types
  SidebarSection,
} from "./layout";

export {
  // Constants and defaults
  DEFAULT_LAYOUT_STATE,
  SIDEBAR_WIDTH_CONSTRAINTS,

  // Type guards
  isValidTheme,
  isValidSidebarVariant,
  isValidSidebarCollapsible,
} from "./layout";

// Auth types
export type {
  // Core auth interfaces
  User,
  AuthContextValue,
  LoginCredentials,

  // Provider interfaces
  AuthProviderProps,
  NoOpAuthProviderProps,

  // State management
  AuthEvent,
  AuthError,

  // Future auth types
  OAuthConfig,
  JWTToken,
} from "./auth";

export {
  // Enums
  AuthState,
  AuthErrorCode,

  // Constants and defaults
  DEFAULT_AUTH_CONTEXT,
  AUTH_CONFIG,

  // Utilities
  createAuthError,

  // Type guards
  isUser,
  isAuthError,
} from "./auth";
