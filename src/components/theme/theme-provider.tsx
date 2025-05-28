
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface PaletteColors {
  primary: string; // HSL string e.g., "277 58% 66%"
  accent: string;
  background: string; // Light mode background
  foreground: string; // Light mode foreground
  card: string;       // Light mode card background
  // Add other CSS variables you want to theme
}

interface Palette {
  name: string;
  colors: PaletteColors;
}

// Helper to parse HSL string "H S% L%" into [H, S, L] numbers
const parseHslString = (hslString: string): [number, number, number] | null => {
  const match = hslString.match(/(\d+)\s*(\d+)%\s*(\d+)%/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }
  return null;
};


export const palettes: Record<string, Palette> = {
  default: {
    name: "Default Purple",
    colors: { 
      primary: "277 58% 66%", // Vibrant Purple
      accent: "203 60% 64%",  // Soft Blue
      background: "220 13% 94.1%", // Light Gray
      foreground: "240 10% 3.9%",  // Dark Gray
      card: "0 0% 100%",          // White
    },
  },
  forest: {
    name: "Forest Green",
    colors: {
      primary: "120 39% 49%", // Forest Green
      accent: "45 56% 59%",   // Warm Yellow
      background: "120 10% 95%", // Very Light Greenish Gray
      foreground: "120 25% 15%", // Dark Forest Green
      card: "120 8% 98%",         // Off-white green tint
    },
  },
  ocean: {
    name: "Ocean Blue",
    colors: {
      primary: "210 55% 55%", // Ocean Blue
      accent: "180 40% 60%",  // Teal
      background: "210 20% 96%", // Very Light Bluish Gray
      foreground: "210 30% 20%", // Dark Slate Blue
      card: "210 15% 99%",        // Off-white blue tint
    },
  },
  sunset: {
    name: "Sunset Orange",
    colors: {
      primary: "25 85% 55%",    // Warm Orange
      accent: "330 40% 50%",   // Deep Pinkish Purple
      background: "35 70% 96%",  // Very Light Cream
      foreground: "30 40% 20%",   // Dark Brown
      card: "35 60% 99%",         // Off-white cream tint
    },
  },
  monochrome: {
    name: "Monochrome Gray",
    colors: {
      primary: "220 10% 50%",   // Medium Gray
      accent: "220 10% 30%",    // Darker Gray
      background: "220 15% 97%", // Very Light Gray
      foreground: "220 10% 10%", // Near Black
      card: "0 0% 100%",          // White
    },
  },
  desert: {
    name: "Desert Sand",
    colors: {
      primary: "30 60% 65%",    // Sandy Brown
      accent: "15 50% 50%",     // Terracotta
      background: "40 50% 96%",  // Pale Sand
      foreground: "20 35% 25%",   // Dark Sienna
      card: "40 40% 99%",         // Off-white sand tint
    },
  },
};

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleMode: () => void;
  selectedPalette: string; // Name of the palette
  setPalette: (paletteName: string) => void;
  currentColors: PaletteColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [selectedPalette, setSelectedPalette] = useState<string>('default');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedMode = localStorage.getItem('theme-mode') as 'light' | 'dark' | null;
    const storedPalette = localStorage.getItem('theme-palette') || 'default';

    if (storedMode) {
      setMode(storedMode);
    }
    setSelectedPalette(palettes[storedPalette] ? storedPalette : 'default');
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const root = window.document.documentElement;
    
    // Apply dark class first to set the stage for overrides
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme-mode', mode);

    // Apply palette colors
    const currentPaletteSet = palettes[selectedPalette] || palettes.default;
    const currentPaletteColors = currentPaletteSet.colors;

    // Set primary and accent colors from the palette unconditionally
    root.style.setProperty('--primary', currentPaletteColors.primary);
    root.style.setProperty('--accent', currentPaletteColors.accent);

    // Extract and set H, S, L for primary color
    const primaryHslArray = parseHslString(currentPaletteColors.primary);
    if (primaryHslArray) {
      root.style.setProperty('--primary-h', primaryHslArray[0].toString());
      root.style.setProperty('--primary-s', `${primaryHslArray[1]}%`);
      root.style.setProperty('--primary-l', `${primaryHslArray[2]}%`);
    }
     // Extract and set H, S, L for accent color
    const accentHslArray = parseHslString(currentPaletteColors.accent);
    if (accentHslArray) {
      root.style.setProperty('--accent-h', accentHslArray[0].toString());
      root.style.setProperty('--accent-s', `${accentHslArray[1]}%`);
      root.style.setProperty('--accent-l', `${accentHslArray[2]}%`);
    }
    
    // For background, foreground, and card, apply palette colors only if in light mode.
    // In dark mode, these are controlled by the .dark class in globals.css.
    // Clear any inline styles for these if in dark mode to ensure .dark class takes full effect.
    const themeSensitiveVars: (keyof Pick<PaletteColors, 'background' | 'foreground' | 'card'>)[] = ['background', 'foreground', 'card'];
    themeSensitiveVars.forEach(variable => {
      if (mode === 'dark') {
        root.style.removeProperty(`--${variable}`);
      } else {
        root.style.setProperty(`--${variable}`, currentPaletteColors[variable]);
      }
    });

    localStorage.setItem('theme-palette', selectedPalette);

  }, [mode, selectedPalette, isMounted]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const setPalette = (paletteName: string) => {
    if (palettes[paletteName]) {
      setSelectedPalette(paletteName);
    }
  };
  
  const currentColors = palettes[selectedPalette]?.colors || palettes.default.colors;

  // A ThemeProvider should always render its children.
  // The client-side effects (localStorage, DOM manipulation) are guarded by isMounted.
  return (
    <ThemeContext.Provider value={{ mode, toggleMode, selectedPalette, setPalette, currentColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { parseHslString };

