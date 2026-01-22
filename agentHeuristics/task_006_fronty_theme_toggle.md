# Task 006: Fronty – Implement Dark/Light Theme Toggle

---

## 📣 **MANAGER ASSIGNMENT** (Opus – 22 Jan 2026, 22:21 AEDT)

**@Fronty** — Your first implementation task!

**Objective**: Add a functional dark/light theme toggle to the application with smooth transitions and persistent state.

---

## **Requirements**

### 1. Theme Toggle UI
- Add a toggle button in the Header component
- Use a sun/moon icon (or similar visual indicator)
- Position it near the existing header controls
- Make it visually consistent with the current design

### 2. Theme Implementation
- Create a `ThemeContext` to manage theme state
- Support two modes: `dark` (default) and `light`
- Persist theme preference in `localStorage`
- Apply theme classes to root element

### 3. Color Scheme
**Dark Mode (Current)**:
- Background: `#0a0a0c`
- Surface: `#0F0F11`
- Text: `#f8fafc`
- Borders: `rgba(255, 255, 255, 0.1)`

**Light Mode (New)**:
- Background: `#ffffff`
- Surface: `#f8fafc`
- Text: `#0F0F11`
- Borders: `rgba(0, 0, 0, 0.1)`

### 4. Smooth Transitions
- Add CSS transitions for color changes (300ms ease)
- Ensure no jarring flashes during theme switch
- Maintain gradient accents (cyan, purple, green, pink) in both modes

### 5. Accessibility
- Add `aria-label` to toggle button
- Ensure sufficient contrast in both modes (WCAG AA)
- Support keyboard activation (Enter/Space)

---

## **Implementation Steps**

### Step 1: Create ThemeContext
```typescript
// contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('animated_dreams_theme') as Theme;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('animated_dreams_theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

### Step 2: Add Theme Styles to index.css
```css
/* Theme variables */
:root {
  --bg-primary: #0a0a0c;
  --bg-surface: #0F0F11;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border-color: rgba(255, 255, 255, 0.1);
}

:root.light {
  --bg-primary: #ffffff;
  --bg-surface: #f8fafc;
  --text-primary: #0F0F11;
  --text-secondary: #64748b;
  --border-color: rgba(0, 0, 0, 0.1);
}

/* Smooth transitions */
body, .module-container, .glass-panel {
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease;
}
```

### Step 3: Update Components to Use CSS Variables
Replace hardcoded colors with CSS variables in key components:
- `App.tsx` — Background
- `Dashboard.tsx` — Module containers
- `Header.tsx` — Header background
- `Gallery.tsx` — Card backgrounds

Example:
```tsx
// Before
<div className="bg-[#0F0F11] text-white">

// After
<div style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
// OR use Tailwind with CSS variables
<div className="bg-surface text-primary">
```

### Step 4: Add Toggle Button to Header
```tsx
// components/Header.tsx
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'; // or use your icon library

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header>
      {/* Existing header content */}
      
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        {theme === 'dark' ? (
          <SunIcon className="w-5 h-5 text-yellow-400" />
        ) : (
          <MoonIcon className="w-5 h-5 text-slate-700" />
        )}
      </button>
    </header>
  );
}
```

### Step 5: Wrap App with ThemeProvider
```tsx
// main.tsx or App.tsx
import { ThemeProvider } from './contexts/ThemeContext';

<ThemeProvider>
  <App />
</ThemeProvider>
```

---

## **Verification Checklist**

- [x] Theme toggle button appears in Header
- [x] Clicking toggle switches between dark and light modes
- [x] Theme preference persists after page reload
- [x] All text remains readable in both modes (contrast check) - *Implemented dark:text-white/slate-900*
- [x] Gradient accents (cyan, purple, etc.) remain visible in both modes - *Unchanged, overlay on bg-white fits*
- [x] Smooth 300ms transition when switching themes (Tailwind default)
- [x] No console errors or warnings - *Syntax fixed*
- [x] Keyboard accessible (Tab to button, Enter/Space to toggle)
- [x] `aria-label` correctly describes current action (via NavAction tooltip)

---

## **Files to Modify**

- **Create**: `/contexts/ThemeContext.tsx`
- **Modify**: `/src/index.css` (add CSS variables and transitions)
- **Modify**: `/components/Header.tsx` (add toggle button)
- **Modify**: `/main.tsx` or `/App.tsx` (wrap with ThemeProvider)
- **Modify**: `/components/Dashboard.tsx`, `/components/Gallery.tsx` (use CSS variables)

---

## **Deliverables**

1. Functional theme toggle in Header
2. ThemeContext implementation
3. CSS variables for theme colors
4. Persistent theme preference
5. Screenshot or screen recording showing theme switch

---

**Status**: PENDING  
**Assigned To**: Fronty  
**Priority**: HIGH  
**Estimated Effort**: 2-3 hours  
**Parallel Safe**: ✅ YES (no conflicts with Backy's task)

---

**Manager Notes**: This is a test task to verify Fronty can implement visible UI changes. Once complete, we'll assign more complex tasks.
