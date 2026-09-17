/**
 * Type Definitions Export Barrel
 *
 * Provides clean imports for all type definitions used throughout
 * the Professional Layout System. Follows TypeScript best practices
 * for type organization and exports.
 */

// Auth types
export type {
  AuthContextValue,
  AuthError,
  // State management
  AuthEvent,
  // Provider interfaces
  AuthProviderProps,
  JWTToken,
  LoginCredentials,
  NoOpAuthProviderProps,
  // Future auth types
  OAuthConfig,
  // Core auth interfaces
  User,
} from "./auth";
export {
  AUTH_CONFIG,
  AuthErrorCode,
  // Enums
  AuthState,
  // Utilities
  createAuthError,
  // Constants and defaults
  DEFAULT_AUTH_CONTEXT,
  isAuthError,
  // Type guards
  isUser,
} from "./auth";
// Layout types
export type {
  AppHeaderProps,
  AppLayoutProps,
  AppSidebarProps,
  // Component prop interfaces
  BaseLayoutProps,
  BreadcrumbItem,
  ContentHeaderProps,
  LayoutActions,
  LayoutPreferences,
  // Provider interfaces
  LayoutProviderProps,
  // Core state interfaces
  LayoutState,
  LayoutStore,
  MainContentProps,
  NavigationState,
  // Utility types
  SidebarSection,
  SidebarState,
  StorePersistConfig,
} from "./layout";
export {
  // Constants and defaults
  DEFAULT_LAYOUT_STATE,
  isValidSidebarCollapsible,
  isValidSidebarVariant,
  // Type guards
  isValidTheme,
  SIDEBAR_WIDTH_CONSTRAINTS,
} from "./layout";
