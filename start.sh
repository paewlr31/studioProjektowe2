#!/usr/bin/env bash
# ============================================================
#  LLM Society Simulator — Startup Script
# ============================================================
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo ""
echo "  ⬡  LLM Society Simulator"
echo "  ──────────────────────────────────────"
echo ""

# ── 1. Check .env ────────────────────────────────────────────
if [ ! -f "$BACKEND/.env" ]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "  ⚠  Utworzono backend/.env — wpisz klucz GROQ_API_KEY!"
  echo "     https://console.groq.com → API Keys → Create Key"
  echo ""
fi

KEY=$(grep GROQ_API_KEY "$BACKEND/.env" | cut -d= -f2)
if [ -z "$KEY" ] || [ "$KEY" = "your_groq_api_key_here" ]; then
  echo "  ❌  GROQ_API_KEY nie jest ustawiony w backend/.env"
  echo "     Edytuj plik i dodaj klucz, potem uruchom skrypt ponownie."
  echo ""
  exit 1
fi

echo "  ✓  Groq API key found"

# ── 2. Backend ───────────────────────────────────────────────
echo "  → Instalowanie zależności Pythona..."
cd "$BACKEND"
pip install -r requirements.txt -q

echo "  → Uruchamianie backendu (port 8000)..."
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  ✓  Backend PID: $BACKEND_PID"

# ── 3. Frontend ──────────────────────────────────────────────
echo "  → Instalowanie zależności Node.js..."
cd "$FRONTEND"
npm install --silent

echo "  → Uruchamianie frontendu (port 5173)..."
npm run dev &
FRONTEND_PID=$!
echo "  ✓  Frontend PID: $FRONTEND_PID"

echo ""
echo "  ✓  Wszystko gotowe!"
echo ""
echo "  Dashboard: http://localhost:5173"
echo "  API docs:  http://localhost:8000/docs"
echo ""
echo "  Ctrl+C aby zatrzymać oba procesy"
echo ""

# ── 4. Cleanup on exit ───────────────────────────────────────
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
