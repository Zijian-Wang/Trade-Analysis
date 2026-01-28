import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react'
import { vi } from 'vitest'

// Mock Firebase for tests
vi.mock('../app/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
