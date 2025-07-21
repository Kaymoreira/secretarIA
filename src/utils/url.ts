export function getApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  return `http://localhost:3000${path}`;
} 