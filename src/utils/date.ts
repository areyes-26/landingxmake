import { Timestamp } from 'firebase/firestore';

export function formatFirestoreDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return 'N/A';
  
  try {
    const date = timestamp.toDate();
    if (isNaN(date.getTime())) {
      console.error('Invalid date from timestamp:', timestamp);
      return 'Fecha inválida';
    }
    
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error al formatear fecha';
  }
}

export function isValidTimestamp(timestamp: Timestamp | null | undefined): boolean {
  if (!timestamp) return false;
  try {
    const date = timestamp.toDate();
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
} 