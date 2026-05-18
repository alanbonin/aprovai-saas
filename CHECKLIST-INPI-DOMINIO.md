# Checklist — Registro de Marca INPI + Domínio

## 1. Domínio aprovai.app
- [ ] Verificar disponibilidade em https://get.app/
- [ ] Registrar em registrador confiável (Google Domains, Namecheap, Registro.br para .app)
- [ ] Configurar DNS apontando para Vercel (nameservers ou CNAME vercel-dns)
- [ ] Habilitar HTTPS automático na Vercel após domínio vinculado

## 2. Domínio aprovai.com.br (alternativa nacional)
- [ ] Registrar em https://registro.br (único registrador oficial)
- [ ] Custo: ~R$40/ano
- [ ] CNPJ necessário para registro em nome de empresa

## 3. Registro de Marca no INPI
- [ ] Acesse https://www.gov.br/inpi/pt-br
- [ ] Crie conta no e-INPI (portal de serviços)
- [ ] Busca de anterioridade: pesquise "APROVAI" e "APROVAI360" na base do INPI
  URL: https://busca.inpi.gov.br/pePI/servlet/MareasServlet?Action=Detail
- [ ] Classe NCL recomendada: **Classe 41** (Educação, instrução, serviços de entretenimento)
- [ ] Tipo de marca: **Mista** (nome + logo) — protege ambos
- [ ] Taxa de depósito: R$355 (MPE) ou R$710 (demais) por classe
- [ ] Prazo médio de análise: 18-24 meses
- [ ] Contrate um agente de propriedade intelectual para agilizar

## 4. Vercel — Configuração do Domínio Customizado
- [ ] Acesse o dashboard da Vercel
- [ ] Settings → Domains → Add Domain
- [ ] Digite aprovai.app (ou aprovai.com.br)
- [ ] Siga as instruções de verificação DNS
- [ ] Aguardar propagação (até 48h)

## 5. Cloudflare (opcional mas recomendado)
- [ ] Crie conta em https://cloudflare.com
- [ ] Adicione o domínio e troque os nameservers
- [ ] Ative: Always Use HTTPS, Auto Minify, Brotli
- [ ] Configure Page Rules para cache de assets estáticos
- [ ] WAF gratuito incluído no plano Free

## 6. Variáveis de Ambiente na Vercel
Adicione todas as variáveis do .env.example no painel da Vercel:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] DATABASE_URL + DIRECT_URL
- [ ] ANTHROPIC_API_KEY
- [ ] MERCADOPAGO_ACCESS_TOKEN
- [ ] MERCADOPAGO_WEBHOOK_SECRET
- [ ] RESEND_API_KEY + EMAIL_FROM
- [ ] CRON_SECRET
- [ ] NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT
- [ ] UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
- [ ] NEXT_PUBLIC_APP_URL=https://aprovai.app
- [ ] Opcional: SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN

## 7. Pós-deploy — Verificações
- [ ] Acessar https://aprovai.app e verificar SSL
- [ ] Testar login, cadastro e pagamento em produção
- [ ] Configurar URL de webhook do MercadoPago para https://aprovai.app/api/pagamento/webhook
- [ ] Verificar cron jobs ativos no painel da Vercel (Settings → Cron Jobs)
- [ ] Testar envio de email via Resend
- [ ] Configurar domínio verificado no Resend para noreply@aprovai.app
