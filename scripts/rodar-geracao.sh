#!/bin/bash
# Roda a geração de questões em background independente do Claude Code
# Uso: ./scripts/rodar-geracao.sh [args do gerar-questoes-massa]
# Exemplo: ./scripts/rodar-geracao.sh --subject agro --target 200

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/geracao-$(date +%Y%m%d-%H%M%S).log"
PID_FILE="$PROJECT_DIR/.geracao.pid"

cd "$PROJECT_DIR"

echo "🚀 Iniciando geração em background..."
echo "📄 Log: $LOG_FILE"
echo "   Acompanhe com: tail -f $LOG_FILE"
echo ""

nohup node --env-file=.env scripts/gerar-questoes-massa.mjs "$@" >> "$LOG_FILE" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"

echo "✅ Rodando com PID $PID"
echo "   Para parar: kill $PID  (ou: kill \$(cat .geracao.pid))"
