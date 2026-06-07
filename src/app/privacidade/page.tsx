export default function PrivacidadePage() {
  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="max-w-3xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8"
        >
          ← Voltar
        </a>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-10">
          AprovAI360 Tecnologia Ltda. — Última atualização: 17 de maio de 2026
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Controlador dos Dados</h2>
            <p>
              O controlador responsável pelo tratamento dos seus dados pessoais, nos termos do art. 5º, VI
              da Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018), é:
            </p>
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <p><strong className="text-white">Razão Social:</strong> AprovAI360 Tecnologia Ltda.</p>
              <p><strong className="text-white">Marca:</strong> AprovAI360</p>
              <p>
                <strong className="text-white">Contato DPO / Privacidade:</strong>{" "}
                <a href="mailto:contato@aprovai360.com.br" className="text-teal-400 hover:underline">
                  contato@aprovai360.com.br
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Dados Pessoais Coletados</h2>
            <p>Coletamos os seguintes dados ao longo do uso da Plataforma:</p>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">2.1 Dados de Cadastro</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Senha (armazenada em formato criptografado — nunca em texto claro)</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">2.2 Dados de Uso e Desempenho</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Progresso de estudo por matéria e banca</li>
              <li>Histórico de respostas a questões (acertos, erros, tempo por questão)</li>
              <li>Resultados de simulados e revisões</li>
              <li>Atividade de acesso (datas, horários e frequência de login)</li>
              <li>Interações com o Mentor IA (perguntas e respostas)</li>
              <li>Flashcards criados, favoritos e anotações</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">2.3 Dados de Assinatura e Pagamento</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Plano contratado e histórico de assinaturas</li>
              <li>Status de pagamento (processado pelo Mercado Pago — não armazenamos dados de cartão)</li>
              <li>Identificadores de transação fornecidos pelo processador de pagamentos</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">2.4 Dados Técnicos</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Endereço IP (anonimizado após 30 dias)</li>
              <li>Tipo de dispositivo e navegador</li>
              <li>Cookies de sessão de autenticação (vide item 9)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Base Legal para o Tratamento</h2>
            <p>O tratamento dos seus dados pessoais é realizado com fundamento nas seguintes bases legais:</p>
            <div className="mt-4 space-y-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-gray-100 mb-1">Execução de Contrato — art. 7º, V da LGPD</p>
                <p>
                  Dados necessários para criar sua conta, processar assinaturas, fornecer as funcionalidades
                  da Plataforma e prestar suporte ao usuário.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-gray-100 mb-1">Legítimo Interesse — art. 7º, IX da LGPD</p>
                <p>
                  Dados de uso e desempenho utilizados para personalização da experiência de estudo,
                  melhoria contínua dos algoritmos de revisão espaçada e prevenção a fraudes, desde que
                  não prevaleçam sobre direitos e liberdades fundamentais do titular.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-gray-100 mb-1">Obrigação Legal — art. 7º, II da LGPD</p>
                <p>
                  Dados financeiros mantidos pelo prazo exigido pela legislação fiscal e contábil brasileira.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Finalidade do Tratamento</h2>
            <p>Utilizamos seus dados para as seguintes finalidades:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong className="text-gray-100">Personalização de estudos:</strong> adaptar o conteúdo,
                dificuldade e sequência de questões com base no seu desempenho histórico;
              </li>
              <li>
                <strong className="text-gray-100">Mentor IA:</strong> enviar contexto relevante ao modelo
                de linguagem para gerar explicações personalizadas;
              </li>
              <li>
                <strong className="text-gray-100">Relatórios de desempenho:</strong> gerar estatísticas,
                gráficos e resumos de progresso para o próprio usuário e, quando aplicável, para administradores
                da plataforma;
              </li>
              <li>
                <strong className="text-gray-100">Gestão da conta e suporte:</strong> processar cadastro,
                autenticação, pagamentos, cancelamentos e responder solicitações de suporte;
              </li>
              <li>
                <strong className="text-gray-100">Comunicações transacionais:</strong> enviar confirmações
                de cadastro, recuperação de senha, recibos e atualizações importantes sobre o serviço;
              </li>
              <li>
                <strong className="text-gray-100">Segurança e prevenção a fraudes:</strong> detectar e
                prevenir acessos não autorizados, compartilhamento de contas e uso indevido da Plataforma;
              </li>
              <li>
                <strong className="text-gray-100">Melhoria do produto:</strong> analisar padrões de uso
                de forma agregada e anonimizada para aperfeiçoar funcionalidades.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Compartilhamento de Dados</h2>
            <p>
              Não vendemos seus dados pessoais. Compartilhamos dados apenas com os parceiros necessários
              para a operação da Plataforma, todos com níveis adequados de proteção:
            </p>
            <div className="mt-4 space-y-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-gray-100 mb-1">Supabase Inc. — Infraestrutura e Autenticação</p>
                <p>
                  Provedor de banco de dados e autenticação. Os dados são armazenados em servidores na
                  região São Paulo (sa-east-1). A Supabase é certificada SOC 2 Type II e opera em
                  conformidade com o GDPR, aplicável por analogia à LGPD.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-gray-100 mb-1">Anthropic PBC — Inteligência Artificial (Mentor IA)</p>
                <p>
                  Enviamos apenas o contexto mínimo necessário (trecho da sessão de estudo e dúvida do usuário)
                  para geração de respostas pelo Mentor IA. A Anthropic não utiliza dados de clientes para
                  treinar seus modelos, conforme sua política de uso da API.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="font-semibold text-gray-100 mb-1">Mercado Pago S.A. — Processamento de Pagamentos</p>
                <p>
                  Responsável pelo processamento de cobranças. Compartilhamos apenas o e-mail e identificador
                  do usuário para associação da assinatura. Dados de cartão de crédito são coletados e
                  armazenados exclusivamente pelo Mercado Pago, empresa autorizada pelo Banco Central do Brasil.
                </p>
              </div>
            </div>
            <p className="mt-4">
              Podemos ainda compartilhar dados quando exigido por determinação judicial, autoridade competente
              ou obrigação legal, sempre na extensão mínima necessária.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pessoais pelo período necessário às finalidades descritas nesta Política:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong className="text-gray-100">Conta ativa:</strong> dados mantidos durante toda a vigência
                da conta, permitindo acesso contínuo ao histórico de estudos;
              </li>
              <li>
                <strong className="text-gray-100">Após encerramento da conta:</strong> dados retidos por
                até <strong className="text-white">5 (cinco) anos</strong> para cumprimento de obrigações
                legais, contábeis e fiscais, e para eventual resolução de litígios;
              </li>
              <li>
                <strong className="text-gray-100">Dados de pagamento:</strong> mantidos pelo prazo legal
                mínimo exigido pela Receita Federal e legislação tributária;
              </li>
              <li>
                <strong className="text-gray-100">Logs técnicos:</strong> retidos por até 12 meses para
                fins de segurança e diagnóstico.
              </li>
            </ul>
            <p className="mt-3">
              Após o prazo de retenção, os dados são excluídos de forma segura ou anonimizados de modo
              irreversível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Direitos do Titular</h2>
            <p>
              Nos termos dos arts. 17 a 22 da LGPD, você tem os seguintes direitos em relação aos seus
              dados pessoais:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li><strong className="text-gray-100">Acesso:</strong> solicitar confirmação e acesso aos dados que tratamos sobre você;</li>
              <li><strong className="text-gray-100">Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li><strong className="text-gray-100">Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados em desconformidade com a LGPD;</li>
              <li><strong className="text-gray-100">Portabilidade:</strong> receber seus dados em formato estruturado e interoperável;</li>
              <li><strong className="text-gray-100">Eliminação:</strong> solicitar a exclusão dos dados tratados com base em consentimento, ressalvadas as hipóteses de retenção legal;</li>
              <li><strong className="text-gray-100">Informação:</strong> obter informações sobre com quem seus dados são compartilhados;</li>
              <li><strong className="text-gray-100">Revogação de consentimento:</strong> retirar consentimento a qualquer momento, sem prejuízo das operações anteriores;</li>
              <li><strong className="text-gray-100">Oposição:</strong> opor-se ao tratamento com base em legítimo interesse quando existir violação à LGPD.</li>
            </ul>
            <p className="mt-4">
              Para exercer qualquer desses direitos, entre em contato pelo e-mail{" "}
              <a href="mailto:contato@aprovai360.com.br" className="text-teal-400 hover:underline">
                contato@aprovai360.com.br
              </a>
              . Atenderemos sua solicitação no prazo legal de até 15 (quinze) dias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Segurança dos Dados</h2>
            <p>
              Adotamos medidas técnicas e organizacionais compatíveis com o estado da arte para proteger
              seus dados pessoais, incluindo:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Criptografia em trânsito via TLS 1.2+ em todas as comunicações;</li>
              <li>Senhas armazenadas com hash bcrypt (nunca em texto claro);</li>
              <li>Controle de acesso baseado em funções (RBAC) para dados sensíveis;</li>
              <li>Monitoramento contínuo de acessos suspeitos;</li>
              <li>Backups criptografados com retenção definida por política.</li>
            </ul>
            <p className="mt-3">
              Em caso de incidente de segurança que possa afetar seus dados, notificaremos a Autoridade
              Nacional de Proteção de Dados (ANPD) e os titulares afetados nos prazos previstos pela LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Cookies</h2>
            <p>
              A Plataforma utiliza exclusivamente <strong className="text-white">cookies de sessão de
              autenticação</strong>, necessários para manter o usuário logado durante a navegação.
              Não utilizamos cookies de rastreamento, publicidade comportamental ou analytics de terceiros.
            </p>
            <p className="mt-3">
              Os cookies de sessão são excluídos automaticamente ao encerrar o navegador ou ao fazer logout.
              Você pode configurar seu navegador para bloquear cookies, mas isso impedirá o funcionamento
              correto da autenticação na Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Transferência Internacional de Dados</h2>
            <p>
              Parte dos dados pode ser processada por servidores localizados fora do Brasil (Anthropic,
              nos Estados Unidos). Essas transferências são realizadas com salvaguardas adequadas, em
              conformidade com o art. 33 da LGPD, incluindo cláusulas contratuais específicas e políticas
              de privacidade dos processadores compatíveis com padrões internacionais de proteção de dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas por
              e-mail e/ou por aviso destacado na Plataforma com antecedência mínima de 15 (quinze) dias.
              A versão vigente estará sempre disponível em{" "}
              <a href="/privacidade" className="text-teal-400 hover:underline">aprovai.app/privacidade</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contato e Encarregado de Dados (DPO)</h2>
            <p>
              Para exercer seus direitos, tirar dúvidas ou registrar reclamações sobre o tratamento de dados:
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                <strong className="text-gray-100">E-mail DPO:</strong>{" "}
                <a href="mailto:contato@aprovai360.com.br" className="text-teal-400 hover:underline">
                  contato@aprovai360.com.br
                </a>
              </li>
              <li>
                <strong className="text-gray-100">Suporte geral:</strong>{" "}
                <a href="mailto:contato@aprovai360.com.br" className="text-teal-400 hover:underline">
                  contato@aprovai360.com.br
                </a>
              </li>
            </ul>
            <p className="mt-3">
              Você também pode apresentar reclamações à{" "}
              <strong className="text-gray-100">Autoridade Nacional de Proteção de Dados (ANPD)</strong>{" "}
              em <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">www.gov.br/anpd</a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex gap-6 text-sm text-gray-600">
          <a href="/termos" className="hover:text-gray-400 transition-colors">Termos de Uso</a>
          <a href="/" className="hover:text-gray-400 transition-colors">Voltar para o início</a>
        </div>
      </div>
    </div>
  );
}
