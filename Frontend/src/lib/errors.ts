// Lesbare Fehlermeldung aus einem beliebigen geworfenen Wert (statt `catch (e: any)`).
export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
