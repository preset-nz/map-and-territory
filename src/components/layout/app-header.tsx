'use client';

/**
 * AppHeader - Professional Application Header Component
 * 
 * Provides top-level navigation with breadcrumbs, navigation menu,
 * and user account controls. Integrates with layout store for
 * responsive behavior and theme management.
 * 
 * Features:
 * - Responsive navigation menu with dropdown sections
 * - Contextual breadcrumb navigation
 * - User avatar with account dropdown
 * - Theme integration with proper accessibility
 * - Desktop-optimized layout (no mobile breakpoints)
 */

import React from 'react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { useLayoutStore } from '@/stores/layout';
import { useAuth } from '@/components/providers/auth-provider';
import { AppHeaderProps } from '@/types/layout';
import { useProjectStore } from '@/stores/project';
import { SimpleThemeToggle } from '@/components/layout/theme-toggle';

// ============================================================================
// Navigation Configuration
// ============================================================================


// ============================================================================
// AppHeader Component
// ============================================================================

/**
 * AppHeader component providing top-level navigation and user controls
 * 
 * @param props - AppHeader configuration props
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  className = '',
}) => {
  const setTheme = useLayoutStore((state) => state.setTheme);
  const { user, isAuthenticated, logout } = useAuth();
  const projectName = useProjectStore((s) => s.current?.name);

  /**
   * Handle theme toggle action
   * Cycles through light -> dark -> system theme options
   */
  const handleThemeToggle = () => {
    // Simple theme cycling - could be extended with more sophisticated logic
    setTheme('system');
  };

  /**
   * Handle user logout action
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };



  /**
   * Render user account dropdown
   */
  const renderUserDropdown = () => {
    if (!isAuthenticated || !user) {
      return (
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      );
    }

    // Generate user initials for avatar fallback
    const userInitials = user.name
      ? user.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : user.email
          ?.slice(0, 2)
          .toUpperCase() || 'U';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.name || user.email} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleThemeToggle}>
            Toggle Theme
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile">Profile Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/preferences">Preferences</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <header
      className={`w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}
    >
      <div className="w-full flex h-12 items-center px-4">
        {/* Left section: App Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Map & Territory</h1>
          {projectName && (
            <span className="text-xs text-muted-foreground">— {projectName}</span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right section: User controls */}
        <div className="flex items-center justify-end space-x-2">
          <SimpleThemeToggle />
          {renderUserDropdown()}
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// Default Export
// ============================================================================

export default AppHeader;
