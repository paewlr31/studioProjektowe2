# LLM Society Simulator — Dokumentacja

Symulacja społeczności agentów LLM badająca emergencję struktur społecznych, dynamikę opinii i podejmowanie decyzji w grupie.

---

## Spis treści

1. [Architektura systemu](#1-architektura-systemu)
2. [Model danych](#2-model-danych)
3. [System agentów](#3-system-agentów)
4. [Silnik symulacji](#4-silnik-symulacji)
5. [System opinii](#5-system-opinii)
6. [System energii](#6-system-energii)
7. [Eksperymenty](#7-eksperymenty)
8. [Metryki i analiza](#8-metryki-i-analiza)
9. [REST API](#9-rest-api)
10. [Protokół WebSocket](#10-protokół-websocket)
11. [Frontend](#11-frontend)
12. [Konfiguracja](#12-konfiguracja)
13. [Uruchomienie](#13-uruchomienie)
14. [Zmienne środowiskowe](#14-zmienne-środowiskowe)

---

## 1. Architektura systemu

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Dashboard │ │  Graph   │ │   Feed   │ │    Report     │  │
│  │   Page   │ │   Page   │ │   Page   │ │     Page      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       └──────────────┬──────────┘               │          │
│                      │                         │          │
│              ┌───────▼────────┐                │          │
│              │  Zustand Store │────────────────┘          │
│              │  (simStore)    │                           │
│              └───────┬────────┘                           │
│                      │ WebSocket + REST                   │
└──────────────────────┼────────────────────────────────────┘
                       │
┌──────────────────────┼────────────────────────────────────┐
│           Backend (Python / FastAPI)                      │
│  ┌───────────────────▼──────────────────────┐             │
│  │              main.py (API)                │            │
│  │  REST: /simulation/*, /agents/*, /feed    │            │
│  │  WS:   /ws  (real-time ticks)             │            │
│  └───────────────────┬──────────────────────┘             │
│                      │                                    │
│  ┌───────────────────▼──────────────────────┐             │
│  │         SimulationEngine                  │            │
│  │  - pętla ticków                           │            │
│  │  - zarządzanie agentami i feedem          │            │
│  │  - zdarzenia kontekstowe                  │            │
│  └───────┬───────────────────────┬──────────┘             │
│          │                       │                        │
│  ┌───────▼───────┐     ┌───────▼───────┐                 │
│  │    Agent       │     │   Analysis    │                 │
│  │  - LLM/Groq    │     │  - NetworkX   │                 │
│  │  - opinie      │     │  - metryki    │                 │
│  │  - energia     │     │  - opinie     │                 │
│  │  - pamięć      │     └───────────────┘                 │
│  └───────┬───────┘                                        │
│          │                                                 │
│  ┌───────▼───────┐                                        │
│  │    Factory    │                                        │
│  │  - tworzenie  │                                        │
│  │  agentów      │                                        │
│  └───────────────┘                                        │
└────────────────────────────────────────────────────────────┘
```

### Stack technologiczny

| Warstwa | Technologia |
|---------|------------|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| LLM | Groq API (llama-3.1-8b-instant) |
| Graf | NetworkX |
| Analiza | NumPy, SciPy |
| Frontend | React 18, Vite |
| State | Zustand |
| Wykresy | Recharts |
| Graf 3D | D3.js |
| Styl | Tailwind CSS |
| Komunikacja | REST + WebSocket |

---

## 2. Model danych

### 2.1 Enumeracje

```python
class AgentType(str, Enum):
    COOPERATIVE = "cooperative"   # pomocny, buduje relacje
    SELFISH = "selfish"           # skupiony na sobie
    TROLL = "troll"               # prowokujący, destrukcyjny
    NEUTRAL = "neutral"           # zrównoważony

class AgentGoal(str, Enum):
    MAXIMIZE_REPUTATION = "maximize_reputation"       # dąży do wysokiej reputacji
    MAXIMIZE_INTERACTIONS = "maximize_interactions"   # dąży do wielu interakcji
    MAINTAIN_GROUP_CONSENSUS = "maintain_group_consensus"  # dąży do harmonii

class MemoryMode(str, Enum):
    NONE = "none"    # brak pamięci
    SHORT = "short"  # ostatnie 5 interakcji
    FULL = "full"    # pełna pamięć + zaufanie

class ActionType(str, Enum):
    POST = "post"       # nowy post na forum
    COMMENT = "comment" # komentarz pod postem
    LIKE = "like"       # polubienie
    IGNORE = "ignore"   # brak akcji
```

### 2.2 Dataclasses

#### Topic
| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `id` | `str` | — | Identyfikator tematu (np. "budzet") |
| `name` | `str` | — | Nazwa tematu (np. "Budżet osiedla") |
| `description` | `str` | — | Opis tematu |
| `category` | `str` | `"neutral"` | Kategoria: `neutral`, `polarizing`, `local` |

#### Opinion
| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `topic_id` | `str` | — | Identyfikator tematu |
| `value` | `float` | `0.0` | Wartość opinii od `-1.0` (przeciw) do `+1.0` (za) |
| `confidence` | `float` | `0.5` | Pewność opinii od `0.0` do `1.0` |

#### FeedItem
| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `id` | `str` | — | Unikalne ID (8 znaków UUID) |
| `author_id` | `str` | — | ID autora |
| `content` | `str` | — | Treść posta/komentarza |
| `tick` | `int` | — | Tick utworzenia |
| `likes` | `int` | `0` | Liczba polubień |
| `comments` | `list` | `[]` | Lista ID komentarzy |
| `item_type` | `str` | `"post"` | `"post"` lub `"comment"` |
| `parent_id` | `Optional[str]` | `None` | ID rodzica (dla komentarzy) |
| `topic` | `Optional[str]` | `None` | ID tematu (jeśli dotyczy) |
| `stance` | `Optional[str]` | `None` | Stanowisko: `"for"`, `"against"`, `"neutral"` |

#### AgentAction
| Pole | Typ | Domyślnie | Opis |
|------|-----|-----------|------|
| `agent_id` | `str` | — | ID agenta wykonującego akcję |
| `action_type` | `ActionType` | — | Typ akcji |
| `content` | `Optional[str]` | `None` | Treść (dla POST/COMMENT) |
| `target_id` | `Optional[str]` | `None` | ID celu (dla COMMENT/LIKE) |
| `topic` | `Optional[str]` | `None` | ID tematu |
| `stance` | `Optional[str]` | `None` | Stanowisko |
| `tick` | `int` | `0` | Tick wykonania |

#### MemoryEntry
| Pole | Typ | Opis |
|------|-----|------|
| `tick` | `int` | Tick zdarzenia |
| `action` | `str` | Typ akcji |
| `target_agent` | `Optional[str]` | Agent docelowy |
| `content` | `str` | Treść |
| `outcome` | `str` | Rezultat: `"positive"`, `"negative"`, `"neutral"` |

---

## 3. System agentów

### 3.1 Klasa Agent

Plik: `backend/agents/agent.py`

Agent to autonomiczny byt sterowany promptem LLM (Groq) lub regułami (fallback).

#### Stan agenta

| Pole | Typ | Opis |
|------|-----|------|
| `id` | `str` | 8-znakowy UUID |
| `name` | `str` | Nazwa (z puli 48 imion) |
| `type` | `AgentType` | Typ osobowości |
| `goal` | `AgentGoal` | Cel agenta |
| `memory_mode` | `MemoryMode` | Tryb pamięci |
| `reputation` | `int` | Reputacja (0..n) |
| `energy` | `int` | Energia (0..max_energy) |
| `memory` | `list[MemoryEntry]` | Historia interakcji |
| `trust` | `dict[str, float]` | Poziom zaufania do innych agentów |
| `opinions` | `dict[str, Opinion]` | Opinie na tematy |
| `topics` | `list[Topic]` | Lista tematów |

#### Cykl decyzyjny agenta

```
1. Obserwacja: agent czyta ostatnie 10 itemów z feeda
2. Konteksty: pamięć, zaufanie, opinie, energia
3. Prompt: system + user z instrukcją JSON
4. LLM → JSON: {"action", "content", "target_id", "topic", "stance"}
5. Parsowanie: walidacja JSON, target_id, topic, stance
6. Fallback: jeśli LLM niedostępny → reguły (weighted random)
```

#### Prompt systemowy agenta

Składa się z sekcji:
- **World context**: opis forum sąsiedzkiego "Pine Valley"
- **Personality prompt**: zależny od `AgentType`
- **Goal instruction**: zależny od `AgentGoal`
- **Identity**: ID, nazwa, reputacja, tick
- **Memory context**: ostatnie 5 wpisów z pamięci
- **Trust context**: top 5 zaufanych agentów (tylko FULL memory)
- **Opinion context**: lista tematów z obecną postawą
- **Energy context**: poziom energii i koszty akcji

#### Osobowości agentów

| Typ | Prompt | Cechy |
|-----|--------|-------|
| **cooperative** | Pomocny członek społeczności | Wspiera innych, buduje sojusze |
| **selfish** | Samolubny, strategiczny | Działa tylko gdy mu się opłaca |
| **troll** | Prowokator | Lubi siać zamęt, sarkastyczny |
| **neutral** | Zrównoważony obserwator | Angażuje się gdy ciekawie |

#### Cele agentów

| Cel | Instrukcja | Zachowanie |
|-----|-----------|------------|
| `maximize_reputation` | Maksymalizuj reputację | Wysokiej jakości posty, angażuj wpływowych |
| `maximize_interactions` | Maksymalizuj interakcje | Komentuj często, lajkuj wszystko |
| `maintain_group_consensus` | Utrzymuj harmonię | Zgadzaj się, unikaj konfliktów |

#### Aktualizacja stanu (`update_state`)

Po każdej akcji:
- **Reputacja**: POST +1-3, COMMENT +0-2 (troll może stracić 0-2), LIKE +1 dla targetu
- **Zaufanie** (FULL memory): +1.0 za pozytywny, -0.5 za negatywny, +0.1 za neutralny outcome
- **Pamięć**: zapis MemoryEntry, przycinanie do limitu
- **Opinia**: wpływ społeczny (patrz sekcja 5)

### 3.2 Fabryka agentów

Plik: `backend/agents/factory.py`

```python
def create_agents(n, agent_types, goal, memory_mode, goal_distribution=None, topics=None)
```

- `agent_types`: dystrybucja typów np. `{"cooperative": 0.5, "selfish": 0.3, "neutral": 0.2}`
- `goal_distribution`: opcjonalna per-agent dystrybucja celów
- `topics`: lista tematów do inicjalizacji opinii

#### Predefiniowane presety

| Stała | Skład |
|-------|-------|
| `PRESET_COOPERATIVE` | 100% cooperative |
| `PRESET_MIXED` | 50% coop, 30% selfish, 20% neutral |
| `PRESET_WITH_TROLLS` | 40% coop, 30% selfish, 30% troll |
| `PRESET_SELFISH_DOMINANT` | 70% selfish, 20% coop, 10% neutral |

---

## 4. Silnik symulacji

Plik: `backend/simulation/engine.py`

### 4.1 SimulationState

Przechowuje cały stan symulacji w pamięci.

| Pole | Typ | Opis |
|------|-----|------|
| `tick` | `int` | Bieżący tick |
| `agents` | `list[Agent]` | Lista agentów |
| `feed` | `list[FeedItem]` | Kanał wiadomości (max FEED_SIZE) |
| `interaction_log` | `list[dict]` | Log interakcji (komu, od kogo, typ) |
| `metrics_history` | `list[dict]` | Historia metryk per tick |
| `graph_data` | `dict` | Dane grafu dla wizualizacji |
| `current_event` | `Optional[str]` | Aktualne zdarzenie kontekstowe |
| `events_log` | `list[dict]` | Historia zdarzeń |
| `tick_actions` | `list[dict]` | Akcje wykonane w bieżącym ticku |
| `topics` | `list[Topic]` | Lista tematów |
| `status` | `str` | `idle`, `running`, `paused`, `finished` |
| `config` | `dict` | Konfiguracja symulacji |

### 4.2 SimulationEngine

#### Przebieg pętli głównej (`run`)

```
1. Ustaw status na "running", broadcast
    
2. Dla każdego tick (1..max_ticks):
   a. Sprawdź pauzę/stop
   b. Określ zdarzenie kontekstowe (none/single/cyclic)
   c. Wymieszaj agentów (dla fairness)
   d. Wykonaj tury agentów równolegle (asyncio.gather):
      - Regeneracja energii
      - Decyzja LLM/fallback
      - Walidacja energii
      - Wykonanie akcji (POST/COMMENT/LIKE/IGNORE)
      - Wpływ społeczny na opinie
      - Update stanu (reputacja, pamięć, zaufanie)
   e. Zbuduj graf interakcji (NetworkX)
   f. Oblicz metryki: klastry, modularność, centralność, itd.
   g. Oblicz metryki opinii: polaryzacja, konsensus
   h. Broadcast tick do frontendu
   i. Uśpij (tick_delay)

3. Ustaw status na "finished", broadcast
```

#### Zdarzenia kontekstowe

| Tryb | Opis |
|------|------|
| `none` | Brak zdarzeń |
| `single` | Jedno zdarzenie w ticku `single_event_tick` |
| `cyclic` | Zdarzenia co `event_period` ticków |

Kategorie zdarzeń: `crisis` (kryzys), `positive` (pozytywne), `neutral` (neutralne).

#### Defaultowe tematy (gdy config nie podaje własnych)

| ID | Nazwa | Kategoria |
|----|-------|-----------|
| `budzet` | Budżet osiedla | polarizing |
| `zielone` | Zielone tereny | neutral |
| `bezpieczenstwo` | Bezpieczeństwo | neutral |
| `parkowanie` | Parkowanie | polarizing |
| `kultura` | Wydarzenia kulturalne | neutral |

---

## 5. System opinii

### 5.1 Inicjalizacja opinii

Przy tworzeniu agenta, każdy dostaje losową opinię na każdy temat z biasem zależnym od typu:

| Typ agenta | Wartość opinii | Pewność |
|-----------|----------------|---------|
| Cooperative | Umiarkowana (-0.3..0.3) | Średnia (0.3..0.6) |
| Selfish | Oportunistyczna (-0.5..0.5) | Niska (0.2..0.5) |
| Troll | Skrajna (-1.0..-0.6 lub 0.6..1.0) | Wysoka (0.6..0.9) |
| Neutral | Losowa (-0.4..0.4) | Średnia (0.3..0.6) |

### 5.2 Wyrażanie opinii przez LLM

Prompt zawiera sekcję:
```
Current topics and your stance:
- "Budżet osiedla": you are FOR (confidence 0.7)
- "Parkowanie": you are AGAINST (confidence 0.4)

With probability 70%, your post/comment MUST reference one of these topics.
```

Agent zwraca JSON z polami `topic` i `stance`:
```json
{"action": "post", "content": "...", "topic": "budzet", "stance": "for"}
```

Jeśli LLM nie poda topicu/stance, system próbuje:
1. Sprawdzić czy `topic` istnieje w liście tematów
2. Wykryć wzmiankę o temacie w treści (`_detect_topic_from_content`)
3. Wywnioskować stance z obecnej opinii agenta (`_infer_stance`)

### 5.3 Wpływ społeczny (`apply_opinion_influence`)

Po każdej interakcji (COMMENT/LIKE) następuje obustronny wpływ:

```
commenter.opinion[topic] += influence_rate * strength * (target_stance_value - commenter.opinion) * commenter.confidence
target.opinion[topic] += influence_rate * strength * (commenter_stance_value - target.opinion) * target.confidence
```

- `influence_rate`: 0.15 (konfigurowalne)
- `strength`: 1.0 dla COMMENT, 0.4 dla LIKE, 0.3 dla POST (self-reinforcement)
- `stance_value`: +1.0 dla "for", -1.0 dla "against", 0.0 dla "neutral"

Po wpływie:
- **Zgodność** (ten sam znak): confidence += 0.03
- **Niezgodność** (przeciwny znak): confidence -= 0.01

### 5.4 Metryki opinii

Obliczane per tick przez `compute_opinion_metrics()`:

| Metryka | Opis | Wzór |
|---------|------|------|
| `polarization` | Średnie odchylenie standardowe po wszystkich tematach | `mean(std(values_per_topic))` |
| `consensus` | % agentów w przedziale ±0.3 od średniej | `mean(count(|v - mean| <= 0.3) / n)` |
| `extreme_ratio` | % agentów ze skrajnymi opiniami (|v| > 0.7) | `mean(count(|v| > 0.7) / n)` |
| `per_topic` | Statystyki per temat: średnia, std, kategoria | — |

---

## 6. System energii

### 6.1 Koszty akcji

| Akcja | Koszt bazowy | Cooperative | Selfish | Troll |
|-------|-------------|-------------|---------|-------|
| POST | 35 | 35 | **30** | 35 |
| COMMENT | 15 | **10** | 15 | **10** |
| LIKE | 5 | **0** | 5 | 5 |
| IGNORE | 0 | 0 | 0 | 0 |

### 6.2 Regeneracja

Każdy agent regeneruje 25 energii na tick (do max 100).

### 6.3 Przebieg z energią

```
1. agent.regenerate_energy()   → energy = min(100, energy + 25)
2. agent.decide_action()       → LLM wybiera akcję (świadomy kosztów)
3. Walidacja: if energy < cost → force IGNORE
4. agent.deduct_energy()       → energy -= cost
```

### 6.4 Wpływ na symulację

- Posty są kosztowne (35) → agenci robią je rzadziej
- LIKE jest tani (5) → naturalnie rośnie liczba lajków
- Cooperative częściej komentują (tańsze o 5)
- Troll częściej komentują (tańsze o 5)
- Selfish częściej postują (tańsze o 5)

---

## 7. Eksperymenty

Plik: `backend/simulation/experiments.py`

17 predefiniowanych konfiguracji w 6 grupach badawczych.

### Exp 1 — Typy agentów

Bada wpływ składu społeczności na emergencję struktur.

| ID | Skład | Opis |
|----|-------|------|
| `exp1_cooperative` | 100% cooperative | Baza — społeczeństwo idealne |
| `exp1_mixed` | 50% coop, 30% selfish, 20% neutral | Społeczeństwo mieszane |
| `exp1_trolls` | 40% coop, 30% selfish, 30% troll | Destabilizacja przez trolli |

### Exp 2 — Zdarzenia kontekstowe

Bada wpływ kryzysów na spójność społeczną.

| ID | Tryb | Opis |
|----|------|------|
| `exp2_no_events` | none | Bez zdarzeń — baseline |
| `exp2_single_event` | single (tick 7) | Pojedynczy kryzys |
| `exp2_cyclic_events` | cyclic (co 4) | Cykliczne kryzysy |

### Exp 3 — Pamięć

Bada rolę pamięci w stabilności relacji.

| ID | Memory | Opis |
|----|--------|------|
| `exp3_no_memory` | none | Tabula rasa każdej rundy |
| `exp3_short_memory` | short (5) | Tylko ostatnie interakcje |
| `exp3_full_memory` | full (20) | Pełna pamięć + model zaufania |

### Exp 4 — Cele agentów

Bada wpływ motywacji na strukturę przywództwa.

| ID | Goal | Opis |
|----|------|------|
| `exp4_reputation` | maximize_reputation | Wszyscy dążą do reputacji |
| `exp4_interactions` | maximize_interactions | Wszyscy dążą do interakcji |
| `exp4_consensus` | maintain_group_consensus | Wszyscy dążą do harmonii |

### Exp 5 — Liczba agentów

Bada wpływ skali na emergentne struktury.

| ID | n_agents | Opis |
|----|----------|------|
| `exp5_small` | 10 | Mała społeczność |
| `exp5_medium` | 20 | Średnia społeczność |
| `exp5_large` | 40 | Duża społeczność |

### Exp 6 — Dynamika opinii

Bada ewolucję opinii w społeczności.

| ID | Tematy | Opis |
|----|--------|------|
| `exp6_binary` | 2 polarizing | Czy grupa się spolaryzuje? |
| `exp6_complex` | 5 (2 polarizing + 3 neutral) | Złożona dynamika |
| `exp6_polarization` | 3 polarizing | Szybkie echo chambers |

---

## 8. Metryki i analiza

### 8.1 Metryki grafu (`backend/analysis/graph.py`)

| Metryka | Opis |
|---------|------|
| `n_nodes` | Liczba aktywnych agentów w grafie |
| `n_edges` | Liczba skierowanych interakcji |
| `n_clusters` | Liczba społeczności (greedy modularity) |
| `modularity` | Siła struktury społecznościowej (0..1) |
| `avg_clustering` | Średni współczynnik grupowania |
| `density` | Gęstość grafu |
| `avg_path_length` | Średnia najkrótsza ścieżka |
| `leaders` | Top 5 agentów według betweenness centrality |
| `degree_centrality` | Centralność stopnia per agent |
| `betweenness_centrality` | Centralność pośrednictwa per agent |
| `communities` | Lista agentów w każdej społeczności |
| `reputation` | Statystyki reputacji (mean, max, min, std, distribution) |
| `interactions_per_agent` | Out-degree per agent |
| `interactions_this_tick` | Liczba nie-IGNORE akcji w ticku |
| `graph_stability` | Podobieństwo do poprzedniego ticka (0..1) |
| `activity_entropy` | Entropia Shannona rozkładu aktywności |

### 8.2 Metryki opinii (`backend/analysis/opinions.py`)

| Metryka | Opis |
|---------|------|
| `polarization` | Średnie std dev opinii po tematach (0..1) |
| `consensus` | % agentów blisko średniej (±0.3) |
| `extreme_ratio` | % agentów ze skrajnymi opiniami (|v| > 0.7) |
| `per_topic` | Dla każdego tematu: mean, std, category |
| `agent_opinions` | Mapa agent → {topic → {value, confidence}} |

---

## 9. REST API

Bazowy URL: `http://localhost:8000`

### Endpointy

| Metoda | Endpoint | Opis |
|--------|----------|------|
| `GET` | `/` | Health check |
| `GET` | `/experiments` | Lista wszystkich eksperymentów |
| `POST` | `/simulation/configure` | Konfiguracja symulacji (bez startu) |
| `POST` | `/simulation/start` | Start symulacji (opcjonalnie z configiem) |
| `POST` | `/simulation/experiment` | Uruchom predefiniowany eksperyment |
| `POST` | `/simulation/pause` | Pauza symulacji |
| `POST` | `/simulation/resume` | Wznowienie symulacji |
| `POST` | `/simulation/stop` | Zatrzymanie symulacji |
| `GET` | `/simulation/state` | Pełny stan symulacji |
| `GET` | `/simulation/metrics` | Historia metryk i zdarzeń |
| `GET` | `/simulation/export` | Eksport pełnych wyników (JSON) |
| `GET` | `/agents` | Lista agentów |
| `GET` | `/feed` | Ostatnie 30 itemów z feeda |

### SimulationConfig

```json
{
  "n_agents": 20,
  "agent_types": {"cooperative": 0.5, "selfish": 0.3, "neutral": 0.2},
  "goal": "maximize_reputation",
  "memory_mode": "full",
  "event_mode": "none",
  "single_event_tick": 5,
  "event_period": 5,
  "event_category": "crisis",
  "max_ticks": 15,
  "tick_delay": 0.5,
  "goal_distribution": null,
  "topics": null,
  "influence_rate": null
}
```

### ExperimentRequest

```json
{
  "experiment_id": "exp1_cooperative",
  "tick_delay": 0.8
}
```

### Eksport (GET /simulation/export)

```json
{
  "config": { ... },
  "agents": [ ... ],
  "metrics_history": [ ... ],
  "events_log": [ ... ],
  "interaction_log": [ ... ],
  "total_ticks": 15
}
```

---

## 10. Protokół WebSocket

Endpoint: `ws://localhost:8000/ws`

### Wiadomości klient → serwer

| Typ | Częstotliwość | Payload |
|-----|--------------|---------|
| `ping` | Co 20s | `{"action": "ping"}` |

### Wiadomości serwer → klient

#### `connected` (na połączeniu)
```json
{
  "type": "connected",
  "data": { "tick", "status", "config", "agents", "feed", 
            "metrics_history", "graph", "events_log", "topics" }
}
```

#### `status` (na starcie)
```json
{
  "type": "status",
  "data": { "status": "running", "max_ticks": 15 }
}
```

#### `tick` (każdy tick — główna aktualizacja)
```json
{
  "type": "tick",
  "data": {
    "tick": 1,
    "metrics": { "tick", "n_nodes", "n_edges", "n_clusters", 
                 "modularity", "avg_clustering", "density", 
                 "leaders", "reputation", "interactions_this_tick",
                 "graph_stability", "activity_entropy",
                 "opinion": { "polarization", "consensus", "extreme_ratio", 
                              "per_topic", "agent_opinions" } },
    "graph": { "nodes": [...], "edges": [...] },
    "agents": [ { "id", "name", "type", "goal", "reputation", 
                  "energy", "trust", "memory_size", "opinions" } ],
    "feed": [ { "id", "author_id", "content", "tick", "likes", 
                "comments", "type", "parent_id", "topic", "stance" } ],
    "actions": [ { "agent_id", "agent_name", "agent_type", "action", 
                   "content", "target_id" } ],
    "event": null,
    "topics": [ { "id", "name", "description", "category" } ]
  }
}
```

#### `event` (przy zdarzeniu kontekstowym)
```json
{
  "type": "event",
  "data": { "tick": 7, "event": "BREAKING: Major system outage..." }
}
```

#### `finished` (po zakończeniu)
```json
{
  "type": "finished",
  "data": { "total_ticks": 15, "final_metrics": { ... } }
}
```

#### `heartbeat` / `pong` (keepalive)
Serwer wysyła `heartbeat` co 30s braku aktywności klienta. Klient wysyła `ping` co 20s, serwer odpowiada `pong`.

---

## 11. Frontend

### 11.1 Struktura stron

| Strona | Ścieżka | Opis |
|--------|---------|------|
| Dashboard | `/` | Główny widok: metryki, wykresy, liderzy, lista agentów |
| Experiments | `/experiments` | Lista eksperymentów do wyboru |
| Graph | `/graph` | Wizualizacja grafu interakcji (D3 force-directed) |
| Feed | `/feed` | Kanał postów i komentarzy |
| Report | `/report` | Podsumowanie po zakończonej symulacji |

### 11.2 Komponenty

| Komponent | Plik | Opis |
|-----------|------|------|
| `Card` | `ui/index.jsx` | Kontener z ramką i cieniem |
| `MetricCard` | `ui/index.jsx` | Karta metryki z wartością i trendem |
| `Badge` | `ui/index.jsx` | Kolorowany badge |
| `Button` | `ui/index.jsx` | Przycisk (primary/danger/ghost/success) |
| `AgentTypeDot` | `ui/index.jsx` | Kolorowana kropka typu agenta |
| `SimControls` | `ui/SimControls.jsx` | Panel sterowania symulacją |
| `ForceGraph` | `graph/ForceGraph.jsx` | Graf D3 z zoomem, dragiem i tooltipami |
| `FeedStream` | `feed/FeedStream.jsx` | Strumień postów z badge'ami tematów |
| `ActionLog` | `feed/FeedStream.jsx` | Log akcji w ticku |
| `AgentList` | `agents/AgentList.jsx` | Lista agentów z paskiem energii |
| `AgentDetail` | `agents/AgentList.jsx` | Szczegóły agenta (po kliknięciu) |
| `MetricsLineChart` | `metrics/Charts.jsx` | Wykres liniowy (AreaChart) |
| `MultiLineChart` | `metrics/Charts.jsx` | Multi-wykres liniowy |
| `ReputationBar` | `metrics/Charts.jsx` | Wykres słupkowy reputacji |
| `OpinionOverTimeChart` | `metrics/Charts.jsx` | Wykres ewolucji opinii |
| `ActivityChart` | `metrics/Charts.jsx` | Wykres aktywności (słupkowy) |
| `ExperimentModal` | `pages/ExperimentModal.jsx` | Modal wyboru eksperymentu |

### 11.3 State management (Zustand)

Store: `stores/simStore.js`

Główne stany:
- `status`: `idle | running | paused | finished`
- `tick`, `maxTicks`: postęp symulacji
- `agents`, `feed`: dane agentów i kanału
- `metrics`, `metricsHistory`: metryki
- `graphData`: dane grafu dla D3
- `topics`, `opinionsHistory`: system opinii
- `eventsLog`: zdarzenia kontekstowe

### 11.4 Kolory agentów (spójne w całym UI)

| Typ | Hex | Zastosowanie |
|-----|-----|-------------|
| cooperative | `#22d3ee` | Cyan |
| selfish | `#f59e0b` | Amber |
| troll | `#ef4444` | Red |
| neutral | `#6b7280` | Gray |

---

## 12. Konfiguracja

### 12.1 Plik `.env` (backend)

```
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-8b-instant
MAX_AGENTS=50
FEED_SIZE=30
MEMORY_SIZE=20
```

### 12.2 `Settings` (config.py)

| Parametr | Domyślnie | Opis |
|----------|-----------|------|
| `groq_api_key` | `""` | Klucz API Groq |
| `groq_model` | `"llama-3.1-8b-instant"` | Model LLM |
| `max_agents` | `50` | Maksymalna liczba agentów |
| `feed_size` | `30` | Rozmiar feeda (ilość itemów) |
| `memory_size` | `20` | Rozmiar pamięci agenta (FULL) |
| `influence_rate` | `0.15` | Szybkość zmiany opinii |
| `topic_expression_ratio` | `0.7` | Prawdopodobieństwo użycia tematu w poście |
| `max_energy` | `100` | Maksymalna energia agenta |
| `energy_regen` | `25` | Regeneracja energii na tick |
| `post_energy_cost` | `35` | Koszt energii za POST |
| `comment_energy_cost` | `15` | Koszt energii za COMMENT |
| `like_energy_cost` | `5` | Koszt energii za LIKE |
| `ignore_energy_cost` | `0` | Koszt energii za IGNORE |

### 12.3 Konfiguracja przez API

`SimulationConfig` pozwala nadpisać dowolne parametry przy starcie symulacji. Wszystkie parametry mają domyślne wartości.

---

## 13. Uruchomienie

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edytuj .env → wpisz GROQ_API_KEY
uvicorn api.main:app --reload --port 8000
```

API dostępne na: `http://localhost:8000`
Dokumentacja API: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dostępny na: `http://localhost:5173`

### Tryb bez klucza Groq

Jeśli `GROQ_API_KEY` nie jest ustawiony, agenci działają w trybie fallback — wybierają akcje losowo według wag:
- POST: 30%
- COMMENT: 30%
- LIKE: 25%
- IGNORE: 15%

Symulacja działa, ale bez autentycznych zachowań LLM.

---

## 14. Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `GROQ_API_KEY` | `""` | Klucz API Groq (wymagany do LLM) |
| `GROQ_MODEL` | `"llama-3.1-8b-instant"` | Model LLM |
| `MAX_AGENTS` | `50` | Maksymalna liczba agentów |
| `FEED_SIZE` | `30` | Rozmiar feeda |
| `MEMORY_SIZE` | `20` | Rozmiar pamięci |
