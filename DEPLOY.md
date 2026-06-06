# 🏆 Quiniela Mundial 2026 — Guía de Deploy

## Stack
- **Frontend**: React + Vite → Netlify
- **Backend/BD**: Supabase (Auth + Postgres + Realtime)
- **API resultados**: football-data.org (gratis)
- **Funciones serverless**: Netlify Functions (sync automático cada 2 min)

---

## PASO 1 — Configurar Supabase

1. Ve a tu proyecto en **app.supabase.com**
2. SQL Editor → pega y ejecuta todo el contenido de `supabase/schema.sql`
3. Ve a **Authentication → Settings**:
   - Site URL: `https://tu-app.netlify.app`
   - Redirect URLs: `https://tu-app.netlify.app/**`
4. Guarda las claves en **Settings → API**:
   - `URL` del proyecto
   - `anon public` key
   - `service_role` key (solo para funciones serverless)

---

## PASO 2 — Crear cuenta en Netlify

1. Ve a **netlify.com** y regístrate (gratis)
2. "Add new site" → "Import an existing project"
3. Conecta tu repositorio de GitHub (o sube la carpeta manualmente)

---

## PASO 3 — Subir el proyecto a GitHub

```bash
# En la carpeta quiniela2026/
git init
git add .
git commit -m "Initial commit — Quiniela Mundial 2026"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/quiniela2026.git
git push -u origin main
```

---

## PASO 4 — Configurar Netlify

### En Netlify → Site Settings → Environment Variables, agrega:

| Variable | Valor | Dónde la encuentras |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Settings → API → anon public |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Igual que arriba |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Supabase → Settings → API → service_role |
| `FOOTBALL_API_KEY` | `abc123...` | football-data.org → tu perfil |

### Build settings (se leen del netlify.toml automáticamente):
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

---

## PASO 5 — API de resultados (football-data.org)

1. Regístrate en **football-data.org/client/register** (gratis)
2. Obtén tu API key
3. **Antes del Mundial** (junio 2026):
   - Consulta `https://api.football-data.org/v4/competitions/WC/matches?season=2026`
   - Copia los IDs de cada partido y llena el mapa en `netlify/functions/sync-results.js`:
   ```js
   const API_MATCH_MAP = {
     12345: 'A1',  // México vs Sudáfrica
     12346: 'A2',  // Rep. de Corea vs Rep. Checa
     // ... los 104 partidos
   }
   ```
4. Configura el cron en Netlify:
   - En `netlify.toml` agrega al final:
   ```toml
   [functions."sync-results"]
     schedule = "*/2 * * * *"  # cada 2 minutos
   ```

---

## PASO 6 — Primer usuario Admin

1. Regístrate en la app con tu email
2. En Supabase → Table Editor → profiles
3. Busca tu usuario y cambia `is_admin` a `true`

---

## PASO 7 — Acceso múltiple de quinielas

El sistema permite:
- ✅ **Registro libre**: cualquier persona puede registrarse
- ✅ **Múltiples quinielas por usuario**: sin límite
- ✅ **Cierre automático**: 11 Jun 2026 a las 18:00 UTC (antes del 1er partido)
- ✅ **Respaldo**: cada usuario puede descargar su quiniela en JSON
- ✅ **Tabla en vivo**: se actualiza en tiempo real via Supabase Realtime

---

## Arquitectura de datos

```
auth.users (Supabase Auth)
  ↓ 1:1
profiles (username, is_admin)
  ↓ 1:N
quinielas (name, is_locked)
  ↓ 1:N
picks (match_id, goals_home, goals_away, winner)

match_results (resultados reales — API + Admin)
  → scores (puntos calculados por quiniela — cache)
```

---

## Flujo de actualización de puntos

```
Cada 2 min: Netlify Function
  → football-data.org API
  → match_results (Supabase)
  → Supabase Realtime notifica frontend
  → Netlify Function recalcula scores de quinielas afectadas
  → scores (Supabase)
  → Supabase Realtime actualiza leaderboard en todos los navegadores
```

---

## Costos estimados (todos gratuitos hasta 100+ usuarios)

| Servicio | Plan | Límite gratis |
|---|---|---|
| Supabase | Free | 50K filas, 500MB, 2GB transferencia/mes |
| Netlify | Free | 100GB bandwidth, 125K func invocaciones/mes |
| football-data.org | Free | 10 req/min (suficiente para sync cada 2 min) |

Con 100 usuarios × 104 picks = 10,400 filas en picks → muy por debajo del límite.

---

## URL final

Tu quiniela estará disponible en:
`https://quiniela-mundial-2026.netlify.app`

(puedes personalizar el nombre en Netlify → Site Settings → Site name)
