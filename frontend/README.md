# Descripción general del frontend

Mapa conciso del SPA `frontend/` (Vite + React). No es una referencia completa de la API.

## Stack

| Capa | Elección |
|--------|--------|
| Build / servidor de desarrollo | **Vite** 8 (`@vitejs/plugin-react`) |
| UI | **React** 19, **TypeScript** |
| Estilos | **Tailwind CSS** 4 (`@tailwindcss/vite`), **MUI** 9 (`@mui/material` + Emotion), iconos **Lucide** |
| Enrutado | **react-router-dom** 7 (`BrowserRouter`, `Routes`/`Route` declarativos) |
| HTTP | **Axios** (instancias compartidas; **qs** para serialización de arrays en query) |
| UX | **react-hot-toast** |

Punto de entrada: `src/main.tsx` envuelve la app en `BrowserRouter` → `AuthProvider` → `ThemeProvider` → `App`.

## Estructura de carpetas (esquemática)

```text
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.js, postcss.config.js
├── package.json
└── src/
    ├── main.tsx, App.tsx, index.css
    ├── features/          # pantallas + api/helpers locales
    │   ├── auth/
    │   ├── courses/
    │   ├── course_detail/
    │   ├── course_edit/
    │   ├── lesson/
    │   ├── dashboard/
    │   ├── admin_panel/
    │   └── settings/
    └── shared/
        ├── api/api.tsx    # clientes axios (api, apiAuth, apiArray)
        ├── components/    # layout, nav, guards, inputs, footer
        ├── context/       # ThemeContext, AuthModalContext
        ├── povider/       # AuthContext (nota: nombre de carpeta como en el repositorio)
        ├── hooks/
        ├── interfaces/, types/, constants/
```

Los módulos de *feature* suelen exponer un componente de página de nivel superior (p. ej. `Courses.tsx`) y colocar `api.ts` junto a él, donde viven las llamadas HTTP.

## Enrutado

`App.tsx` define todas las rutas. Los *guards* envuelven las páginas sensibles.

```mermaid
flowchart LR
  subgraph public["Público"]
    A["/courses"]
    B["/course/:courseId"]
  end
  subgraph auth_required["RequireAuth"]
    S["/settings"]
    L["/course/:id/lesson/:lessonId"]
  end
  subgraph staff["RequireStaff"]
    N["/course/new"]
    E["/course/:id/edit"]
    LN[".../edit/lesson/new"]
  end
  subgraph admin_only["RequireAdmin"]
    P["/admin"]
  end
```

| Ruta | Guard | Pantalla |
|------|--------|--------|
| `/` | — | redirección → `/courses` |
| `/courses` | — | catálogo de cursos + filtros |
| `/dashboard` | — | acceso invitado o panel según rol |
| `/settings` | RequireAuth | ajustes de usuario |
| `/admin` | RequireAdmin | panel de administración |
| `/course/new`, `/course/:id/edit`, `.../lesson/new` | RequireStaff | editor de curso / lección |
| `/course/:courseId` | — | detalle del curso |
| `/course/:courseId/lesson/:lessonId` | RequireAuth | reproductor de lección (vídeo, texto, quiz) |
| `*` | — | redirección → `/courses` |

`/profile` redirige a `/settings`.

## Estado y obtención de datos

- **Auth global**: `AuthProvider` (`shared/povider/AuthContext.tsx`) guarda `user`, `login` / `logout`, `isLoading`, `isAdmin`. Restaura `user` + JWT desde `localStorage` al cargar y establece `Authorization` en la instancia por defecto de Axios.
- **Tema / modales**: `ThemeContext`; `AuthModalContext` ofrece `openLogin` / `openRegister` para el overlay de auth desde el nav (el estado local de `App` elige Login vs Register; `Auth` renderiza el formulario).
- **Datos del servidor**: no hay React Query / Redux en `package.json`. Los *features* usan **funciones async** en `api.ts` por *feature* que llaman a `api`, `apiAuth` o `apiArray` desde `shared/api/api.tsx`. Las páginas/componentes usan **hooks de React** (`useState`, `useEffect`, etc.) para cargar y guardar respuestas. Existe `useDebounce` para la UX de búsqueda/filtros.

La URL base de Axios está configurada como `http://localhost:8000/` en `shared/api/api.tsx` (se espera el backend en ese host).

## Áreas de funcionalidad (alineadas con las rutas)

| Área | Rol / acceso | Propósito |
|------|----------------|---------|
| **Courses** | Público | Listar, buscar, ordenar y filtrar cursos |
| **Course detail** | Público | Metadatos, acciones de matriculación, valoraciones (la UI varía según el rol) |
| **Lesson** | Sesión iniciada | Consumir contenido de la lección (vídeo, texto, quiz) |
| **Course edit / new lesson** | Instructor / admin | Creación/edición tipo CRUD de cursos y lecciones |
| **Dashboard** | Invitado ve CTA; con sesión | paneles `student` / `instructor` / `admin` |
| **Admin panel** | Admin | administración de la plataforma |
| **Auth** | Modal | login / registro contra el backend |
| **Settings** | Sesión iniciada | perfil / preferencias |

## Scripts (`frontend/package.json`)

Ejecutar desde el directorio `frontend/`:

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm run build` | `tsc -b` y luego bundle de producción |
| `npm run preview` | Servir el build de producción en local |
| `npm run lint` | ESLint sobre el proyecto |
