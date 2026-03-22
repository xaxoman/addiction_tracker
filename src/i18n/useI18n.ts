import { useMemo } from 'react';
import { useAppSettings } from '../context/AppSettingsContext';
import { t } from './translations';

export const useI18n = () => {
  const { language } = useAppSettings();

  return useMemo(
    () => ({
      language,
      t: (key: string) => t(language, key)
    }),
    [language]
  );
};
