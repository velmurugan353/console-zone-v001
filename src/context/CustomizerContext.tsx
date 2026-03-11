import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemePalette {
  bg: string;
  card: string;
  accent: string;
  secondary: string;
  text: string;
  muted: string;
  border: string;
}

export interface LayoutSettings {
  maxWidth: string;
  borderRadius: string;
  gridGap: string;
  fullWidthNavbar: boolean;
}

export interface SiteContent {
  [key: string]: any;
}

interface CustomizerContextType {
  theme: ThemePalette;
  layout: LayoutSettings;
  content: SiteContent;
  isEditMode: boolean;
  setEditMode: (value: boolean) => void;
  updateTheme: (newTheme: Partial<ThemePalette>) => void;
  updateLayout: (newLayout: Partial<LayoutSettings>) => void;
  updateContent: (pageKey: string, key: string, value: any) => void;
  resetToDefault: () => void;
}

const DEFAULT_THEME: ThemePalette = {
  bg: '#0a0a0a',
  card: '#121212',
  accent: '#00f0ff',
  secondary: '#7000ff',
  text: '#e0e0e0',
  muted: '#a0a0a0',
  border: '#2a2a2a',
};

const DEFAULT_LAYOUT: LayoutSettings = {
  maxWidth: '1280px',
  borderRadius: '1rem',
  gridGap: '2rem',
  fullWidthNavbar: true,
};

const CustomizerContext = createContext<CustomizerContextType | undefined>(undefined);

export const CustomizerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemePalette>(() => {
    const saved = localStorage.getItem('gv_custom_theme');
    if (saved && saved !== 'undefined') {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_THEME, ...parsed };
        }
      } catch (e) {
        console.error("Failed to parse theme:", e);
      }
    }
    return DEFAULT_THEME;
  });

  const [layout, setLayout] = useState<LayoutSettings>(() => {
    const saved = localStorage.getItem('gv_custom_layout');
    if (saved && saved !== 'undefined') {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_LAYOUT, ...parsed };
        }
      } catch (e) {
        console.error("Failed to parse layout:", e);
      }
    }
    return DEFAULT_LAYOUT;
  });

  const [content, setContent] = useState<SiteContent>(() => {
    const saved = localStorage.getItem('gv_custom_content');
    if (saved && saved !== 'undefined') {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse content:", e);
      }
    }
    return {};
  });

  const [isEditMode, setEditMode] = useState(false);

  useEffect(() => {
    // Apply theme colors to CSS variables
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--color-gaming-${key}`, value);
    });
    // Also update generic names if they differ
    root.style.setProperty('--color-gaming-accent', theme.accent);
    root.style.setProperty('--color-gaming-bg', theme.bg);
    root.style.setProperty('--color-gaming-card', theme.card);
    root.style.setProperty('--color-gaming-text', theme.text);
    root.style.setProperty('--color-gaming-muted', theme.muted);
    root.style.setProperty('--color-gaming-border', theme.border);
    
    localStorage.setItem('gv_custom_theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--layout-max-width', layout.maxWidth);
    root.style.setProperty('--layout-border-radius', layout.borderRadius);
    root.style.setProperty('--layout-grid-gap', layout.gridGap);
    
    localStorage.setItem('gv_custom_layout', JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    localStorage.setItem('gv_custom_content', JSON.stringify(content));
  }, [content]);

  const updateTheme = (newTheme: Partial<ThemePalette>) => {
    setTheme(prev => ({ ...prev, ...newTheme }));
  };

  const updateLayout = (newLayout: Partial<LayoutSettings>) => {
    setLayout(prev => ({ ...prev, ...newLayout }));
  };

  const updateContent = (pageKey: string, key: string, value: any) => {
    setContent(prev => ({
      ...prev,
      [pageKey]: {
        ...(prev[pageKey] || {}),
        [key]: value
      }
    }));
  };

  const resetToDefault = () => {
    setTheme(DEFAULT_THEME);
    setLayout(DEFAULT_LAYOUT);
    setContent({});
    localStorage.removeItem('gv_custom_theme');
    localStorage.removeItem('gv_custom_layout');
    localStorage.removeItem('gv_custom_content');
  };

  return (
    <CustomizerContext.Provider value={{
      theme,
      layout,
      content,
      isEditMode,
      setEditMode,
      updateTheme,
      updateLayout,
      updateContent,
      resetToDefault
    }}>
      {children}
    </CustomizerContext.Provider>
  );
};

export const useCustomizer = () => {
  const context = useContext(CustomizerContext);
  if (!context) {
    throw new Error('useCustomizer must be used within a CustomizerProvider');
  }
  return context;
};
