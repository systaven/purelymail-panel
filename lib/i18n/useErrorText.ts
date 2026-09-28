import { useCallback } from 'react';
import { ApiClientError } from '@/lib/client-api';
import { format, useLocale } from '.';
import { errorMessages } from './messages/errors';

// Turns an error into text in the viewer's language: known server error codes
// are translated, anything else falls back to the error's own message.
export function useErrorText() {
  const { locale } = useLocale();
  return useCallback(
    (error: unknown): string => {
      if (error instanceof ApiClientError && error.code && error.code in errorMessages.en) {
        const key = error.code as keyof typeof errorMessages.en;
        return format(errorMessages[locale][key], error.params);
      }
      return error instanceof Error ? error.message : String(error);
    },
    [locale]
  );
}
