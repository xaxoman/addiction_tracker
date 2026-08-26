import { useMemo } from 'react';
import { useAppSettings } from '../context/AppSettingsContext';
import { t, TranslationParams } from './translations';

export const useI18n = () => {
  const { language } = useAppSettings();

  return useMemo(
    () => ({
      language,
      t: (key: string, params?: TranslationParams) => t(language, key, params)
    }),
    [language]
  );
};
