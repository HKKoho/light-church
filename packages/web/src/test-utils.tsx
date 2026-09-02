import type { ReactElement } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { LanguageProvider } from '@/lib/i18n/language-provider';

export { screen, fireEvent, waitFor, within, act, cleanup } from '@testing-library/react';

export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: LanguageProvider, ...options });
}
