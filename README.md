# Multimedia Resilience - React Native App

Aplicación móvil que implementa resiliencia en transacciones para dos módulos principales: gestión de venues y reproductor de música.

---

## Video Demostrativo

[![Video de Demostración](https://img.shields.io/badge/Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/Ua3KWPDPxdw)

---

## Módulo 1: Venues con Resiliencia

### Características Implementadas

**Persistencia Local con SQLite**
- Archivo: `src/services/database.ts`
- Implementa operaciones CRUD en SQLite
- Tabla `venues` con campos: id, name, latitude, longitude, synced, createdAt

**Sistema de Sincronización con Reintentos**
- Archivo: `src/controllers/venueController.ts`
- Función `addVenue`: Intenta sincronizar inmediatamente al crear un venue
- Función `retryPendingSync`: Reintenta sincronización de venues pendientes
- Si falla, el venue queda marcado como `synced: false` para reintento posterior

**Servicio API con Manejo de Errores**
- Archivo: `src/services/api.ts`
- Función `checkNetworkConnection`: Verifica conectividad antes de sincronizar
- Función `syncVenues`: Envía venues al servidor con timeout de 10 segundos
- Maneja errores de red y timeout con reintentos automáticos

**UI con Estados de Sincronización**
- Archivo: `src/views/HomeScreen.tsx`
- Mapa interactivo con marcadores de venues
- Marcadores verdes: sincronizados
- Marcadores rojos: pendientes de sincronización
- Contadores de total y pendientes
- Botón "Sync Now" para forzar sincronización

**Vista de Base de Datos**
- Archivo: `src/views/DatabaseScreen.tsx`
- Tabla SQLite con todos los venues
- Filtros: All, Synced, Pending
- Visualización del estado de sincronización por registro

### Flujo de Transacción Resiliente (Venues)

1. Usuario agrega venue en el mapa
2. Se guarda localmente en SQLite con `synced: false`
3. Intento de sincronización inmediata:
   - Si tiene éxito: `synced: true`
   - Si falla: queda como `synced: false`
4. Venues pendientes se pueden sincronizar manualmente con "Sync Now"
5. Sistema verifica conectividad antes de cada intento

---

## Módulo 2: Reproductor de Música con Resiliencia

### Características Implementadas

**Modelo de Canciones**
- Archivo: `src/models/Songs.ts`
- 6 canciones: 5 válidas + 1 corrupta para simular fallo
- Canciones locales usando `require()` para assets de audio

**Sistema de Transacciones con Cola**
- Archivo: `src/controllers/MusicController.ts`
- Clase `MusicController` implementa patrón Singleton
- Cola de transacciones con estados: pending, success, failed
- Cada transacción registra: id, songId, status, attempts, timestamp

**Logging con Firebase Crashlytics**
- Archivo: `src/utils/logger.ts`
- Integración con Firebase Crashlytics
- Funciones: `captureException`, `captureMessage`

**UI del Reproductor**
- Archivo: `src/views/MusicPlayerView.tsx`
- Player completo con controles: play/pause, skip ±10s, volumen
- Muestra errores de playback en canciones fallidas
- Badge "Playback Error - Tap to retry" para reintentar
- Mini player cuando se minimiza
- Barra de progreso interactiva

### Flujo de Transacción Resiliente (Música)

1. Usuario selecciona canción de la playlist
2. Se crea transacción con estado `pending` y se agrega a la cola
3. Sistema intenta cargar y reproducir audio:
   - Si es corrupta o falla: reintento automático con backoff
   - Si tiene éxito: marca como `success` y muestra notificación
4. Transacciones fallidas se muestran con badge rojo
5. Usuario puede reintentar tocando el badge de error
6. Cola se persiste en AsyncStorage para sobrevivir reinicios de app
7. Auto-limpieza de errores antiguos (>1 hora) al cargar la app

---

## Estructura de Archivos Clave

### Modelos
- `src/models/Venue.ts` - Interface de venue
- `src/models/Songs.ts` - Catálogo de canciones

### Controladores
- `src/controllers/venueController.ts` - Lógica de venues y sincronización
- `src/controllers/MusicController.ts` - Gestión de cola de reproducción

### Servicios
- `src/services/database.ts` - Operaciones SQLite
- `src/services/api.ts` - Llamadas HTTP y manejo de red
- `src/services/backgroundSync.ts` - Sincronización en segundo plano

### Utilidades
- `src/utils/logger.ts` - Logging con Crashlytics

### Vistas
- `src/views/HomeScreen.tsx` - Mapa y gestión de venues
- `src/views/DatabaseScreen.tsx` - Visualización de SQLite
- `src/views/MusicPlayerView.tsx` - Reproductor de música

### Componentes
- `src/components/Icons.tsx` - Iconos SVG reutilizables

---

## Configuración del Proyecto

### Dependencias Principales
- React Native 0.81.5
- Expo SDK 54
- expo-av: Reproducción de audio
- expo-sqlite: Base de datos local
- @react-native-async-storage/async-storage: Persistencia de transacciones
- @react-native-firebase/crashlytics: Logging de errores
- react-native-maps: Visualización de mapa
- react-native-svg: Iconos vectoriales

### Archivos de Configuración
- `app.json` - Configuración de Expo con plugins de Firebase
- `GoogleService-Info.plist` - Configuración de Firebase para iOS
- `google-services.json` - Configuración de Firebase para Android
- `ios/Podfile` - Dependencias nativas iOS

### Ejecutar el Proyecto
```bash
npm install
npx expo start
```

Para iOS:
```bash
cd ios && pod install && cd ..
npx expo run:ios
```

---

## Demostración de Fallas y Recuperación

### Venues
1. Agregar venue sin conexión: Se guarda localmente
2. Contador "Not synced" incrementa
3. Presionar "Sync Now": Reintenta sincronización
4. Con conexión: Marcador cambia de rojo a verde

### Música
1. Reproducir "Broken Song": Falla por archivo corrupto
2. Sistema reintenta automáticamente 5 veces con delays crecientes
3. Después de 5 fallos: Muestra "Playback Error - Tap to retry"
4. Usuario puede reintentar tocando el badge
5. Transacción se registra en AsyncStorage
6. Logs se envían a Firebase Crashlytics
