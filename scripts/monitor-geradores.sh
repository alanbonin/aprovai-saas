#!/bin/bash
# monitor-geradores.sh
# Mantém os scripts de geração rodando — reinicia automaticamente se pararem

cd "$(dirname "$0")/.." || exit 1

FLASH_LOG=/tmp/flashcards-output.log
MAT_LOG=/tmp/mat2.log
FLASH_PID_FILE=/tmp/flashcards-gerar.pid
MAT_PID_FILE=/tmp/materiais-gerar.pid

log() { echo "[$(date '+%H:%M:%S')] $*"; }

start_flash() {
  node --env-file=.env scripts/gerar-flashcards-massa.mjs >> "$FLASH_LOG" 2>&1 &
  echo $! > "$FLASH_PID_FILE"
  log "🃏 Flashcards iniciado (PID $!)"
}

start_mat() {
  node --env-file=.env scripts/gerar-materiais-massa.mjs >> "$MAT_LOG" 2>&1 &
  echo $! > "$MAT_PID_FILE"
  log "📄 Materiais iniciado (PID $!)"
}

is_running() {
  local pid_file=$1
  [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

# Mata processos anteriores se existirem
for f in "$FLASH_PID_FILE" "$MAT_PID_FILE"; do
  if [ -f "$f" ]; then
    kill "$(cat "$f")" 2>/dev/null
    rm -f "$f"
  fi
done

log "🚀 Monitor iniciado — verifica a cada 30s"
start_flash
sleep 3
start_mat

while true; do
  sleep 30

  if ! is_running "$FLASH_PID_FILE"; then
    # Verifica se já terminou (todos os tópicos prontos)
    PENDENTES=$(python3 -c "
import json
try:
  p = json.load(open('scripts/.gerar-flashcards-progress.json'))
  done = len(p.get('done',{})); errors = len(p.get('errors',{}))
  print(1000-done-errors)
except: print(999)
" 2>/dev/null)
    if [ "$PENDENTES" -le 0 ] 2>/dev/null; then
      log "🎉 Flashcards concluídos!"
    else
      log "⚠️  Flashcards parou ($PENDENTES pendentes) — reiniciando..."
      start_flash
    fi
  fi

  if ! is_running "$MAT_PID_FILE"; then
    PENDENTES_MAT=$(python3 -c "
import json
try:
  p = json.load(open('scripts/.gerar-materiais-progress.json'))
  done = len(p.get('done',{}))
  print(max(0, 800 - done))
except: print(999)
" 2>/dev/null)
    if [ "$PENDENTES_MAT" -le 0 ] 2>/dev/null; then
      log "🎉 Materiais concluídos!"
    else
      log "⚠️  Materiais parou ($PENDENTES_MAT pendentes) — reiniciando..."
      start_mat
    fi
  fi

  # Status a cada 5 minutos
  SECS=$(date +%s)
  if [ $((SECS % 300)) -lt 30 ]; then
    FLASH_DONE=$(python3 -c "import json; p=json.load(open('scripts/.gerar-flashcards-progress.json')); print(len(p.get('done',{})))" 2>/dev/null)
    MAT_DONE=$(python3 -c "import json; p=json.load(open('scripts/.gerar-materiais-progress.json')); print(len(p.get('done',{})))" 2>/dev/null)
    log "📊 Flashcards: ${FLASH_DONE} sets | PDFs: ${MAT_DONE} tópicos"
  fi
done
