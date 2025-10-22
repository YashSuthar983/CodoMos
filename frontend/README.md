# CogniWork Frontend

Light-themed React (Vite) + Chakra UI frontend for CogniWork.

## Run

1. Ensure backend is running at http://127.0.0.1:8000 (see backend/README.md)
2. Install deps:

```bash
npm install --prefix frontend
```

3. Copy env (optional):

```bash
cp frontend/.env.example frontend/.env
```

4. Start dev server:

```bash
npm run dev --prefix frontend
```

Open http://127.0.0.1:5173

## Pages
- /login and /signup
- / (Dashboard)
- /candidates
- /roles
- /projects (Repos + Projects)
- /forms (list)
- /forms/:id/edit (builder)
- /forms/:id/responses
- /public/forms/:id (public form view)

Uses a light color scheme via Chakra UI theme in `src/theme.js`.
