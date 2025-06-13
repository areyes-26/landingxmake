import { db } from '../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
        await db.collection("usuarios").doc(userId).set({
            email: userData.email,
            nombre: userData.nombre || '',
            fechaRegistro: new Date(),
            plan: 'free',
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
        const docRef = await db.collection("videos").add({
            userId: userId,
            titulo: videoData.titulo,
            descripcion: videoData.descripcion,
            estado: 'procesando',
            fechaCreacion: new Date(),
            tokensUsados: videoData.tokensUsados || 0,
            configuracion: videoData.configuracion,
            urlVideo: videoData.urlVideo || null
        });

        await actualizarContadorUsuario(userId, 'videosGenerados', 1);
        await actualizarContadorUsuario(userId, 'tokensUsados', videoData.tokensUsados || 0);

        return docRef.id;
    } catch (error) {
        console.error("Error al guardar video:", error);
        throw error;
    }
};

const actualizarContadorUsuario = async (userId: string, campo: string, incremento: number) => {
    try {
        const userRef = db.collection("usuarios").doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const currentValue = userDoc.data()?.[campo] || 0;
            await userRef.update({
                [campo]: currentValue + incremento,
                ultimaActividad: new Date()
            });
        }
    } catch (error) {
        console.error(`Error al actualizar ${campo}:`, error);
    }
};

export const obtenerVideosUsuario = async (userId: string) => {
    try {
        const querySnapshot = await db.collection("videos")
            .where("userId", "==", userId)
            .orderBy("fechaCreacion", "desc")
            .get();

        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error al obtener videos:", error);
        throw error;
    }
};

export const obtenerDatosUsuario = async (userId: string) => {
    try {
        const docSnap = await db.collection("usuarios").doc(userId).get();
        return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
        throw error;
    }
};

export const actualizarEstadoVideo = async (videoId: string, estado: string, urlVideo?: string) => {
    try {
        const updateData: any = {
            estado: estado,
            fechaActualizacion: new Date()
        };
        if (urlVideo) updateData.urlVideo = urlVideo;

        await db.collection("videos").doc(videoId).update(updateData);
    } catch (error) {
        console.error("Error al actualizar estado del video:", error);
        throw error;
    }
};
