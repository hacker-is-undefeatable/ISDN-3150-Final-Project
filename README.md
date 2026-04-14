# AI-Powered 3D Escape Room

Complete full-stack web app with:
- React + Vite frontend
- React Three Fiber 3D room
- FastAPI backend
- HKUST Azure API puzzle generation (with local fallback)

## Project Structure

frontend/
- App logic and 3D scene
- components/Room.jsx
- components/Door.jsx
- components/Safe.jsx
- components/UI.jsx

backend/
- FastAPI service
- main.py
- routes: /generate_puzzle, /check_answer

## Frontend Setup

1. Open terminal in `frontend`.
2. Install dependencies:

```bash
npm install
```

3. Create env file:

```bash
copy .env.example .env
```

4. Run frontend:

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Backend Setup

1. Open terminal in `backend`.
2. Create and activate virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create env file:

```bash
copy .env.example .env
```

5. Fill in HKUST Azure values in `.env`:
- `HKUST_AZURE_OPENAI_ENDPOINT`
- `HKUST_AZURE_OPENAI_API_KEY`
- `HKUST_AZURE_OPENAI_DEPLOYMENT`
- `HKUST_AZURE_OPENAI_API_VERSION`

6. Run API:

```bash
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`.

## API Endpoints

### POST `/generate_puzzle`
Request:

```json
{
	"object_type": "door"
}
```

Response:

```json
{
	"question": "...",
	"answer": "...",
	"hint": "..."
}
```

For hint button support:

```json
{
	"object_type": "door",
	"hint_only": true
}
```

### POST `/check_answer`
Request:

```json
{
	"object_type": "door",
	"answer": "open"
}
```

Response includes `correct`, `message`, and game `state`.

## Gameplay

1. Click objects in the 3D room (painting, safe, door).
2. Puzzle panel opens and loads puzzle from backend.
3. Submit answer.
4. Use hint button to fetch hint.
5. Solve required puzzles to unlock safe and door.
6. Win message appears: `You Escaped!`

## Notes

- Object hover highlight is enabled.
- Door opening animation is enabled after unlocking.
- If Azure credentials are missing/unavailable, backend uses local fallback puzzles.

