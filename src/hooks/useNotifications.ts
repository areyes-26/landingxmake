import { useEffect, useState, useCallback } from 'react';
import { onSnapshot, collection, query, orderBy, doc, setDoc, getDoc, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  type: string;
  message: string;
  videoId?: string;
  url?: string;
  read: boolean;
  createdAt?: any;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'Notifications', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const notifs: Notification[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading };
}

// Nuevo hook para preferencias
export interface NotificationSettings {
  video: boolean;
  system: boolean;
  email: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  video: true,
  system: true,
  email: false,
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Leer settings
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    const ref = doc(db, 'Notifications', user.uid, 'settings', 'notifications_settings');
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    });
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
      }
    });
    return () => unsub();
  }, [user]);

  // Actualizar settings
  const updateSetting = useCallback(
    async (key: keyof NotificationSettings, value: boolean) => {
      if (!user) return;
      const ref = doc(db, 'Notifications', user.uid, 'settings', 'notifications_settings');
      await setDoc(ref, { ...settings, [key]: value }, { merge: true });
    },
    [user, settings]
  );

  return { settings, loading, updateSetting };
} 