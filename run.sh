#!/usr/bin/env bash
# ==============================================================================
#  🌊 Crescent City Municipal Intelligence — Interactive Run Menu
#  run.sh — top-level entry point for ALL project features
#
#  Usage:
#    ./run.sh          Interactive menu
#    ./run.sh gui      Launch web viewer directly
#    ./run.sh test     Run test suite directly
#    ./run.sh setup    Run full setup check
#  ==============================================================================
set -euo pipefail

# ─── Colors & Formatting ──────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
BG_BLUE='\033[44m'
BG_DARK='\033[40m'

# ─── Project Root ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Helpers ──────────────────────────────────────────────────────────────────
hr() { printf '%*s\n' "${COLUMNS:-80}" '' | tr ' ' '─'; }
bold() { echo -e "${BOLD}$*${RESET}"; }
info() { echo -e "${CYAN}  ℹ  ${RESET}$*"; }
ok()   { echo -e "${GREEN}  ✓  ${RESET}$*"; }
warn() { echo -e "${YELLOW}  ⚠  ${RESET}$*"; }
err()  { echo -e "${RED}  ✗  ${RESET}$*"; }
step() { echo -e "\n${BOLD}${BLUE}▶ $*${RESET}"; }

# ─── Banner ───────────────────────────────────────────────────────────────────
print_banner() {
  clear
  echo -e "${BOLD}${CYAN}"
  cat << 'EOF'
  ╔══════════════════════════════════════════════════════════════════╗
  ║   🌊  Crescent City Municipal Intelligence   v1.3.0             ║
  ║   Scrape · Verify · Export · View · Chat · Monitor · Alert      ║
  ╠══════════════════════════════════════════════════════════════════╣
  ║   City of Crescent City, CA  |  41.76°N 124.20°W               ║
  ║   Del Norte County  |  242 Articles  |  2,194 Code Sections     ║
  ╚══════════════════════════════════════════════════════════════════╝
EOF
  echo -e "${RESET}"
}

# ─── Prerequisite Check ───────────────────────────────────────────────────────
check_prereqs() {
  step "Checking prerequisites..."
  local missing=0

  if command -v bun &>/dev/null; then
    ok "Bun $(bun --version)"
  else
    err "Bun not found — install from https://bun.sh"
    missing=1
  fi

  if [ -f "node_modules/.package-lock.json" ] || [ -d "node_modules/playwright" ]; then
    ok "npm/bun packages installed"
  else
    warn "Packages not installed — run option [1] Setup first"
  fi

  if command -v ollama &>/dev/null; then
    ok "Ollama found ($(ollama --version 2>/dev/null || echo 'version unknown'))"
  else
    warn "Ollama not found — LLM/RAG features unavailable (optional)"
  fi

  if python3 -c "import chromadb" &>/dev/null 2>&1; then
    ok "ChromaDB Python package found"
  else
    warn "ChromaDB not found — RAG features unavailable (optional)"
  fi

  if [ -f "output/manifest.json" ]; then
    local section_count
    section_count=$(python3 -c "import json; m=json.load(open('output/manifest.json')); print(m.get('sectionCount',0))" 2>/dev/null || echo "?")
    ok "Scraped data found (${section_count} sections)"
  else
    warn "No scraped data yet — run option [3] Scrape first"
  fi

  if [ $missing -eq 1 ]; then
    echo ""
    err "Critical prerequisites missing. Please install Bun first."
    exit 1
  fi
  echo ""
}

# ─── Setup ────────────────────────────────────────────────────────────────────
run_setup() {
  step "Installing dependencies..."
  bun install
  ok "Dependencies installed"

  step "Installing Playwright browser (Chromium)..."
  bun x playwright install chromium --with-deps 2>/dev/null || bun x playwright install chromium
  ok "Playwright Chromium ready"

  echo ""
  ok "Setup complete! You can now run the scraper (option 3) or launch the GUI (option 6)."
}

# ─── Tests ────────────────────────────────────────────────────────────────────
run_tests() {
  step "Running test suite (235 tests · 21 files · zero-mock policy)..."
  echo ""
  if bun test tests/; then
    echo ""
    ok "All tests passed!"
  else
    echo ""
    err "Some tests failed. See output above."
    return 1
  fi
}

# ─── Full Pipeline ────────────────────────────────────────────────────────────
run_pipeline() {
  step "Full pipeline: Scrape → Verify → Export"
  warn "This requires a browser and internet connection."
  warn "Scraping 242 articles takes ~15-20 minutes. Resume supported."
  echo ""
  read -rp "  Continue? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || return 0

  step "Step 1/3: Scraping..."
  bun run scrape

  step "Step 2/3: Verifying..."
  bun run verify

  step "Step 3/3: Exporting..."
  bun run export

  echo ""
  ok "Pipeline complete! Output saved to output/"
}

# ─── GUI Launcher ─────────────────────────────────────────────────────────────
run_gui() {
  step "Launching web viewer on http://localhost:${PORT:-3000}..."

  if ! command -v bun &>/dev/null; then
    err "Bun not found."; return 1
  fi

  # Check if already running
  if lsof -ti:"${PORT:-3000}" &>/dev/null 2>&1; then
    warn "Port ${PORT:-3000} already in use — opening existing server..."
  else
    info "Starting GUI server (Ctrl+C to stop)..."
    # Launch in background so we can open browser
    bun run src/gui/server.ts &
    GUI_PID=$!
    sleep 1

    if ! kill -0 "$GUI_PID" 2>/dev/null; then
      err "Server failed to start. Check output above."
      return 1
    fi
    ok "Server started (PID $GUI_PID)"
  fi

  # Open browser
  local url="http://localhost:${PORT:-3000}"
  info "Opening $url in default browser..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$url"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$url"
  fi

  echo ""
  echo -e "  ${BOLD}GUI Features available at ${CYAN}$url${RESET}:"
  echo -e "  ${DIM}┌─ 📋 TOC Viewer  (collapsible 17-title tree)"
  echo -e "  ├─ 🔍 BM25 Search  (Porter-stemmed, paginated, highlighted)"
  echo -e "  ├─ 💬 RAG Chat  (GET/POST, Ollama + ChromaDB)"
  echo -e "  ├─ 📊 Analytics  (PCA, K-Means, word loadings)"
  echo -e "  ├─ 📈 Readability  (Flesch-Kincaid all 2,194 sections)"
  echo -e "  ├─ 🧭 6 Domains  (cross-referenced code sections)"
  echo -e "  ├─ 🌊 Tides  (NOAA CO-OPS station 9419750)"
  echo -e "  └─ 📡 Monitor Status  (latest change + alert report)${RESET}"
  echo ""

  if [[ -n "${GUI_PID:-}" ]]; then
    echo -e "  ${DIM}Press Ctrl+C to stop the server${RESET}"
    wait "$GUI_PID" 2>/dev/null || true
  fi
}

# ─── Monitoring ───────────────────────────────────────────────────────────────
run_monitor_menu() {
  print_banner
  echo -e "${BOLD}  📡 Monitoring & Alerts${RESET}\n"
  echo -e "  ${BOLD}[1]${RESET}  🔍 Code change detection"
  echo -e "  ${BOLD}[2]${RESET}  📰 News RSS (4 sources — Times-Standard, Lost Coast, Humboldt, KIEM-TV)"
  echo -e "  ${BOLD}[3]${RESET}  🏛️  Government meetings (City Council, Planning, Harbor Commission)"
  echo -e "  ${BOLD}[4]${RESET}  🌊 NOAA tides (station 9419750 — 48h predictions)"
  echo -e "  ${BOLD}[5]${RESET}  🦀 CDFW crab season + marine bulletins"
  echo -e "  ${BOLD}[6]${RESET}  🌊 NOAA tsunami CAP alerts"
  echo -e "  ${BOLD}[7]${RESET}  🌍 USGS earthquake (M4.0+, 200 km, Cascadia)"
  echo -e "  ${BOLD}[8]${RESET}  ⛈️  NWS coastal weather (Del Norte CAZ006)"
  echo -e "  ${BOLD}[9]${RESET}  🚨 All alerts concurrently"
  echo -e "  ${BOLD}[w]${RESET}  📅 Weekly health check (full report)"
  echo -e "  ${BOLD}[b]${RESET}  ← Back\n"
  read -rp "  Choice: " choice
  case "$choice" in
    1) bun run monitor ;;
    2) bun run news ;;
    3) bun run gov-meetings ;;
    4) bun run alerts:tides ;;
    5) bun run alerts:fishing ;;
    6) bun run alerts:tsunami ;;
    7) bun run alerts:earthquake ;;
    8) bun run alerts:weather ;;
    9) bun run alerts ;;
    w|W) bun run weekly-check ;;
    b|B) return ;;
    *) warn "Invalid choice" ;;
  esac
}

# ─── Analytics ────────────────────────────────────────────────────────────────
run_analytics_menu() {
  print_banner
  echo -e "${BOLD}  📊 Analytics & Reporting${RESET}\n"
  echo -e "  ${BOLD}[1]${RESET}  📈 Flesch-Kincaid readability scoring (all 2,194 sections)"
  echo -e "  ${BOLD}[2]${RESET}  🧭 Domain coverage metrics (6 domains)"
  echo -e "  ${BOLD}[3]${RESET}  📋 Open output/readability.json"
  echo -e "  ${BOLD}[4]${RESET}  📋 Open output/domain-coverage.json"
  echo -e "  ${BOLD}[5]${RESET}  📋 Open output/rag-queries.jsonl (last 20 queries)"
  echo -e "  ${BOLD}[b]${RESET}  ← Back\n"
  read -rp "  Choice: " choice
  case "$choice" in
    1)
      step "Running readability scoring..."
      bun run readability
      ;;
    2)
      step "Running domain coverage analysis..."
      bun run coverage
      ;;
    3)
      if [ -f "output/readability.json" ]; then
        python3 -c "
import json
data = json.load(open('output/readability.json'))
print(f\"Average Grade Level: {data.get('averageGradeLevel', 'N/A')}\")
print(f\"Sections scored: {data.get('scored', 0)}/{data.get('totalSections', 0)}\")
print()
print('Top 5 HARDEST sections:')
for s in data.get('hardestSections', [])[:5]:
    print(f\"  § {s['number']} — Grade {s['score']['gradeLevel']} ({s['score']['difficulty']})\")
print()
print('Top 5 EASIEST sections:')
for s in data.get('easiestSections', [])[:5]:
    print(f\"  § {s['number']} — Grade {s['score']['gradeLevel']} ({s['score']['difficulty']})\")
"
      else
        warn "No readability.json found — run option [1] first"
      fi
      ;;
    4)
      if [ -f "output/domain-coverage.json" ]; then
        python3 -c "
import json
data = json.load(open('output/domain-coverage.json'))
print(f\"Overall coverage: {data.get('overallCoveragePct','?')}% of {data.get('totalSections','?')} sections\")
print()
for d in data.get('domains', []):
    print(f\"  {d['domainName']}: {d['referencedCount']} sections ({d['coveragePct']}%)\")
"
      else
        warn "No domain-coverage.json found — run option [2] first"
      fi
      ;;
    5)
      if [ -f "output/rag-queries.jsonl" ]; then
        echo ""
        bold "Last 20 RAG queries:"
        tail -20 output/rag-queries.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        q = json.loads(line.strip())
        ts = q.get('timestamp','')[:16]
        print(f\"  [{ts}] {q.get('question','?')[:80]}... ({q.get('latencyMs','?')}ms)\")
    except: pass
"
      else
        warn "No rag-queries.jsonl found — RAG chat hasn't been used yet"
      fi
      ;;
    b|B) return ;;
    *) warn "Invalid choice" ;;
  esac
}

# ─── LLM / RAG Menu ───────────────────────────────────────────────────────────
run_llm_menu() {
  print_banner
  echo -e "${BOLD}  💬 LLM / RAG Chat${RESET}\n"

  # Check status
  local ollama_status chromadb_status
  if command -v ollama &>/dev/null && ollama list &>/dev/null 2>&1; then
    ollama_status="${GREEN}✓ running${RESET}"
  else
    ollama_status="${RED}✗ not running${RESET}"
  fi
  echo -e "  Ollama: $ollama_status"
  echo ""
  echo -e "  ${BOLD}[1]${RESET}  📦 Index all sections into ChromaDB"
  echo -e "  ${BOLD}[2]${RESET}  💬 Interactive RAG chat session"
  echo -e "  ${BOLD}[3]${RESET}  🔍 Single RAG query"
  echo -e "  ${BOLD}[4]${RESET}  📊 Show Ollama/ChromaDB/index status"
  echo -e "  ${BOLD}[5]${RESET}  🤖 Pull required models (nomic-embed-text, gemma3:4b)"
  echo -e "  ${BOLD}[6]${RESET}  🚀 Start Ollama server (background)"
  echo -e "  ${BOLD}[b]${RESET}  ← Back\n"
  read -rp "  Choice: " choice
  case "$choice" in
    1)
      step "Indexing sections into ChromaDB..."
      bun run index
      ;;
    2)
      step "Starting RAG chat session..."
      bun run chat
      ;;
    3)
      read -rp "  Enter query: " query
      bun run query "$query"
      ;;
    4)
      bun run status
      ;;
    5)
      step "Pulling Ollama models..."
      ollama pull nomic-embed-text
      ollama pull gemma3:4b
      ok "Models downloaded"
      ;;
    6)
      step "Starting Ollama server in background..."
      ollama serve &>/tmp/ollama.log &
      sleep 1
      ok "Ollama started (logs: /tmp/ollama.log)"
      ;;
    b|B) return ;;
    *) warn "Invalid choice" ;;
  esac
}

# ─── Status Dashboard ─────────────────────────────────────────────────────────
show_status() {
  step "System Status"

  # Scraped data
  if [ -f "output/manifest.json" ]; then
    local articles sections completed
    articles=$(python3 -c "import json; m=json.load(open('output/manifest.json')); print(len(m.get('articles',{})))" 2>/dev/null || echo "?")
    sections=$(python3 -c "import json; m=json.load(open('output/manifest.json')); print(m.get('sectionCount',0))" 2>/dev/null || echo "?")
    completed=$(python3 -c "import json; m=json.load(open('output/manifest.json')); print(m.get('completedAt','unknown')[:10])" 2>/dev/null || echo "?")
    ok "Scraped data: ${articles} articles, ${sections} sections (${completed})"
  else
    warn "No scraped data (run option 3)"
  fi

  # Verification
  if [ -f "output/verification-report.json" ]; then
    local v_status
    v_status=$(python3 -c "import json; v=json.load(open('output/verification-report.json')); print(v.get('overallStatus','?'))" 2>/dev/null || echo "?")
    ok "Verification: $v_status"
  else
    warn "No verification report"
  fi

  # Exports
  local exports=0
  [ -f "output/crescent-city-code.json" ] && exports=$((exports+1))
  [ -f "output/crescent-city-code.txt" ] && exports=$((exports+1))
  [ -f "output/section-index.csv" ] && exports=$((exports+1))
  [ -d "output/markdown" ] && exports=$((exports+1))
  ok "Exports: ${exports}/4 formats ready"

  # Analytics
  [ -f "output/readability.json" ] && ok "Readability scores: computed" || warn "Readability: not computed"
  [ -f "output/domain-coverage.json" ] && ok "Domain coverage: computed" || warn "Domain coverage: not computed"

  # Monitor
  if [ -f "output/monitor-history.jsonl" ]; then
    local last_check
    last_check=$(tail -1 output/monitor-history.jsonl | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('timestamp','?')[:10])" 2>/dev/null || echo "?")
    ok "Last monitor check: $last_check"
  else
    warn "No monitor history"
  fi

  # News
  if [ -f "output/news/seen-ids.json" ]; then
    local news_count
    news_count=$(python3 -c "import json; print(len(json.load(open('output/news/seen-ids.json'))))" 2>/dev/null || echo "?")
    ok "News dedup: ${news_count} seen items"
  fi

  # Tests
  echo ""
  info "Run option [T] to run the full test suite (235 tests)"
}

# ─── Quick Open API Endpoints ─────────────────────────────────────────────────
test_api() {
  local port="${PORT:-3000}"
  local base="http://localhost:$port"

  step "Testing API endpoints at $base"
  echo ""

  if ! curl -sf "$base/api/health" &>/dev/null; then
    err "Server not running at $base — start GUI first (option 6)"
    return 1
  fi

  local endpoints=(
    "api/health|Health check"
    "api/stats|Scrape statistics"
    "api/toc|Table of contents"
    "api/search?q=tsunami&limit=3|BM25 search (tsunami)"
    "api/search?q=parking&type=section&limit=3|Search with typeFilter"
    "api/sections?title=17&limit=5|Hierarchical sections (Title 17)"
    "api/domains|All 6 intelligence domains"
    "api/domain/emergency-management|Domain detail"
    "api/domains/coverage|Domain coverage %"
    "api/readability|Flesch-Kincaid scores"
    "api/monitor/status|Monitor status"
    "api/monitor/alerts|Alert aggregation"
  )

  local pass=0 fail=0
  for entry in "${endpoints[@]}"; do
    local endpoint="${entry%%|*}"
    local label="${entry##*|}"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$base/$endpoint")
    if [[ "$status" == "200" ]]; then
      ok "$label ($endpoint) → HTTP $status"
      pass=$((pass+1))
    else
      warn "$label ($endpoint) → HTTP $status"
      fail=$((fail+1))
    fi
  done

  echo ""
  if [ $fail -eq 0 ]; then
    ok "All $pass API endpoints responding"
  else
    warn "$pass passed · $fail warnings (some endpoints need scraped data)"
  fi
}

# ─── Main Menu ────────────────────────────────────────────────────────────────
main_menu() {
  print_banner
  echo -e "  ${BOLD}SETUP & DATA PIPELINE${RESET}"
  echo -e "  ${BOLD}[1]${RESET}  🔧 Setup (install dependencies + Playwright)"
  echo -e "  ${BOLD}[2]${RESET}  🧪 Run test suite (235 tests · zero-mock)"
  echo -e "  ${BOLD}[3]${RESET}  🕷️  Scrape municipal code (242 articles, resumable)"
  echo -e "  ${BOLD}[4]${RESET}  ✅ Verify data integrity (SHA-256 + TOC cross-ref)"
  echo -e "  ${BOLD}[5]${RESET}  📦 Export (JSON · Markdown · TXT · CSV)"
  echo ""
  echo -e "  ${BOLD}WEB INTERFACE${RESET}"
  echo -e "  ${BOLD}[6]${RESET}  🖥️  Launch web viewer → ${CYAN}http://localhost:3000${RESET}"
  echo -e "  ${BOLD}[7]${RESET}  🔌 Test API endpoints (requires running GUI)"
  echo ""
  echo -e "  ${BOLD}AI / RAG${RESET}"
  echo -e "  ${BOLD}[8]${RESET}  💬 LLM / RAG menu (index · chat · query · status)"
  echo ""
  echo -e "  ${BOLD}MONITORING & INTELLIGENCE${RESET}"
  echo -e "  ${BOLD}[9]${RESET}  📡 Monitoring & alerts menu"
  echo -e "  ${BOLD}[A]${RESET}  📊 Analytics & readability menu"
  echo -e "  ${BOLD}[S]${RESET}  📋 Show system status"
  echo ""
  echo -e "  ${BOLD}FULL PIPELINE${RESET}"
  echo -e "  ${BOLD}[P]${RESET}  🚀 Run full pipeline (setup → test → scrape → verify → export → GUI)"
  echo ""
  echo -e "  ${BOLD}[Q]${RESET}  🚪 Quit"
  echo ""
  hr
  read -rp "  Enter choice: " choice
}

# ─── Full Auto Pipeline ────────────────────────────────────────────────────────
run_full_pipeline() {
  print_banner
  bold "  🚀 Full Pipeline: Setup → Test → Scrape → Verify → Export → GUI"
  echo ""
  warn "This will:"
  echo "  1. Install dependencies"
  echo "  2. Run 235 tests"
  echo "  3. Scrape 242 articles from ecode360.com (~15-20 min)"
  echo "  4. Verify data integrity"
  echo "  5. Export to JSON/Markdown/TXT/CSV"
  echo "  6. Launch web viewer"
  echo ""
  read -rp "  Proceed? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || return 0

  step "1/6 Installing dependencies..."
  bun install

  step "2/6 Running tests..."
  bun test tests/

  step "3/6 Scraping..."
  bun run scrape

  step "4/6 Verifying..."
  bun run verify

  step "5/6 Exporting..."
  bun run export

  step "6/6 Launching web viewer..."
  run_gui
}

# ─── CLI mode (non-interactive) ───────────────────────────────────────────────
if [[ "${1:-}" == "gui" ]]; then run_gui; exit 0; fi
if [[ "${1:-}" == "test" ]]; then run_tests; exit 0; fi
if [[ "${1:-}" == "setup" ]]; then check_prereqs; run_setup; exit 0; fi
if [[ "${1:-}" == "status" ]]; then check_prereqs; show_status; exit 0; fi
if [[ "${1:-}" == "api-test" ]]; then test_api; exit 0; fi

# ─── Interactive Loop ─────────────────────────────────────────────────────────
trap 'echo -e "\n${RESET}Goodbye! 🌊"; exit 0' INT TERM

while true; do
  main_menu
  echo ""
  case "$choice" in
    1) check_prereqs; run_setup ;;
    2) run_tests ;;
    3)
      warn "Scraping requires internet and Chromium browser."
      bun run scrape
      ;;
    4) bun run verify ;;
    5) bun run export ;;
    6) run_gui; break ;;
    7) test_api ;;
    8) run_llm_menu ;;
    9) run_monitor_menu ;;
    a|A) run_analytics_menu ;;
    s|S) show_status ;;
    p|P) run_full_pipeline; break ;;
    q|Q) echo -e "\n${CYAN}🌊 Goodbye!${RESET}"; exit 0 ;;
    *) warn "Invalid choice '${choice}'" ;;
  esac
  echo ""
  read -rp "  Press Enter to return to menu..." _
done
