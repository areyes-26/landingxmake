import { Timestamp } from 'firebase/firestore';

export function formatFirestoreDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return 'N/A';
  
  const date = timestamp.toDate();
  return date.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
} 