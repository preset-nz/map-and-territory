'use client';

/**
 * ThemeToggle - Professional Layout System Theme Management
 * 
 * Features:
 * - Light/Dark/System theme switching with persistence
 * - Layout store integration for theme state management  
 * - Professional icon-based toggle interface
 * - Keyboard navigation support
 * - Accessibility compliant with ARIA labels
 * - Smooth transitions and visual feedback
 */

import React, { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useLayoutStore } from '@/stores/layout';
import type { Theme } from '@/types/layout';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ElementType;
  description: string;
}

// ============================================================================
// Theme Configuration
// ============================================================================

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Light theme with bright backgrounds',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Dark theme with darker backgrounds',
  },
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Use system preference',
  },
];

// ============================================================================
// Theme Utilities
// ============================================================================

/**
 * Get the current system theme preference
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Apply theme to document element
 */
const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark');
  
  // Add new theme class
  root.classList.add(resolvedTheme);
  
  // Update CSS custom properties for theme
  root.style.colorScheme = resolvedTheme;
};

/**
 * Get the current active theme icon
 */
const getThemeIcon = (theme: Theme): React.ElementType => {
  if (theme === 'system') {
    const systemTheme = getSystemTheme();
    return systemTheme === 'dark' ? Moon : Sun;
  }
  
  const option = themeOptions.find(opt => opt.value === theme);
  return option?.icon || Sun;
};

// ============================================================================
// ThemeToggle Component
// ============================================================================

/**
 * ThemeToggle - Theme switching component with dropdown interface
 * 
 * Provides a professional theme toggle interface with support for
 * light, dark, and system themes. Integrates with layout store
 * for persistence and state management.
 */
export const ThemeToggle: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'secondary';
  className?: string;
}> = ({
  size = 'md',
  variant = 'ghost',
  className,
}) => {
  const theme = useLayoutStore((state) => state.theme);
  const setTheme = useLayoutStore((state) => state.setTheme);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Handle theme selection
  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  // Get current theme display info
  const currentThemeOption = themeOptions.find(opt => opt.value === theme) || themeOptions[0];
  const ThemeIcon = getThemeIcon(theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'icon'}
          className={cn(
            // Professional styling
            'relative transition-colors',
            
            // Focus styles
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            
            className
          )}
          aria-label={`Current theme: ${currentThemeOption.label}. Click to change theme.`}
        >
          <ThemeIcon className="h-4 w-4" />
          
          {/* Visual indicator for active theme */}
          <span className="sr-only">
            Theme: {currentThemeOption.label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56"
        sideOffset={4}
      >
        {themeOptions.map((option) => {
          const OptionIcon = option.icon;
          const isActive = theme === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleThemeSelect(option.value)}
              className={cn(
                // Professional menu item styling
                'flex items-center gap-3 py-2.5 px-3 cursor-pointer',
                
                // Active state styling
                isActive && 'bg-accent text-accent-foreground',
                
                // Focus styles
                'focus:bg-accent focus:text-accent-foreground',
              )}
              role="menuitemradio"
              aria-checked={isActive}
            >
              <div className={cn(
                // Icon container
                'flex items-center justify-center w-4 h-4',
                isActive ? 'text-accent-foreground' : 'text-muted-foreground'
              )}>
                <OptionIcon className="h-4 w-4" />
              </div>
              
              <div className="flex-1">
                <div className={cn(
                  'font-medium text-sm',
                  isActive ? 'text-accent-foreground' : 'text-foreground'
                )}>
                  {option.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================================================
// Simple Theme Toggle Button
// ============================================================================

/**
 * SimpleThemeToggle - Minimal theme toggle for compact spaces
 * 
 * Provides a simple light/dark toggle without system option
 * for use in headers or toolbars where space is limited.
 */
export const SimpleThemeToggle: React.FC<{
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ className, size = 'md' }) => {
  const theme = useLayoutStore((state) => state.theme);
  const setTheme = useLayoutStore((state) => state.setTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme to document when theme changes (and after mount to avoid SSR mismatch)
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [theme, mounted]);

  // Toggle between light and dark (ignore system)
  const toggleTheme = () => {
    const currentTheme = theme === 'system' ? getSystemTheme() : theme;
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  // Get current resolved theme for icon
  const resolvedTheme = theme === 'system' ? (mounted ? getSystemTheme() : 'light') : theme;
  const ThemeIcon = mounted ? (resolvedTheme === 'dark' ? Sun : Moon) : Monitor;

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'icon'}
      onClick={toggleTheme}
      className={cn(
        'transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      aria-label={mounted ? `Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme` : 'Toggle theme'}
    >
      <ThemeIcon className="h-4 w-4" />
    </Button>
  );
};

// ============================================================================
// Theme Provider Hook
// ============================================================================

/**
 * useTheme - Hook for accessing theme state and utilities
 * 
 * Provides theme state and utility functions for components
 * that need to be theme-aware.
 */
export const useTheme = () => {
  const theme = useLayoutStore((state) => state.theme);
  const setTheme = useLayoutStore((state) => state.setTheme);

  // Get resolved theme (system -> actual theme)
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  // Check if current theme matches a specific theme
  const isTheme = (targetTheme: 'light' | 'dark') => {
    return resolvedTheme === targetTheme;
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    isTheme,
    isLight: resolvedTheme === 'light',
    isDark: resolvedTheme === 'dark',
    isSystem: theme === 'system',
  };
};

// ============================================================================
// Default Export
// ============================================================================

export default ThemeToggle;
