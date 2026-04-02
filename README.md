# LLM Society Simulator

Symulacja społeczności agentów LLM — emergencja struktur społecznych i dynamika decyzji.

## Stack technologiczny

- **Backend**: Python 3.11+ / FastAPI / WebSockets
- **LLM**: Groq API (llama-3.1-8b-instant)
- **Graf**: NetworkX
- **Frontend**: React 18 / Vite / Zustand / Recharts
- **Styl**: Tailwind CSS

## Struktura projektu

```
llm-society/
├── backend/
│   ├── agents/          # Klasy agentów
│   ├── simulation/      # Silnik symulacji
│   ├── analysis/        # Analiza grafów i metryk
│   └── api/             # FastAPI endpoints + WebSocket
├── frontend/
│   └── src/
│       ├── components/  # Komponenty React
│       ├── pages/       # Strony (Dashboard, Experiments, Reports)
│       ├── stores/      # Zustand state management
│       └── hooks/       # Custom hooks
└── docs/
```

## Szybki start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Wpisz klucz Groq API do .env
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dostępny na: http://localhost:5173
API docs: http://localhost:8000/docs

## Eksperymenty

1. **Exp 1** – Wpływ typu agentów (cooperative / selfish / troll)
2. **Exp 2** – Wpływ zdarzeń kontekstowych (brak / pojedyncze / cykliczne)
3. **Exp 3** – Wpływ pamięci agenta (brak / krótka / pełna)
4. **Exp 4** – Wpływ celu agenta (reputacja / interakcje / zgodność)
5. **Exp 5** – Wpływ liczby agentów (10 / 20 / 50)

## Klucz Groq API

Zarejestruj się na https://console.groq.com i utwórz klucz API.
Ustaw w backend/.env:
```
GROQ_API_KEY=your_key_here
```
