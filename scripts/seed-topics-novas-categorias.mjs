/**
 * seed-topics-novas-categorias.mjs
 * Cria tópicos para as 86 matérias das 8 novas categorias.
 *
 * Uso: node --env-file=.env scripts/seed-topics-novas-categorias.mjs
 */
import { createClient } from "@supabase/supabase-js";
try { const { config } = await import("dotenv"); config({ path: ".env.local" }); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// slug → array de tópicos
const TOPICS_BY_SUBJECT = {

  // ══════════════════════════════════════════════════════════════════
  // BANCOS PÚBLICOS
  // ══════════════════════════════════════════════════════════════════
  "lingua-portuguesa-bancos": [
    { name: "Interpretação e Compreensão de Texto", ordem: 1 },
    { name: "Ortografia e Acentuação", ordem: 2 },
    { name: "Morfologia: Classes de Palavras", ordem: 3 },
    { name: "Sintaxe: Termos da Oração", ordem: 4 },
    { name: "Coesão e Coerência Textual", ordem: 5 },
    { name: "Concordância Nominal e Verbal", ordem: 6 },
    { name: "Regência Nominal e Verbal", ordem: 7 },
    { name: "Pontuação", ordem: 8 },
    { name: "Redação: Correspondência Bancária", ordem: 9 },
  ],

  "raciocinio-logico-e-quantitativo": [
    { name: "Lógica Proposicional e Conectivos", ordem: 1 },
    { name: "Tabela-Verdade e Equivalências", ordem: 2 },
    { name: "Silogismos e Inferências", ordem: 3 },
    { name: "Raciocínio Sequencial e Padrões", ordem: 4 },
    { name: "Análise Combinatória e Probabilidade", ordem: 5 },
    { name: "Estatística Descritiva (Média, Mediana, Moda)", ordem: 6 },
    { name: "Porcentagem e Variação Percentual", ordem: 7 },
    { name: "Razão, Proporção e Regra de Três", ordem: 8 },
    { name: "Diagramas Lógicos e Conjuntos", ordem: 9 },
  ],

  "matematica-financeira-bancos": [
    { name: "Juros Simples", ordem: 1 },
    { name: "Juros Compostos", ordem: 2 },
    { name: "Desconto Simples e Composto", ordem: 3 },
    { name: "Séries de Pagamento (Anuidades)", ordem: 4 },
    { name: "Sistemas de Amortização (SAC, SAF, SAM, Americano)", ordem: 5 },
    { name: "Taxa Equivalente, Nominal e Efetiva", ordem: 6 },
    { name: "VPL, TIR e Análise de Investimentos", ordem: 7 },
    { name: "Rendas Perpétuas e Capitalização", ordem: 8 },
  ],

  "conhecimentos-bancarios-e-sfn": [
    { name: "Sistema Financeiro Nacional (SFN) — Estrutura", ordem: 1 },
    { name: "Conselho Monetário Nacional (CMN)", ordem: 2 },
    { name: "Banco Central do Brasil (BACEN)", ordem: 3 },
    { name: "Bancos Comerciais, Múltiplos e Cooperativas", ordem: 4 },
    { name: "Produtos e Serviços Bancários (conta, cartão, crédito)", ordem: 5 },
    { name: "Operações de Crédito e Garantias", ordem: 6 },
    { name: "Sistema de Pagamentos Brasileiro (SPB) e Pix", ordem: 7 },
    { name: "Open Banking e Open Finance", ordem: 8 },
    { name: "Câmbio e Operações Internacionais", ordem: 9 },
    { name: "Regulação Prudencial e Basileia", ordem: 10 },
  ],

  "mercado-de-capitais-e-investimentos": [
    { name: "Mercado de Capitais — Visão Geral e CVM", ordem: 1 },
    { name: "Ações e Bolsa de Valores (B3)", ordem: 2 },
    { name: "Fundos de Investimento (Renda Fixa, Ações, Multimercado)", ordem: 3 },
    { name: "Títulos Públicos e Tesouro Direto", ordem: 4 },
    { name: "CDB, LCA, LCI, LH e COE", ordem: 5 },
    { name: "Debêntures e Notas Promissórias", ordem: 6 },
    { name: "Previdência Privada (PGBL, VGBL)", ordem: 7 },
    { name: "Derivativos: Opções, Futuros e Swaps", ordem: 8 },
    { name: "Análise Fundamentalista e Técnica", ordem: 9 },
  ],

  "legislacao-bancaria-e-compliance": [
    { name: "Sigilo Bancário (LC 105/2001)", ordem: 1 },
    { name: "Prevenção à Lavagem de Dinheiro (Lei 9.613/98)", ordem: 2 },
    { name: "COAF e Comunicações de Operações Suspeitas", ordem: 3 },
    { name: "KYC (Conheça seu Cliente) e Due Diligence", ordem: 4 },
    { name: "LGPD no Setor Bancário", ordem: 5 },
    { name: "Resolução BCB: normas prudenciais e condutuais", ordem: 6 },
    { name: "Compliance Bancário e Gestão de Riscos", ordem: 7 },
    { name: "Prevenção a Fraudes e Crimes Digitais", ordem: 8 },
    { name: "Código de Defesa do Consumidor bancário", ordem: 9 },
  ],

  "atendimento-e-tecnicas-de-vendas": [
    { name: "Atendimento ao Cliente e Qualidade", ordem: 1 },
    { name: "Comunicação e Relacionamento Interpessoal", ordem: 2 },
    { name: "Técnicas de Vendas e Negociação", ordem: 3 },
    { name: "Cross-selling e Up-selling de Produtos Bancários", ordem: 4 },
    { name: "SAC, Ouvidoria e Tratamento de Reclamações", ordem: 5 },
    { name: "Segmentação de Clientes (Varejo, Private, Corporate)", ordem: 6 },
    { name: "Marketing Bancário e Fidelização", ordem: 7 },
  ],

  "nocoes-de-informatica-bancos": [
    { name: "Segurança Digital Bancária e Golpes Digitais", ordem: 1 },
    { name: "Internet Banking e Mobile Banking", ordem: 2 },
    { name: "Conceitos de Redes e Internet", ordem: 3 },
    { name: "Pacote Office (Word, Excel, Outlook)", ordem: 4 },
    { name: "Sistema Operacional Windows — básico", ordem: 5 },
    { name: "Proteção de Dados e Privacidade Digital", ordem: 6 },
  ],

  "atualidades-do-mercado-financeiro": [
    { name: "Fintechs e Bancos Digitais", ordem: 1 },
    { name: "Drex (Real Digital / CBDC)", ordem: 2 },
    { name: "Criptoativos e Regulação", ordem: 3 },
    { name: "ESG e Finanças Sustentáveis", ordem: 4 },
    { name: "Open Finance e BaaS (Banking as a Service)", ordem: 5 },
    { name: "Tendências em Crédito e Scoring", ordem: 6 },
    { name: "Regulação Recente: Resoluções BCB e CMN", ordem: 7 },
  ],

  // ══════════════════════════════════════════════════════════════════
  // PETROBRAS / ESTATAIS
  // ══════════════════════════════════════════════════════════════════
  "lingua-portuguesa-estatais": [
    { name: "Interpretação e Compreensão de Texto", ordem: 1 },
    { name: "Gramática: Morfologia e Sintaxe", ordem: 2 },
    { name: "Ortografia e Acentuação", ordem: 3 },
    { name: "Coesão, Coerência e Tipologia Textual", ordem: 4 },
    { name: "Redação: Relatórios e Comunicação Empresarial", ordem: 5 },
  ],

  "ingles-tecnico": [
    { name: "Leitura e Interpretação de Textos Técnicos", ordem: 1 },
    { name: "Vocabulário Técnico em Inglês (energia, engenharia, TI)", ordem: 2 },
    { name: "Gramática Essencial: Tempos Verbais e Voz Passiva", ordem: 3 },
    { name: "Textos Científicos e Artigos Acadêmicos", ordem: 4 },
    { name: "Textos Jurídicos e Corporativos em Inglês", ordem: 5 },
  ],

  "raciocinio-logico-estatais": [
    { name: "Lógica Proposicional", ordem: 1 },
    { name: "Inferências e Silogismos", ordem: 2 },
    { name: "Sequências e Padrões", ordem: 3 },
    { name: "Análise Combinatória e Probabilidade", ordem: 4 },
    { name: "Estatística Aplicada", ordem: 5 },
  ],

  "lei-das-estatais-lei-13-303-2016": [
    { name: "Conceito e Âmbito de Aplicação (Lei 13.303/2016)", ordem: 1 },
    { name: "Governança Corporativa nas Estatais", ordem: 2 },
    { name: "Conselho de Administração e Fiscal", ordem: 3 },
    { name: "Licitações e Contratos das Estatais", ordem: 4 },
    { name: "Programa de Integridade (Compliance)", ordem: 5 },
    { name: "Responsabilização de Dirigentes", ordem: 6 },
  ],

  "etica-e-compliance-corporativo": [
    { name: "Código de Ética e Conduta Empresarial", ordem: 1 },
    { name: "Lei Anticorrupção (Lei 12.846/2013)", ordem: 2 },
    { name: "Conflito de Interesses e Impedimentos", ordem: 3 },
    { name: "Canal de Denúncias e Whistleblowing", ordem: 4 },
    { name: "Due Diligence e Gestão de Terceiros", ordem: 5 },
    { name: "Compliance no Setor de Energia", ordem: 6 },
  ],

  "conhecimentos-de-petroleo-e-gas": [
    { name: "Geologia do Petróleo e Exploração", ordem: 1 },
    { name: "Perfuração e Completação de Poços", ordem: 2 },
    { name: "Produção e Processamento de Petróleo e Gás", ordem: 3 },
    { name: "Refino e Derivados do Petróleo", ordem: 4 },
    { name: "Distribuição e Logística de Combustíveis", ordem: 5 },
    { name: "Pré-Sal: Tecnologia e Regulação", ordem: 6 },
    { name: "Biocombustíveis (Etanol, Biodiesel, SAF)", ordem: 7 },
    { name: "ANP e Regulação do Setor Petrolífero", ordem: 8 },
  ],

  "engenharia-de-petroleo-especifico": [
    { name: "Engenharia de Reservatórios", ordem: 1 },
    { name: "Fluidos de Perfuração", ordem: 2 },
    { name: "Cimentação e Revestimento", ordem: 3 },
    { name: "Completação e Estimulação de Poços", ordem: 4 },
    { name: "Produção Offshore e Onshore", ordem: 5 },
    { name: "Escoamento e Transporte por Dutos", ordem: 6 },
    { name: "Termodinâmica Aplicada ao Petróleo", ordem: 7 },
  ],

  "administracao-e-gestao-empresarial": [
    { name: "Planejamento Estratégico e BSC", ordem: 1 },
    { name: "Gestão por Processos e BPM", ordem: 2 },
    { name: "Estruturas Organizacionais", ordem: 3 },
    { name: "Gestão de Contratos e Fornecedores", ordem: 4 },
    { name: "Governança Corporativa (CVM, IBGC)", ordem: 5 },
    { name: "Gestão da Inovação e Transformação Digital", ordem: 6 },
  ],

  "contabilidade-e-financas-estatais": [
    { name: "Contabilidade Societária e Lei das S.A.", ordem: 1 },
    { name: "IFRS e CPCs", ordem: 2 },
    { name: "Demonstrações Contábeis e Análise", ordem: 3 },
    { name: "Orçamento Empresarial e Controlling", ordem: 4 },
    { name: "Gestão de Custos Industriais", ordem: 5 },
    { name: "Finanças Corporativas: Valuation e Capital", ordem: 6 },
  ],

  "seguranca-saude-e-meio-ambiente-hse": [
    { name: "Gestão de Saúde e Segurança no Trabalho", ordem: 1 },
    { name: "Normas Regulamentadoras aplicáveis (NR-10, NR-13, NR-33)", ordem: 2 },
    { name: "OHSAS 18001 e ISO 45001", ordem: 3 },
    { name: "Gestão Ambiental: ISO 14001", ordem: 4 },
    { name: "Análise de Risco e HAZOP", ordem: 5 },
    { name: "Gestão de Emergências e Plano de Ação", ordem: 6 },
    { name: "Sustentabilidade e ESG no Setor Energético", ordem: 7 },
  ],

  "ti-para-estatais": [
    { name: "Segurança da Informação e LGPD", ordem: 1 },
    { name: "Governança de TI: COBIT e ITIL", ordem: 2 },
    { name: "Sistemas ERP (SAP, Oracle)", ordem: 3 },
    { name: "Arquitetura de Dados e Analytics", ordem: 4 },
    { name: "Cloud e Transformação Digital", ordem: 5 },
    { name: "Gestão de Projetos de TI (PMBOK, Ágil)", ordem: 6 },
  ],

  // ══════════════════════════════════════════════════════════════════
  // TECNOLOGIA DA INFORMAÇÃO
  // ══════════════════════════════════════════════════════════════════
  "algoritmos-e-estruturas-de-dados-ti": [
    { name: "Lógica de Programação e Algoritmos", ordem: 1 },
    { name: "Arrays, Matrizes e Strings", ordem: 2 },
    { name: "Listas Ligadas, Pilhas e Filas", ordem: 3 },
    { name: "Árvores: BST, AVL, Heap, B-Tree", ordem: 4 },
    { name: "Grafos: BFS, DFS, Dijkstra, Floyd", ordem: 5 },
    { name: "Ordenação: Quicksort, Mergesort, Heapsort", ordem: 6 },
    { name: "Complexidade: Big-O, Θ, Ω", ordem: 7 },
    { name: "Programação Dinâmica e Gulosa", ordem: 8 },
    { name: "Hash Tables e Tabelas de Dispersão", ordem: 9 },
  ],

  "banco-de-dados-e-sql": [
    { name: "Modelo Relacional e Álgebra Relacional", ordem: 1 },
    { name: "Normalização: 1FN, 2FN, 3FN, BCNF", ordem: 2 },
    { name: "SQL: DDL (CREATE, ALTER, DROP)", ordem: 3 },
    { name: "SQL: DML (SELECT, INSERT, UPDATE, DELETE)", ordem: 4 },
    { name: "SQL: Junções (INNER, LEFT, RIGHT, FULL JOIN)", ordem: 5 },
    { name: "Transações ACID, COMMIT e ROLLBACK", ordem: 6 },
    { name: "Índices, Views e Stored Procedures", ordem: 7 },
    { name: "Banco de Dados NoSQL (MongoDB, Redis, Cassandra)", ordem: 8 },
    { name: "Banco de Dados Distribuído e CAP Theorem", ordem: 9 },
  ],

  "redes-de-computadores-ti": [
    { name: "Modelo OSI: 7 Camadas", ordem: 1 },
    { name: "Modelo TCP/IP: 4 Camadas", ordem: 2 },
    { name: "Endereçamento IPv4: classes, CIDR, VLSM", ordem: 3 },
    { name: "Endereçamento IPv6", ordem: 4 },
    { name: "Protocolos de Aplicação: HTTP/S, DNS, SMTP, FTP, SSH", ordem: 5 },
    { name: "Roteamento: RIP, OSPF, BGP", ordem: 6 },
    { name: "Switching: VLANs, STP, Trunking", ordem: 7 },
    { name: "Redes Sem Fio: Wi-Fi (802.11), Bluetooth", ordem: 8 },
    { name: "Firewalls, Proxies e NAT", ordem: 9 },
    { name: "VPN, MPLS e Redes WAN", ordem: 10 },
  ],

  "seguranca-da-informacao-ti": [
    { name: "Princípios de Segurança: CID (Confidencialidade, Integridade, Disponibilidade)", ordem: 1 },
    { name: "Criptografia Simétrica (AES, DES)", ordem: 2 },
    { name: "Criptografia Assimétrica (RSA, ECC) e PKI", ordem: 3 },
    { name: "Hashing: MD5, SHA-1, SHA-256, bcrypt", ordem: 4 },
    { name: "Autenticação: MFA, OAuth, SAML, JWT", ordem: 5 },
    { name: "OWASP Top 10 e Ataques Web", ordem: 6 },
    { name: "Malware, Ransomware e Engenharia Social", ordem: 7 },
    { name: "Pentest e Análise de Vulnerabilidades", ordem: 8 },
    { name: "IDS/IPS, SIEM e SOC", ordem: 9 },
    { name: "ISO 27001/27002 e NIST CSF", ordem: 10 },
    { name: "LGPD Aplicada à Segurança", ordem: 11 },
  ],

  "engenharia-de-software-ti": [
    { name: "Modelos de Ciclo de Vida: Cascata, Espiral, Incremental", ordem: 1 },
    { name: "Metodologias Ágeis: Scrum", ordem: 2 },
    { name: "Metodologias Ágeis: Kanban, XP, SAFe", ordem: 3 },
    { name: "UML: Diagramas de Classes, Sequência e Casos de Uso", ordem: 4 },
    { name: "Padrões de Projeto (GoF): Criacionais, Estruturais, Comportamentais", ordem: 5 },
    { name: "Arquitetura de Software: MVC, Microsserviços, Hexagonal", ordem: 6 },
    { name: "Testes de Software: Unitário, Integração, Sistema, TDD", ordem: 7 },
    { name: "Refatoração e Dívida Técnica", ordem: 8 },
    { name: "Qualidade de Software: CMMI, ISO 25010", ordem: 9 },
  ],

  "sistemas-operacionais": [
    { name: "Gerenciamento de Processos e Threads", ordem: 1 },
    { name: "Escalonamento de CPU", ordem: 2 },
    { name: "Gerenciamento de Memória: Paginação e Segmentação", ordem: 3 },
    { name: "Sistemas de Arquivos: FAT, NTFS, ext4", ordem: 4 },
    { name: "Linux: Comandos, Shell Script e Permissões", ordem: 5 },
    { name: "Windows Server: Administração e Active Directory", ordem: 6 },
    { name: "Virtualização: VMware, Hyper-V, KVM", ordem: 7 },
    { name: "Contêineres: Docker e Kubernetes", ordem: 8 },
    { name: "Segurança em SO: patches, SELinux, AppArmor", ordem: 9 },
  ],

  "arquitetura-e-infraestrutura-de-ti": [
    { name: "Servidores: Rack, Blade, Mainframe", ordem: 1 },
    { name: "Storage: SAN, NAS, DAS, RAID", ordem: 2 },
    { name: "Alta Disponibilidade: Cluster, Failover, Load Balancer", ordem: 3 },
    { name: "Cloud Computing: Conceitos IaaS, PaaS, SaaS", ordem: 4 },
    { name: "AWS: EC2, S3, RDS, Lambda", ordem: 5 },
    { name: "Azure e GCP: principais serviços", ordem: 6 },
    { name: "Backup, DR e Continuidade de Negócios", ordem: 7 },
    { name: "Monitoramento de Infraestrutura", ordem: 8 },
  ],

  "governanca-e-gestao-de-ti": [
    { name: "ITIL v4: Conceitos e Práticas de Gestão de Serviços", ordem: 1 },
    { name: "COBIT 2019: Princípios e Objetivos de Controle", ordem: 2 },
    { name: "Gestão de Projetos: PMBOK 7ª ed.", ordem: 3 },
    { name: "Gerenciamento Ágil de Projetos (PMI-ACP)", ordem: 4 },
    { name: "Arquitetura Corporativa: TOGAF", ordem: 5 },
    { name: "Gestão de Riscos de TI", ordem: 6 },
    { name: "Auditoria de TI e Controles Internos", ordem: 7 },
    { name: "Indicadores de TI: KPIs e SLA", ordem: 8 },
  ],

  "desenvolvimento-e-apis": [
    { name: "HTML5, CSS3 e JavaScript Moderno (ES6+)", ordem: 1 },
    { name: "APIs REST: métodos HTTP, status codes, autenticação", ordem: 2 },
    { name: "APIs GraphQL e gRPC", ordem: 3 },
    { name: "Arquitetura de Microsserviços", ordem: 4 },
    { name: "DevOps: CI/CD com GitHub Actions, Jenkins", ordem: 5 },
    { name: "Controle de Versão: Git e GitHub/GitLab", ordem: 6 },
    { name: "Testes Automatizados e TDD", ordem: 7 },
    { name: "Observabilidade: Logs, Métricas e Tracing", ordem: 8 },
  ],

  "inteligencia-artificial-e-dados": [
    { name: "Conceitos de Machine Learning: supervisionado, não supervisionado, reforço", ordem: 1 },
    { name: "Algoritmos Clássicos: Regressão, Árvore de Decisão, SVM, k-NN", ordem: 2 },
    { name: "Redes Neurais e Deep Learning", ordem: 3 },
    { name: "Processamento de Linguagem Natural (PLN) e LLMs", ordem: 4 },
    { name: "Big Data: Hadoop, Spark e ecossistema", ordem: 5 },
    { name: "ETL, Data Lake e Data Warehouse", ordem: 6 },
    { name: "Business Intelligence e Visualização de Dados", ordem: 7 },
    { name: "Ética em IA e Regulação de Algoritmos", ordem: 8 },
  ],

  "lgpd-e-conformidade-digital": [
    { name: "LGPD — Fundamentos e Princípios (Lei 13.709/2018)", ordem: 1 },
    { name: "Bases Legais de Tratamento de Dados Pessoais", ordem: 2 },
    { name: "Direitos dos Titulares", ordem: 3 },
    { name: "DPO (Encarregado) e ANPD", ordem: 4 },
    { name: "Privacy by Design e Privacy by Default", ordem: 5 },
    { name: "Incidentes de Segurança e Notificação", ordem: 6 },
    { name: "Transferência Internacional de Dados", ordem: 7 },
    { name: "Impacto em Produtos e Serviços Digitais", ordem: 8 },
  ],

  "raciocinio-logico-ti": [
    { name: "Lógica Proposicional e Tabela-Verdade", ordem: 1 },
    { name: "Lógica de Predicados e Quantificadores", ordem: 2 },
    { name: "Teoria dos Conjuntos", ordem: 3 },
    { name: "Grafos e Teoria dos Grafos", ordem: 4 },
    { name: "Raciocínio Matemático e Indutivo", ordem: 5 },
    { name: "Sequências e Progressões", ordem: 6 },
  ],

  // ══════════════════════════════════════════════════════════════════
  // CONTROLE E AUDITORIA
  // ══════════════════════════════════════════════════════════════════
  "direito-constitucional-controle": [
    { name: "Princípios Constitucionais da Administração Pública (art. 37)", ordem: 1 },
    { name: "Controle Externo: arts. 70–75 CF/88", ordem: 2 },
    { name: "Tribunal de Contas da União — Competências", ordem: 3 },
    { name: "Controle Interno na CF/88", ordem: 4 },
    { name: "Direitos Fundamentais e Improbidade", ordem: 5 },
    { name: "Organização do Estado e dos Poderes", ordem: 6 },
  ],

  "direito-administrativo-controle": [
    { name: "Atos Administrativos: conceito, requisitos e vícios", ordem: 1 },
    { name: "Licitações (Lei 14.133/21): fases e modalidades", ordem: 2 },
    { name: "Irregularidades em Licitações e Contratos", ordem: 3 },
    { name: "Contratos Administrativos: equilíbrio econômico-financeiro", ordem: 4 },
    { name: "Concessões, Permissões e PPPs", ordem: 5 },
    { name: "Servidores Públicos: Lei 8.112/90", ordem: 6 },
    { name: "Improbidade Administrativa (Lei 8.429/92 e alterações)", ordem: 7 },
    { name: "Processo Administrativo (Lei 9.784/99)", ordem: 8 },
  ],

  "controle-externo-e-tcu": [
    { name: "Competências do TCU (Lei 8.443/92)", ordem: 1 },
    { name: "Jurisdição e Sujeitos ao TCU", ordem: 2 },
    { name: "Tomada e Prestação de Contas", ordem: 3 },
    { name: "Fiscalização de Contratos e Convênios", ordem: 4 },
    { name: "Denúncias e Representações ao TCU", ordem: 5 },
    { name: "Sanções: multas, ressarcimento, inidoneidade", ordem: 6 },
    { name: "Auditorias do TCU: operacional, conformidade, contas", ordem: 7 },
    { name: "Controle Externo nos TCEs/TCMs", ordem: 8 },
  ],

  "auditoria-governamental": [
    { name: "ISSAI e Normas INTOSAI", ordem: 1 },
    { name: "Normas Brasileiras de Auditoria Governamental (NBCASP)", ordem: 2 },
    { name: "Planejamento da Auditoria", ordem: 3 },
    { name: "Auditoria de Conformidade", ordem: 4 },
    { name: "Auditoria Operacional (Desempenho)", ordem: 5 },
    { name: "Auditoria de Avaliação de Programas de Governo", ordem: 6 },
    { name: "Matriz de Achados e Relatório de Auditoria", ordem: 7 },
    { name: "Acompanhamento e Monitoramento de Recomendações", ordem: 8 },
  ],

  "auditoria-de-ti-governamental": [
    { name: "Controles de TI e Revisão de Sistemas", ordem: 1 },
    { name: "COBIT aplicado à Auditoria de TI", ordem: 2 },
    { name: "Auditoria de Segurança da Informação", ordem: 3 },
    { name: "Auditoria de Contratos de TI", ordem: 4 },
    { name: "Auditoria de Dados e Análise de Bases", ordem: 5 },
    { name: "Risco de TI e Continuidade de Negócios", ordem: 6 },
  ],

  "contabilidade-publica-controle": [
    { name: "PCASP e MCASP", ordem: 1 },
    { name: "Receita Pública: previsão, arrecadação, recolhimento", ordem: 2 },
    { name: "Despesa Pública: fixação, empenho, liquidação, pagamento", ordem: 3 },
    { name: "Balanços Públicos: Orçamentário, Financeiro, Patrimonial e DFC", ordem: 4 },
    { name: "Dívida Pública Fundada e Flutuante", ordem: 5 },
    { name: "SIAFI: módulos e transações", ordem: 6 },
    { name: "Prestação de Contas e Responsabilidade Fiscal", ordem: 7 },
  ],

  "financas-publicas-e-orcamento": [
    { name: "Planejamento: PPA, LDO e LOA", ordem: 1 },
    { name: "Ciclo Orçamentário e Processo Legislativo", ordem: 2 },
    { name: "Execução Orçamentária e Financeira", ordem: 3 },
    { name: "Lei de Responsabilidade Fiscal (LC 101/2000)", ordem: 4 },
    { name: "Teto de Gastos (EC 95/2016) e Arcabouço Fiscal", ordem: 5 },
    { name: "Receitas e Despesas Públicas: conceitos e classificação", ordem: 6 },
    { name: "Dívida Pública e Gestão do Passivo", ordem: 7 },
  ],

  "licitacoes-e-contratos-controle": [
    { name: "Nova Lei de Licitações (14.133/21): princípios e modalidades", ordem: 1 },
    { name: "Fases da Licitação e Habilitação", ordem: 2 },
    { name: "Dispensa e Inexigibilidade de Licitação", ordem: 3 },
    { name: "Pregão Eletrônico", ordem: 4 },
    { name: "Contratos Administrativos: execução e fiscalização", ordem: 5 },
    { name: "Irregularidades: sobrepreço, superfaturamento, jogo combinado", ordem: 6 },
    { name: "Sanções, Rescisão e Responsabilização", ordem: 7 },
  ],

  "controle-interno-e-compliance-publico": [
    { name: "COSO ERM e Controle Interno Governamental", ordem: 1 },
    { name: "CGU: estrutura, competências e atividades", ordem: 2 },
    { name: "Lei de Acesso à Informação (LAI — Lei 12.527/2011)", ordem: 3 },
    { name: "LGPD na Administração Pública", ordem: 4 },
    { name: "Integridade e Programa Anticorrupção Público", ordem: 5 },
    { name: "Gestão de Riscos no Setor Público (IN SGD 1/2016)", ordem: 6 },
  ],

  "lingua-portuguesa-controle": [
    { name: "Interpretação e Compreensão de Texto", ordem: 1 },
    { name: "Gramática e Ortografia", ordem: 2 },
    { name: "Redação de Relatórios e Pareceres Técnicos", ordem: 3 },
    { name: "Redação Oficial (Manual da Presidência da República)", ordem: 4 },
    { name: "Argumentação e Coerência Textual", ordem: 5 },
  ],

  "raciocinio-logico-controle": [
    { name: "Lógica Proposicional", ordem: 1 },
    { name: "Inferências e Diagramas Lógicos", ordem: 2 },
    { name: "Estatística para Auditoria", ordem: 3 },
    { name: "Análise de Dados e Amostragem", ordem: 4 },
    { name: "Probabilidade Aplicada", ordem: 5 },
  ],

  // ══════════════════════════════════════════════════════════════════
  // PREVIDÊNCIA SOCIAL
  // ══════════════════════════════════════════════════════════════════
  "direito-previdenciario-inss": [
    { name: "Seguridade Social: conceito e organização", ordem: 1 },
    { name: "Segurados Obrigatórios e Facultativos", ordem: 2 },
    { name: "Carência: conceito, prazos e dispensas", ordem: 3 },
    { name: "Salário de Contribuição e Salário de Benefício", ordem: 4 },
    { name: "Aposentadoria por Incapacidade Permanente", ordem: 5 },
    { name: "Aposentadoria Programada (por Tempo de Contribuição e Pontos)", ordem: 6 },
    { name: "Auxílio por Incapacidade Temporária (antigo auxílio-doença)", ordem: 7 },
    { name: "Salário-Maternidade", ordem: 8 },
    { name: "Pensão por Morte e Auxílio-Acidente", ordem: 9 },
    { name: "Recursos e Processo Administrativo Previdenciário", ordem: 10 },
  ],

  "custeio-da-previdencia-social": [
    { name: "Lei 8.212/91: Plano de Custeio", ordem: 1 },
    { name: "Contribuições do Empregado e Empregador", ordem: 2 },
    { name: "Contribuições do Autônomo e MEI", ordem: 3 },
    { name: "Contribuições sobre a Receita Bruta (CPRB)", ordem: 4 },
    { name: "Desoneração da Folha de Pagamento", ordem: 5 },
    { name: "Obrigações Acessórias: GFIP, eSocial", ordem: 6 },
    { name: "Fiscalização e Arrecadação Previdenciária", ordem: 7 },
  ],

  "reforma-da-previdencia-ec-103-2019": [
    { name: "EC 103/2019: principais mudanças", ordem: 1 },
    { name: "Novas Regras de Aposentadoria (RGPS)", ordem: 2 },
    { name: "Regras de Transição: pontos, tempo de contribuição e pedágio", ordem: 3 },
    { name: "RPPS após a Reforma", ordem: 4 },
    { name: "Benefício de Prestação Continuada (BPC) pós-reforma", ordem: 5 },
    { name: "Impacto Fiscal da Reforma", ordem: 6 },
  ],

  "legislacao-previdenciaria-especial": [
    { name: "LOAS — Lei 8.742/93: BPC e Assistência Social", ordem: 1 },
    { name: "Segurado Especial: trabalhador rural e pescador artesanal", ordem: 2 },
    { name: "Trabalhador Doméstico: regime previdenciário", ordem: 3 },
    { name: "Microempreendedor Individual (MEI): regras previdenciárias", ordem: 4 },
    { name: "Contagem Recíproca de Tempo (RGPS/RPPS)", ordem: 5 },
    { name: "Crimes Previdenciários (Lei 9.983/2000)", ordem: 6 },
  ],

  "direito-administrativo-inss": [
    { name: "Administração Pública Direta e Indireta", ordem: 1 },
    { name: "Atos Administrativos no âmbito do INSS", ordem: 2 },
    { name: "Processo Administrativo (Lei 9.784/99)", ordem: 3 },
    { name: "Recursos Administrativos no INSS", ordem: 4 },
    { name: "Improbidade e Responsabilidade do Servidor", ordem: 5 },
  ],

  "lingua-portuguesa-inss": [
    { name: "Interpretação de Texto", ordem: 1 },
    { name: "Gramática: Morfologia e Sintaxe", ordem: 2 },
    { name: "Ortografia e Acentuação", ordem: 3 },
    { name: "Concordância Nominal e Verbal", ordem: 4 },
    { name: "Coesão e Coerência Textual", ordem: 5 },
  ],

  "raciocinio-logico-inss": [
    { name: "Lógica Proposicional", ordem: 1 },
    { name: "Diagramas Lógicos e Conjuntos", ordem: 2 },
    { name: "Raciocínio Sequencial", ordem: 3 },
    { name: "Porcentagem e Proporcionalidade", ordem: 4 },
    { name: "Análise Combinatória e Probabilidade básica", ordem: 5 },
  ],

  "informatica-inss": [
    { name: "Windows e Configurações Básicas", ordem: 1 },
    { name: "Word, Excel e PowerPoint", ordem: 2 },
    { name: "Internet, E-mail e Navegadores", ordem: 3 },
    { name: "Segurança Digital: vírus, phishing, senhas", ordem: 4 },
    { name: "Noções de Redes e Conectividade", ordem: 5 },
  ],

  "saude-e-seguranca-do-trabalho": [
    { name: "Acidente de Trabalho: conceito, tipos e comunicação (CAT)", ordem: 1 },
    { name: "Nexo Causal e Nexo Técnico Epidemiológico (NTEP)", ordem: 2 },
    { name: "NR-15: Atividades e Operações Insalubres", ordem: 3 },
    { name: "NR-16: Atividades e Operações Perigosas", ordem: 4 },
    { name: "Perfil Profissiográfico Previdenciário (PPP)", ordem: 5 },
    { name: "Aposentadoria Especial: requisitos e atividades", ordem: 6 },
    { name: "LTCAT e PCMSO", ordem: 7 },
  ],

  // ══════════════════════════════════════════════════════════════════
  // MILITAR
  // ══════════════════════════════════════════════════════════════════
  "matematica-militar": [
    { name: "Conjuntos Numéricos e Operações", ordem: 1 },
    { name: "Funções: linear, quadrática, exponencial, logarítmica", ordem: 2 },
    { name: "Equações e Inequações", ordem: 3 },
    { name: "Trigonometria", ordem: 4 },
    { name: "Geometria Plana", ordem: 5 },
    { name: "Geometria Espacial", ordem: 6 },
    { name: "Análise Combinatória", ordem: 7 },
    { name: "Probabilidade", ordem: 8 },
    { name: "Estatística e Matrizes", ordem: 9 },
  ],

  "fisica-militar": [
    { name: "Cinemática: MRU, MRUV, MCU", ordem: 1 },
    { name: "Dinâmica: Leis de Newton", ordem: 2 },
    { name: "Energia, Trabalho e Potência", ordem: 3 },
    { name: "Gravitação Universal", ordem: 4 },
    { name: "Hidrostática e Hidrodinâmica", ordem: 5 },
    { name: "Termodinâmica e Gases", ordem: 6 },
    { name: "Eletrostática e Eletrodinâmica", ordem: 7 },
    { name: "Eletromagnetismo", ordem: 8 },
    { name: "Óptica Geométrica", ordem: 9 },
    { name: "Ondulatória e Acústica", ordem: 10 },
  ],

  "quimica-militar": [
    { name: "Estrutura Atômica e Tabela Periódica", ordem: 1 },
    { name: "Ligações Químicas", ordem: 2 },
    { name: "Estequiometria e Reações Químicas", ordem: 3 },
    { name: "Soluções: concentração e diluição", ordem: 4 },
    { name: "Termoquímica e Cinética Química", ordem: 5 },
    { name: "Eletroquímica: pilhas e eletrólise", ordem: 6 },
    { name: "Funções Inorgânicas", ordem: 7 },
    { name: "Química Orgânica: funções e reações", ordem: 8 },
    { name: "Isomeria Orgânica", ordem: 9 },
  ],

  "biologia-militar": [
    { name: "Citologia: estrutura e função celular", ordem: 1 },
    { name: "Divisão Celular: mitose e meiose", ordem: 2 },
    { name: "Genética Mendeliana", ordem: 3 },
    { name: "Genética Molecular: DNA, RNA, síntese proteica", ordem: 4 },
    { name: "Evolução Biológica", ordem: 5 },
    { name: "Ecologia: cadeias, relações e biomas", ordem: 6 },
    { name: "Fisiologia Humana", ordem: 7 },
    { name: "Microbiologia e Parasitologia", ordem: 8 },
  ],

  "lingua-portuguesa-militar": [
    { name: "Interpretação de Texto e Tipologia Textual", ordem: 1 },
    { name: "Morfologia: Classes de Palavras", ordem: 2 },
    { name: "Sintaxe: Período Simples e Composto", ordem: 3 },
    { name: "Concordância Nominal e Verbal", ordem: 4 },
    { name: "Regência e Crase", ordem: 5 },
    { name: "Ortografia e Acentuação", ordem: 6 },
    { name: "Redação Dissertativa", ordem: 7 },
  ],

  "lingua-inglesa-militar": [
    { name: "Leitura e Interpretação de Texto em Inglês", ordem: 1 },
    { name: "Tempos Verbais (Simple, Continuous, Perfect)", ordem: 2 },
    { name: "Voz Passiva e Reported Speech", ordem: 3 },
    { name: "Vocabulário Militar e Técnico", ordem: 4 },
    { name: "Gramática: Modal Verbs, Conditionals", ordem: 5 },
  ],

  "historia-e-geografia-do-brasil-militar": [
    { name: "Período Colonial e Independência", ordem: 1 },
    { name: "Império e Proclamação da República", ordem: 2 },
    { name: "Era Vargas e Estado Novo", ordem: 3 },
    { name: "Ditadura Militar e Redemocratização", ordem: 4 },
    { name: "Brasil Contemporâneo", ordem: 5 },
    { name: "Geopolítica Brasileira: fronteiras e regiões", ordem: 6 },
    { name: "Biomas e Recursos Naturais do Brasil", ordem: 7 },
    { name: "Amazônia: importância estratégica", ordem: 8 },
  ],

  "legislacao-militar": [
    { name: "Estatuto dos Militares (Lei 6.880/80)", ordem: 1 },
    { name: "Regulamento Disciplinar do Exército (RDE)", ordem: 2 },
    { name: "Normas da Marinha e Aeronáutica", ordem: 3 },
    { name: "Hierarquia e Disciplina Militar", ordem: 4 },
    { name: "Direitos e Deveres do Militar", ordem: 5 },
    { name: "Regime Previdenciário Militar (FUNPRESP-EXE)", ordem: 6 },
    { name: "Processo Administrativo Disciplinar Militar", ordem: 7 },
  ],

  "direito-constitucional-militar": [
    { name: "Forças Armadas na CF/88: arts. 142 e 143", ordem: 1 },
    { name: "Defesa Nacional e Segurança Pública", ordem: 2 },
    { name: "Estado de Defesa e Estado de Sítio", ordem: 3 },
    { name: "Justiça Militar: competência e organização", ordem: 4 },
    { name: "Forças Auxiliares: Polícia Militar e Bombeiros", ordem: 5 },
  ],

  "conhecimentos-gerais-e-atualidades-militar": [
    { name: "Conjuntura Nacional e Internacional", ordem: 1 },
    { name: "Defesa Nacional e Geopolítica", ordem: 2 },
    { name: "Questões Ambientais e Amazônia", ordem: 3 },
    { name: "Segurança Pública e Combate ao Crime", ordem: 4 },
    { name: "Ciência, Tecnologia e Inovação", ordem: 5 },
  ],

  // ══════════════════════════════════════════════════════════════════
  // DIPLOMACIA (CACD)
  // ══════════════════════════════════════════════════════════════════
  "lingua-portuguesa-cacd": [
    { name: "Interpretação e Análise de Texto", ordem: 1 },
    { name: "Gramática: Morfologia e Sintaxe Avançada", ordem: 2 },
    { name: "Ortografia e Estilo Culto", ordem: 3 },
    { name: "Dissertação e Argumentação", ordem: 4 },
    { name: "Relatório Diplomático — Elaboração", ordem: 5 },
    { name: "Linguagem Culta e Registro Formal", ordem: 6 },
  ],

  "lingua-inglesa-cacd": [
    { name: "Reading Comprehension — Textos Políticos e Econômicos", ordem: 1 },
    { name: "Grammar: Advanced Tenses, Conditionals, Passives", ordem: 2 },
    { name: "Vocabulary: Diplomatic and Legal English", ordem: 3 },
    { name: "Essay Writing and Argumentation", ordem: 4 },
    { name: "Translation and Text Interpretation", ordem: 5 },
  ],

  "lingua-espanhola-cacd": [
    { name: "Compreensão de Texto em Espanhol", ordem: 1 },
    { name: "Gramática Espanhola: verbos, concordância, subordinação", ordem: 2 },
    { name: "Vocabulário Diplomático em Espanhol", ordem: 3 },
    { name: "Redação e Argumentação em Espanhol", ordem: 4 },
    { name: "América Latina — textos e contextos", ordem: 5 },
  ],

  "lingua-francesa-cacd": [
    { name: "Compréhension de texte en français", ordem: 1 },
    { name: "Grammaire française: temps, accord, subordination", ordem: 2 },
    { name: "Vocabulaire diplomatique et politique", ordem: 3 },
    { name: "Rédaction et argumentation en français", ordem: 4 },
  ],

  "historia-do-brasil-cacd": [
    { name: "Formação Territorial e Colonial", ordem: 1 },
    { name: "Política Externa do Império e Barão do Rio Branco", ordem: 2 },
    { name: "Relações Internacionais da República Velha", ordem: 3 },
    { name: "Brasil na Segunda Guerra Mundial e ONU", ordem: 4 },
    { name: "Política Externa Independente e PEB Contemporânea", ordem: 5 },
    { name: "Integração Regional: Mercosul, UNASUL, CELAC", ordem: 6 },
    { name: "Brasil no BRICS e Relações Sul-Sul", ordem: 7 },
  ],

  "historia-mundial-e-relacoes-internacionais": [
    { name: "Ordem Internacional pós-1945 e Guerra Fria", ordem: 1 },
    { name: "Fim da Guerra Fria e Nova Ordem Mundial", ordem: 2 },
    { name: "ONU, G7, G20 e Multilateralismo", ordem: 3 },
    { name: "Conflitos Regionais Contemporâneos", ordem: 4 },
    { name: "Oriente Médio e Geopolítica do Petróleo", ordem: 5 },
    { name: "China e a Nova Competição Sino-Americana", ordem: 6 },
    { name: "Terrorismo Internacional e Segurança Global", ordem: 7 },
    { name: "Mudanças Climáticas e Agenda 2030", ordem: 8 },
  ],

  "politica-internacional-e-teoria-das-ri": [
    { name: "Realismo e Neorrealismo (Morgenthau, Waltz)", ordem: 1 },
    { name: "Liberalismo e Neoliberalismo (Nye, Keohane)", ordem: 2 },
    { name: "Construtivismo (Wendt)", ordem: 3 },
    { name: "Poder Nacional e Soft Power", ordem: 4 },
    { name: "Balança de Poder e Hegemonia", ordem: 5 },
    { name: "Regimes Internacionais e Governança Global", ordem: 6 },
    { name: "Diplomacia Preventiva e Solução Pacífica", ordem: 7 },
    { name: "Segurança Internacional e Estudos Estratégicos", ordem: 8 },
  ],

  "direito-internacional-publico": [
    { name: "Fontes do Direito Internacional (art. 38 do Estatuto da CIJ)", ordem: 1 },
    { name: "Sujeitos do DI: Estados, OIs, indivíduo", ordem: 2 },
    { name: "Tratados: Convenção de Viena sobre o Direito dos Tratados", ordem: 3 },
    { name: "Responsabilidade Internacional do Estado", ordem: 4 },
    { name: "Solução Pacífica de Controvérsias: CIJ, OMC, arbitragem", ordem: 5 },
    { name: "Direito Internacional Humanitário: Convenções de Genebra", ordem: 6 },
    { name: "Direito do Mar (CNUDM/UNCLOS)", ordem: 7 },
    { name: "Direito Internacional dos Direitos Humanos", ordem: 8 },
  ],

  "direito-internacional-privado": [
    { name: "LINDB: normas de aplicação no espaço", ordem: 1 },
    { name: "Conflito de Leis no Espaço: elementos de conexão", ordem: 2 },
    { name: "Nacionalidade e Condição Jurídica do Estrangeiro", ordem: 3 },
    { name: "Domicílio no DIPr", ordem: 4 },
    { name: "Cooperação Jurídica Internacional (cartas rogatórias, homologação)", ordem: 5 },
    { name: "Extradição e Refugiados (Lei 9.474/97)", ordem: 6 },
  ],

  "economia-politica-internacional": [
    { name: "Teorias do Comércio Internacional", ordem: 1 },
    { name: "OMC: acordos, controvérsias e rodadas", ordem: 2 },
    { name: "Acordos Regionais de Comércio e MERCOSUL", ordem: 3 },
    { name: "FMI: funções, SDR e condicionalidades", ordem: 4 },
    { name: "Banco Mundial e Bancos Regionais de Desenvolvimento", ordem: 5 },
    { name: "Finanças Internacionais: câmbio e crises", ordem: 6 },
    { name: "Desenvolvimento Econômico e Agenda 2030 (ODS)", ordem: 7 },
  ],

  "direito-constitucional-cacd": [
    { name: "Princípios Fundamentais da CF/88 (arts. 1º–4º)", ordem: 1 },
    { name: "Direitos e Garantias Fundamentais", ordem: 2 },
    { name: "Organização do Estado: Poderes e Federalismo", ordem: 3 },
    { name: "Competências da União em Relações Exteriores", ordem: 4 },
    { name: "Tratados Internacionais e o Direito Interno Brasileiro", ordem: 5 },
  ],

  "nocoes-de-economia-cacd": [
    { name: "Microeconomia: oferta, demanda e equilíbrio", ordem: 1 },
    { name: "Macroeconomia: PIB, inflação, desemprego", ordem: 2 },
    { name: "Política Fiscal e Monetária", ordem: 3 },
    { name: "Balanço de Pagamentos e Taxa de Câmbio", ordem: 4 },
    { name: "Desenvolvimento Econômico e Desigualdade", ordem: 5 },
  ],

  // ══════════════════════════════════════════════════════════════════
  // AMBIENTAL E AGRONEGÓCIO
  // ══════════════════════════════════════════════════════════════════
  "legislacao-ambiental": [
    { name: "Política Nacional do Meio Ambiente (Lei 6.938/81)", ordem: 1 },
    { name: "Código Florestal (Lei 12.651/2012): APP e Reserva Legal", ordem: 2 },
    { name: "Crimes Ambientais (Lei 9.605/98)", ordem: 3 },
    { name: "Licenciamento Ambiental e EIA/RIMA", ordem: 4 },
    { name: "Resíduos Sólidos (Lei 12.305/2010 — PNRS)", ordem: 5 },
    { name: "Política de Mudança do Clima (Lei 12.187/2009)", ordem: 6 },
    { name: "Responsabilidade Ambiental: civil, administrativa e penal", ordem: 7 },
    { name: "Legislação sobre Agrotóxicos (Lei 7.802/89)", ordem: 8 },
  ],

  "sistema-nacional-de-unidades-de-conservacao-snuc": [
    { name: "SNUC (Lei 9.985/2000): conceitos gerais", ordem: 1 },
    { name: "Categorias de UC: proteção integral e uso sustentável", ordem: 2 },
    { name: "Plano de Manejo e Zonamento", ordem: 3 },
    { name: "Zona de Amortecimento e Corredores Ecológicos", ordem: 4 },
    { name: "Gestão Participativa e Conselho Consultivo/Deliberativo", ordem: 5 },
    { name: "Mosaicos e Reservas da Biosfera", ordem: 6 },
    { name: "Compensação Ambiental em UCs", ordem: 7 },
  ],

  "ciencias-ambientais-e-ecologia": [
    { name: "Ecologia de Populações e Comunidades", ordem: 1 },
    { name: "Biomas Brasileiros: Amazônia, Cerrado, Mata Atlântica, Caatinga, Pampa, Pantanal", ordem: 2 },
    { name: "Biodiversidade: conceitos, ameaças e conservação", ordem: 3 },
    { name: "Mudanças Climáticas: causas, efeitos e Acordo de Paris", ordem: 4 },
    { name: "Pegada de Carbono e Créditos de Carbono", ordem: 5 },
    { name: "Recursos Naturais: solo, água, flora, fauna", ordem: 6 },
    { name: "Impactos Ambientais e Gestão Ambiental", ordem: 7 },
    { name: "Convenção da Biodiversidade (CDB) e Protocolo de Nagoya", ordem: 8 },
  ],

  "recursos-hidricos-e-saneamento": [
    { name: "PNRH (Lei 9.433/97): princípios e instrumentos", ordem: 1 },
    { name: "ANA: competências e atuação", ordem: 2 },
    { name: "Outorga e Cobrança pelo Uso da Água", ordem: 3 },
    { name: "Comitês de Bacia Hidrográfica", ordem: 4 },
    { name: "Enquadramento dos Corpos de Água", ordem: 5 },
    { name: "Saneamento Básico (Lei 11.445/07 e novo marco — Lei 14.026/20)", ordem: 6 },
    { name: "Gestão de Resíduos Líquidos e Esgoto", ordem: 7 },
  ],

  "defesa-agropecuaria-e-sanidade-animal": [
    { name: "Vigilância Agropecuária Internacional e Barreiras Sanitárias", ordem: 1 },
    { name: "Sanidade Animal: principais doenças e programas nacionais", ordem: 2 },
    { name: "Sanidade Vegetal: pragas quarentenárias e manejo", ordem: 3 },
    { name: "Inspeção de Produtos de Origem Animal (SIF — RIISPOA)", ordem: 4 },
    { name: "Inspeção de Produtos de Origem Vegetal", ordem: 5 },
    { name: "Rastreabilidade Animal (SISBOV) e Vegetal", ordem: 6 },
    { name: "Organismos Geneticamente Modificados (OGMs)", ordem: 7 },
  ],

  "agronegocio-e-politica-agricola": [
    { name: "Cadeia Produtiva do Agronegócio Brasileiro", ordem: 1 },
    { name: "Crédito Rural: PRONAF, PRONAMP, BNDES", ordem: 2 },
    { name: "Seguro Rural e Proagro", ordem: 3 },
    { name: "CONAB: estoque regulador e preços mínimos", ordem: 4 },
    { name: "Reforma Agrária e INCRA", ordem: 5 },
    { name: "Exportações do Agronegócio e Comércio Internacional", ordem: 6 },
    { name: "Agricultura Familiar (Lei 11.326/2006)", ordem: 7 },
    { name: "ESG no Agronegócio e Rastreabilidade", ordem: 8 },
  ],

  "agroquimica-e-defensivos-agricolas": [
    { name: "Fertilizantes e Nutrição de Plantas", ordem: 1 },
    { name: "Solos: estrutura, tipos e manejo", ordem: 2 },
    { name: "Agrotóxicos: registro e uso (Lei 7.802/89)", ordem: 3 },
    { name: "Manejo Integrado de Pragas (MIP)", ordem: 4 },
    { name: "Controle Biológico de Pragas", ordem: 5 },
    { name: "Resíduos de Agrotóxicos e Toxicologia", ordem: 6 },
    { name: "Agricultura Orgânica e Agroecologia", ordem: 7 },
  ],

  "fiscalizacao-ambiental-e-licenciamento": [
    { name: "IBAMA: estrutura, competências e atuação", ordem: 1 },
    { name: "Auto de Infração Ambiental e Embargos", ordem: 2 },
    { name: "Processo Administrativo Ambiental", ordem: 3 },
    { name: "TAC (Termo de Ajustamento de Conduta)", ordem: 4 },
    { name: "Licença Prévia, de Instalação e de Operação", ordem: 5 },
    { name: "SISNAMA: estrutura e órgãos", ordem: 6 },
    { name: "Fiscalização em Áreas Protegidas e Florestas", ordem: 7 },
  ],

  "direito-administrativo-ambiental": [
    { name: "Administração Pública no IBAMA, ICMBio e MAPA", ordem: 1 },
    { name: "Atos Administrativos e Poder de Polícia Ambiental", ordem: 2 },
    { name: "Licitações e Contratos no âmbito ambiental", ordem: 3 },
    { name: "Servidores Públicos: Lei 8.112/90", ordem: 4 },
    { name: "Processo Administrativo e Recursos", ordem: 5 },
  ],

  "lingua-portuguesa-ambiental": [
    { name: "Interpretação de Texto", ordem: 1 },
    { name: "Gramática e Ortografia", ordem: 2 },
    { name: "Redação de Relatórios Técnicos Ambientais", ordem: 3 },
    { name: "Coesão e Coerência Textual", ordem: 4 },
  ],

  "raciocinio-logico-ambiental": [
    { name: "Lógica Proposicional", ordem: 1 },
    { name: "Análise de Dados e Estatística Ambiental", ordem: 2 },
    { name: "Probabilidade e Inferência Estatística", ordem: 3 },
    { name: "Diagramas e Conjuntos", ordem: 4 },
  ],

  "nocoes-de-informatica-ambiental": [
    { name: "Geoprocessamento e Sensoriamento Remoto Básico", ordem: 1 },
    { name: "SIG/GIS: conceitos e aplicações ambientais", ordem: 2 },
    { name: "Sistemas de Informação Ambiental (SINAFLOR, SISLEG, CAR)", ordem: 3 },
    { name: "Pacote Office e Planilhas para Dados Ambientais", ordem: 4 },
    { name: "Internet, E-mail e Segurança Digital", ordem: 5 },
  ],
};

// ── Execução ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("🏷️  Seed de Tópicos — Novas 8 Categorias\n");

  // Carrega todas as matérias das novas categorias
  const cats = [
    "bancos-publicos", "petrobras-estatais", "tecnologia-informacao",
    "controle-auditoria", "previdencia-social", "militar", "diplomacia", "ambiental-agro"
  ];
  const { data: subjects, error: sErr } = await db
    .from("Subject")
    .select("id, slug, name")
    .in("categoria", cats);

  if (sErr) { console.error("Erro ao carregar matérias:", sErr.message); process.exit(1); }

  const slugMap = Object.fromEntries(subjects.map(s => [s.slug, s]));

  let criados = 0, skipped = 0, erros = 0;

  for (const [slug, topicos] of Object.entries(TOPICS_BY_SUBJECT)) {
    const subject = slugMap[slug];
    if (!subject) {
      console.warn(`  ⚠️  Matéria não encontrada no banco: "${slug}"`);
      skipped++;
      continue;
    }

    for (const t of topicos) {
      const tSlug = t.name
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      // Verifica se já existe
      const { data: ex } = await db
        .from("Topic")
        .select("id")
        .eq("subjectId", subject.id)
        .eq("slug", tSlug)
        .maybeSingle();

      if (ex) { skipped++; continue; }

      const { error } = await db.from("Topic").insert({
        id: crypto.randomUUID(),
        subjectId: subject.id,
        name: t.name,
        slug: tSlug,
        description: t.description ?? null,
        ordem: t.ordem,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (error) {
        console.error(`  ❌ ${subject.name} → ${t.name}: ${error.message}`);
        erros++;
      } else {
        console.log(`  🆕 ${subject.slug.slice(0, 30).padEnd(32)} → ${t.name}`);
        criados++;
      }
    }
  }

  console.log(`\n✅ ${criados} tópicos criados  ⏭️  ${skipped} já existiam  ❌ ${erros} erros`);

  // Total no banco
  const { count } = await db.from("Topic").select("id", { count: "exact", head: true });
  console.log(`\n📊 Total de tópicos no banco agora: ${count}`);
}

main().catch(console.error);
