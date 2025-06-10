// functions/src/services/firestoreService.ts
import { db } from '../../../src/lib/firebase';
import { 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    getDocs, 
    getDoc, 
    updateDoc,
    deleteDoc,
    query, 
    where,
    orderBy,
    limit,
    DocumentData,
    QuerySnapshot,
    DocumentSnapshot
} from 'firebase/firestore';

// Interfaces para tipado
export interface Usuario {
    id?: string;
    email: string;
    nombre: string;
    fechaRegistro: Date;
    plan: 'free' | 'premium' | 'enterprise';
    tokensUsados: number;
    videosGenerados: number;
    ultimaActividad: Date;
}

export interface VideoGenerado {
    id?: string;
    userId: string;
    titulo: string;
    descripcion: string;
    estado: 'procesando' | 'completado' | 'error';
    fechaCreacion: Date;
    fechaActualizacion?: Date;
    tokensUsados: number;
    configuracion: any;
    urlVideo?: string;
}

export interface Lead {
    id?: string;
    email: string;
    name?: string;
    phone?: string;
    source: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted';
    createdAt: Date;
    updatedAt?: Date;
}

// === FUNCIONES ORIGINALES PARA USUARIOS Y VIDEOS ===

// Crear perfil de usuario al registrarse
export const crearPerfilUsuario = async (userId: string, userData: any) => {
    try {
        await setDoc(doc(db, "usuarios", userId), {
            email: userData.email,
            nombre: userData.nombre || '',
            fechaRegistro: new Date(),
            plan: 'free', // o el plan que corresponda
            tokensUsados: 0,
            videosGenerados: 0,
            ultimaActividad: new Date()
        });
        console.log("Perfil de usuario creado en Firestore");
    } catch (error) {
        console.error("Error al crear perfil:", error);
        throw error;
    }
};

// Guardar video generado
export const guardarVideoGenerado = async (userId: string, videoData: any) => {
    try {
        const docRef = await addDoc(collection(db, "videos"), {
            userId: userId,
            titulo: videoData.titulo,
            descripcion: videoData.descripcion,
            estado: 'procesando', // procesando, completado, error
            fechaCreacion: new Date(),
            tokensUsados: videoData.tokensUsados || 0,
            configuracion: videoData.configuracion, // parámetros del video
            urlVideo: videoData.urlVideo || null
        });
        
        // Actualizar contador del usuario
        await actualizarContadorUsuario(userId, 'videosGenerados', 1);
        await actualizarContadorUsuario(userId, 'tokensUsados', videoData.tokensUsados || 0);
        
        return docRef.id;
    } catch (error) {
        console.error("Error al guardar video:", error);
        throw error;
    }
};

// Actualizar contadores del usuario
const actualizarContadorUsuario = async (userId: string, campo: string, incremento: number) => {
    try {
        const userRef = doc(db, "usuarios", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const currentValue = userDoc.data()[campo] || 0;
            await updateDoc(userRef, {
                [campo]: currentValue + incremento,
                ultimaActividad: new Date()
            });
        }
    } catch (error) {
        console.error(`Error al actualizar ${campo}:`, error);
    }
};

// Obtener videos del usuario
export const obtenerVideosUsuario = async (userId: string) => {
    try {
        const q = query(
            collection(db, "videos"), 
            where("userId", "==", userId),
            orderBy("fechaCreacion", "desc")
        );
        const querySnapshot = await getDocs(q);
        const videos: any[] = [];
        
        querySnapshot.forEach((doc) => {
            videos.push({ id: doc.id, ...doc.data() });
        });
        
        return videos;
    } catch (error) {
        console.error("Error al obtener videos:", error);
        throw error;
    }
};

// Obtener datos del usuario
export const obtenerDatosUsuario = async (userId: string) => {
    try {
        const docRef = doc(db, "usuarios", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
        throw error;
    }
};

// Actualizar estado del video
export const actualizarEstadoVideo = async (videoId: string, estado: string, urlVideo?: string) => {
    try {
        const videoRef = doc(db, "videos", videoId);
        const updateData: any = {
            estado: estado,
            fechaActualizacion: new Date()
        };
        
        if (urlVideo) {
            updateData.urlVideo = urlVideo;
        }
        
        await updateDoc(videoRef, updateData);
    } catch (error) {
        console.error("Error al actualizar estado del video:", error);
        throw error;
    }
};

// === SERVICIOS ADICIONALES CON CLASES ===

// Servicio para Usuarios (versión con clases para funciones adicionales)
export class UsuarioService {
    private collectionName = 'usuarios';

    async getById(id: string): Promise<Usuario | null> {
        return await obtenerDatosUsuario(id) as Usuario | null;
    }

    async getByEmail(email: string): Promise<Usuario | null> {
        try {
            const q = query(
                collection(db, this.collectionName), 
                where("email", "==", email)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() } as Usuario;
            }
            return null;
        } catch (error) {
            console.error('Error getting user by email:', error);
            throw error;
        }
    }

    async updatePlan(userId: string, plan: Usuario['plan']): Promise<void> {
        try {
            const userRef = doc(db, this.collectionName, userId);
            await updateDoc(userRef, {
                plan: plan,
                ultimaActividad: new Date()
            });
        } catch (error) {
            console.error('Error updating user plan:', error);
            throw error;
        }
    }

    async getAll(): Promise<Usuario[]> {
        try {
            const querySnapshot = await getDocs(collection(db, this.collectionName));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Usuario));
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }
}

// Servicio para Videos
export class VideoService {
    private collectionName = 'videos';

    async getById(id: string): Promise<VideoGenerado | null> {
        try {
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as VideoGenerado;
            }
            return null;
        } catch (error) {
            console.error('Error getting video:', error);
            throw error;
        }
    }

    async getByStatus(estado: VideoGenerado['estado']): Promise<VideoGenerado[]> {
        try {
            const q = query(
                collection(db, this.collectionName), 
                where("estado", "==", estado),
                orderBy("fechaCreacion", "desc")
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as VideoGenerado));
        } catch (error) {
            console.error('Error getting videos by status:', error);
            throw error;
        }
    }

    async getRecent(limitCount: number = 10): Promise<VideoGenerado[]> {
        try {
            const q = query(
                collection(db, this.collectionName),
                orderBy("fechaCreacion", "desc"),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as VideoGenerado));
        } catch (error) {
            console.error('Error getting recent videos:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const docRef = doc(db, this.collectionName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting video:', error);
            throw error;
        }
    }
}

// Servicio para Leads
export class LeadService {
    private collectionName = 'leads';

    async create(leadData: Omit<Lead, 'id' | 'createdAt'>): Promise<string> {
        try {
            const lead: Omit<Lead, 'id'> = {
                ...leadData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const docRef = await addDoc(collection(db, this.collectionName), lead);
            return docRef.id;
        } catch (error) {
            console.error('Error creating lead:', error);
            throw error;
        }
    }

    async getById(id: string): Promise<Lead | null> {
        try {
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as Lead;
            }
            return null;
        } catch (error) {
            console.error('Error getting lead:', error);
            throw error;
        }
    }

    async getByStatus(status: Lead['status']): Promise<Lead[]> {
        try {
            const q = query(
                collection(db, this.collectionName), 
                where("status", "==", status),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Lead));
        } catch (error) {
            console.error('Error getting leads by status:', error);
            throw error;
        }
    }

    async update(id: string, leadData: Partial<Omit<Lead, 'id' | 'createdAt'>>): Promise<void> {
        try {
            const docRef = doc(db, this.collectionName, id);
            await updateDoc(docRef, {
                ...leadData,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating lead:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const docRef = doc(db, this.collectionName, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting lead:', error);
            throw error;
        }
    }

    async getRecent(limitCount: number = 10): Promise<Lead[]> {
        try {
            const q = query(
                collection(db, this.collectionName),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Lead));
        } catch (error) {
            console.error('Error getting recent leads:', error);
            throw error;
        }
    }
}

// Instancias exportadas para uso directo
export const usuarioService = new UsuarioService();
export const videoService = new VideoService();
export const leadService = new LeadService();