# 💪 Fit Bro — Evidence-Based Adaptive Coach

## 🚀 Desplegar en Vercel (paso a paso)

### Requisitos previos
- Cuenta de GitHub (gratis): https://github.com
- Cuenta de Vercel (gratis): https://vercel.com
- Git instalado en tu PC (o usa GitHub Desktop)

---

### Paso 1: Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `fitbro`
3. Privado o público (tu decisión)
4. **NO** marques "Add README" (ya tenemos uno)
5. Click **Create repository**

---

### Paso 2: Subir el código

Abre una terminal en la carpeta `fitbro-pwa` y ejecuta:

```bash
git init
git add .
git commit -m "Fit Bro v8 - PWA"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/fitbro.git
git push -u origin main
```

*(Reemplaza `TU_USUARIO` con tu usuario de GitHub)*

---

### Paso 3: Conectar con Vercel

1. Ve a https://vercel.com y loguéate con GitHub
2. Click **"Add New Project"**
3. Selecciona el repositorio `fitbro`
4. Framework: **Vite** (debería auto-detectarlo)
5. Click **Deploy**
6. Espera ~1 minuto → te da una URL tipo `fitbro-xxx.vercel.app`

---

### Paso 4: Instalar en tu celular (PWA)

1. Abre la URL de Vercel en **Chrome** de tu celular
2. Espera a que cargue completamente
3. Chrome mostrará un banner "Añadir a pantalla de inicio"
   - Si no aparece: toca los **3 puntos** (⋮) → **"Instalar app"** o **"Añadir a pantalla de inicio"**
4. Se instala como app nativa con icono en tu home

---

### Paso 5: Actualizar la app (automático)

Cada vez que hagas cambios:

```bash
# Edita los archivos que quieras
git add .
git commit -m "descripción del cambio"
git push
```

Vercel detecta el push y redespliega automáticamente (~30 segundos).
La próxima vez que abras la app en tu celular, se actualiza sola gracias al Service Worker.

---

## 📁 Estructura del proyecto

```
fitbro-pwa/
├── index.html          ← HTML principal
├── package.json        ← Dependencias
├── vite.config.js      ← Config Vite + PWA
├── public/
│   ├── icon-192.png    ← Icono app
│   └── icon-512.png    ← Icono splash
└── src/
    ├── main.jsx        ← Entry point React
    └── App.jsx         ← 💪 Toda la app (626 líneas)
```

## 🔧 Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## 📱 Características PWA

- ✅ Instalable como app nativa
- ✅ Funciona offline (Service Worker con Workbox)
- ✅ Auto-update al abrir
- ✅ Pantalla completa (sin barra de navegador)
- ✅ Splash screen con tema oscuro
- ✅ Orientación portrait

## 🏗️ Próximos pasos

1. **Dominio personalizado**: Vercel permite conectar `fitbro.app` o similar
2. **Backend**: Supabase (auth + base de datos PostgreSQL gratis)
3. **Integraciones reales**: Strava OAuth, Google Fit API
4. **Notificaciones push**: Con Firebase Cloud Messaging
5. **Sincronización**: Los datos se guardarán en la nube
