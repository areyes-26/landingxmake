// src/app/not-found/page.tsx
import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.subtitle}>Página No Encontrada</p>
        <p className={styles.description}>
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        <Link href="/dashboard" className={styles.button}>
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
  