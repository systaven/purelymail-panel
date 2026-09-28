export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

// Runs in <head> before the page renders, so there is no flash of the wrong
// theme. Kept as a string because it's inlined into the document.
export const themeInitScript = `(function(){try{
var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';
var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',d);
}catch(e){}})();`;

export function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(preference: ThemePreference): boolean {
  const dark = preference === 'dark' ||
    (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  return dark;
}
