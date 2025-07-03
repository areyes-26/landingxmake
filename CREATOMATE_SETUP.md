# Configuración de Creatomate

## Variables de Entorno Requeridas

Agrega las siguientes variables de entorno a tu archivo `.env.local`:

```env
# Creatomate API Key
CREATOMATE_API_KEY=2dc77ac73e6b46488e8b9a7a798107c151e1bcecf86cc628a952654032947fb3be89bfa3af890ae3247e0c14f03bd6ac

# Creatomate Template ID
CREATOMATE_TEMPLATE_ID=273cdd5f-f40a-4c72-9a08-55245e49bfbc

# URL base de tu aplicación (para webhooks)
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
```

## Configuración en Creatomate

### 1. Crear un Template

1. Ve a [Creatomate](https://creatomate.com) y crea una cuenta
2. Crea un nuevo template con los siguientes elementos:
   - **Video Input**: Para el video de HeyGen
   - **Subtítulos**: Para mostrar el script
   - **Música de fondo**: Opcional
   - **Logo overlay**: Opcional
   - **Efectos visuales**: Según tus necesidades

### 2. Configurar Variables del Template

En tu template de noticias, las siguientes variables serán reemplazadas dinámicamente:

- `Imagen-Total.source`: URL del video de HeyGen (imagen principal)
- `Contenido-Noticia-Portada.text`: Script generado por OpenAI
- `Fecha.text`: Fecha actual en formato español
- `Safe-Area.source`: Asset de seguridad (configurado automáticamente)
- `Imagen-Noticia-1.source` a `Imagen-Noticia-4.source`: Imágenes adicionales (vacías por defecto)
- `Imagen-Portada-Abajo.source` y `Imagen-Portada-Arriba.source`: Imágenes de portada (vacías por defecto)

### 3. 🎯 Subtítulos Dinámicos

El sistema ahora incluye **subtítulos sincronizados** que se adaptan al ritmo del avatar:

#### Elemento de Subtítulos
```json
{
  "id": "6f48d084-c008-412a-8b8e-9306be64b34a",
  "name": "subtitles",
  "type": "text",
  "dynamic": true,
  "transcript_source": "text",
  "transcript_effect": "color",
  "transcript_split": "word",
  "transcript_placement": "static"
}
```

#### Variables de Subtítulos
- `subtitles.text`: Script dividido en segmentos sincronizados
- `subtitles.transcript_source`: "text" (usar texto como fuente)
- `subtitles.transcript_effect`: "color" (efecto de resaltado)
- `subtitles.transcript_split`: "word" (dividir por palabras)
- `subtitles.transcript_placement`: "static" (posición fija)
- `subtitles.transcript_maximum_length`: 50 (máximo caracteres por línea)
- `subtitles.transcript_color`: "#e74c3c" (color de resaltado)

### 3. Obtener Template ID

Una vez creado el template:
1. Ve a la configuración del template
2. Copia el Template ID
3. Agrégalo a la variable `CREATOMATE_TEMPLATE_ID`

### 4. Configurar Webhook

1. En la configuración del template, agrega la URL del webhook:
   ```
   https://tu-dominio.com/api/creatomate/webhook
   ```

## Flujo de Trabajo

1. **Usuario envía formulario** → Se genera script y copys
2. **Usuario confirma** → Se envía a HeyGen
3. **HeyGen genera video** → Se envía automáticamente a Creatomate
4. **Creatomate edita video** → Crea video de noticias con:
   - Video de HeyGen como imagen principal
   - Script como contenido de noticia
   - **🎯 Subtítulos sincronizados** que siguen el ritmo del avatar
   - Fecha actual
   - Efectos y transiciones del template
5. **Video final listo** → Usuario puede ver y descargar el video editado

## 🎯 Sistema de Subtítulos Sincronizados

### Cómo Funciona

#### 1. **Análisis del Script**
```typescript
// Divide el script en oraciones y frases
const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
```

#### 2. **Cálculo de Timing**
- **Con duración del video**: Distribuye palabras proporcionalmente
- **Sin duración**: Usa estimación estándar (2.5 palabras/segundo)
- **Mínimo por segmento**: 1-2 segundos para legibilidad

#### 3. **División Inteligente**
- **Oraciones cortas** (< 12 palabras): Se mantienen completas
- **Oraciones largas** (> 12 palabras): Se dividen en frases
- **Conectores detectados**: y, o, pero, sin embargo, además, también, etc.

#### 4. **Formato para Creatomate**
```typescript
// Formato: "texto1|texto2|texto3"
const subtitlesText = subtitles.map(subtitle => subtitle.text).join('|');
```

### Ejemplo de División

**Script original:**
> "El mundo nunca se detiene y las noticias tampoco. Ayer, 1 de julio de 2025, tres eventos marcaron la agenda global. En primer lugar, el conflicto en Medio Oriente tomó un nuevo giro."

**Subtítulos generados:**
1. "El mundo nunca se detiene y las noticias tampoco"
2. "Ayer, 1 de julio de 2025, tres eventos marcaron la agenda global"
3. "En primer lugar, el conflicto en Medio Oriente"
4. "tomó un nuevo giro"

### Logs del Sistema
- `[Subtitles] Script length: X characters`
- `[Subtitles] Video duration: Xs, Total words: X, Words per second: X.XX`
- `[Subtitles] Generated X subtitle segments`
- `[Subtitles] Total subtitle duration: X.XXs`
- `[Subtitles] Sample segments: [...]`

## Template de Noticias

Tu template está configurado para crear videos de noticias con:
- **Imagen principal**: Video generado por HeyGen
- **Contenido**: Script generado por OpenAI
- **Fecha**: Fecha actual en formato español
- **Efectos**: Transiciones y animaciones del template
- **Formato**: Optimizado para redes sociales

## Estados del Video

- `pending`: Video creado, pendiente de procesamiento
- `processing`: Video siendo generado por HeyGen
- `editing`: Video siendo editado por Creatomate
- `completed`: Video final listo
- `error`: Error en el proceso

## URLs de Video

El sistema prioriza los videos en este orden:
1. `creatomateResults.videoUrl` (video editado)
2. `heygenResults.videoUrl` (video original)
3. `videoUrl` (fallback)

## Notas Importantes

- Los videos de Creatomate no expiran como los de HeyGen
- Si Creatomate falla, el sistema usa el video de HeyGen como fallback
- El webhook actualiza automáticamente el estado cuando Creatomate termina
- Los templates de Creatomate deben ser públicos o compartidos con tu API key

## Debug y Troubleshooting

### Verificar Dimensiones de Video
Para debuggear problemas con las dimensiones, usa el endpoint de debug:

```
GET /api/debug/video-dimensions?videoId=TU_VIDEO_ID
```

Esto te mostrará:
- Dimensiones guardadas en Firestore
- Orientación y resolución seleccionadas
- Estado de HeyGen y Creatomate
- URLs de los videos generados

### Logs Importantes
Revisa los logs del servidor para:
- `Dimension from Firestore:` - Dimensiones leídas de Firestore
- `Creatomate modifications:` - Datos enviados a Creatomate
- `Form data orientation:` y `Form data resolution:` - Selección del usuario
- `[Polling] Video X status: Y` - Estado del video durante el polling
- `[Polling] Checking HeyGen/Creatomate status` - Qué servicio se está verificando

## Sistema de Polling Inteligente

### 🚀 Polling Inteligente y Eficiente
El sistema ahora funciona **100% en el backend** de manera inteligente:

- **✅ Polling inteligente**: Solo se ejecuta cuando hay videos en proceso
- **✅ Sin dependencia del usuario**: No requiere que el usuario esté en la página
- **✅ Transición automática**: HeyGen → Creatomate cuando termina
- **✅ Webhook de respaldo**: Creatomate notifica automáticamente cuando termina
- **✅ Eficiencia**: No consume recursos cuando no hay videos activos

### Flujo de Estados
1. **`pending`** → Generación de script (Cloud Function)
2. **`processing`** → HeyGen generando video (polling inteligente)
3. **`editing`** → Creatomate editando video (polling inteligente)
4. **`completed`** → Video final listo

### Cómo Funciona el Polling Inteligente

#### 1. **Trigger por Documento**
```typescript
export const startVideoPolling = functions.firestore
  .document('videos/{videoId}')
  .onCreate(async (snapshot, context) => {
    // Se activa solo cuando se crea un video nuevo
  });
```

#### 2. **Polling Programado Eficiente**
```typescript
export const scheduledVideoPolling = functions.pubsub
  .schedule('every 1 minutes')  // Solo cada minuto
  .onRun(async (context) => {
    // Solo procesa si hay videos activos
  });
```

#### 3. **Búsqueda Inteligente**
- Busca videos con status `'processing'` o `'editing'`
- Si no hay videos activos → No hace nada (ahorro de recursos)
- Procesa cada video según su estado actual
- Continúa con el siguiente si hay errores

#### 4. **Polling de HeyGen**
- Verifica estado cuando hay videos en proceso
- Cuando termina, envía automáticamente a Creatomate
- Actualiza Firestore con el resultado

#### 5. **Polling de Creatomate**
- Verifica estado cuando hay videos en proceso
- Cuando termina, marca como `completed`
- Actualiza Firestore con el video final

### Fallbacks y Robustez
- **Si Creatomate falla** → Usa video de HeyGen como fallback
- **Si HeyGen falla** → Marca como `error`
- **Si hay errores de red** → Continúa con el siguiente video
- **Webhook de Creatomate** → Notificación inmediata cuando termina

### Logs del Sistema
- `[Smart Polling] 🚀 Iniciando polling para video X`
- `[Scheduled Polling] 🔄 Verificando si hay videos en proceso`
- `[Scheduled Polling] ✅ No hay videos en proceso - skipping`
- `[Video Polling] 🎬 Verificando HeyGen para video X`
- `[Video Polling] 🎨 Verificando Creatomate para video X`
- `[Video Polling] ✅ Video completado`

## Configuración de Avatar

### Parámetros de Posicionamiento
El sistema ahora incluye control sobre la posición y tamaño del avatar en HeyGen:

```typescript
// Configuración por defecto para videos verticales
const avatarConfig = {
  offset: { x: 0, y: 0.23 },  // Posición del avatar
  scale: 1.14                  // Tamaño del avatar
};
```

### Explicación de Parámetros

- **`offset.x`**: Posición horizontal (-1 a 1, donde 0 es centro)
- **`offset.y`**: Posición vertical (-1 a 1, donde 0 es centro, valores positivos mueven hacia abajo)
- **`scale`**: Tamaño del avatar (1.0 = tamaño normal, >1 = más grande, <1 = más pequeño)

### Valores Recomendados

**Para videos verticales (1080x1920):**
- `offset: { x: 0, y: 0.23 }` - Avatar centrado horizontalmente, ligeramente hacia abajo
- `scale: 1.14` - Avatar ligeramente más grande

**Para videos horizontales (1920x1080):**
- `offset: { x: 0, y: 0 }` - Avatar centrado
- `scale: 1.0` - Tamaño normal

### Personalización
Puedes ajustar estos valores en `src/app/api/heygen/generate-video/route.ts`:

```typescript
const defaultOffset = { x: 0, y: 0.23 }; // Ajusta según necesites
const defaultScale = 1.14; // Ajusta según necesites
```

## Problemas Conocidos

### 1. Dimensiones de HeyGen
**Problema**: HeyGen a veces ignora las dimensiones especificadas y genera videos horizontales incluso cuando se solicitan dimensiones verticales (1080x1920).

**Síntomas**: 
- Se solicitan dimensiones verticales (1080x1920)
- HeyGen confirma las dimensiones correctas
- El video resultante es horizontal

**Solución**: Este es un problema conocido de HeyGen. No hay solución desde nuestro lado.

### 2. Posicionamiento de Avatares
**Problema**: Algunos avatares sin fondo aparecen flotando en el centro del video en lugar de estar posicionados correctamente.

**Síntomas**:
- Avatares como "Amanda_in_Blue_Shirt_Left" aparecen flotando
- No están centrados y pegados al borde inferior
- Se ven como recortados

**Solución**: 
- ✅ **Implementado**: Control de posición con `offset` y `scale`
- Los valores por defecto (`offset: { x: 0, y: 0.23 }, scale: 1.14`) ayudan a posicionar mejor el avatar
- Los avatares con fondo suelen posicionarse mejor que los sin fondo
- Puedes ajustar los valores en la configuración según el avatar específico

### 3. Error de Creatomate (renderId undefined)
**Problema**: A veces Creatomate no devuelve el renderId correctamente.

**Síntomas**:
- Error en Firestore: "Cannot use undefined as a Firestore value"
- El video no se envía a Creatomate

**Solución**: Implementada verificación y logging mejorado.

## Sistema de Polling Mejorado

### ✅ Polling Inteligente Implementado
- **Backend Polling** (Cloud Functions): Solo cuando hay videos activos
- **Sin dependencia del frontend**: Funciona completamente en el backend
- **Transición automática**: HeyGen → Creatomate sin intervención manual
- **Eficiencia**: No consume recursos cuando no hay videos en proceso

### Logs del Sistema
- `[Smart Polling] 🚀 Iniciando polling para video X` - Trigger por documento
- `[Scheduled Polling] 🔄 Verificando si hay videos en proceso` - Polling programado
- `[Scheduled Polling] ✅ No hay videos en proceso - skipping` - Ahorro de recursos
- `[Video Polling] 🎬 Verificando HeyGen para video X` - Polling de HeyGen
- `[Video Polling] 🎨 Verificando Creatomate para video X` - Polling de Creatomate
- `[Video Polling] ✅ Video completado` - Video terminado
- `⚠️ HeyGen dimension warning` - Advertencia sobre dimensiones
- `⚠️ Avatar positioning warning` - Advertencia sobre posicionamiento 