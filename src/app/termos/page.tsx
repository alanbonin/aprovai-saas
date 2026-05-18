export default function TermosPage() {
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

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-gray-500 mb-10">
          AprovAI360 Tecnologia Ltda. — Última atualização: 17 de maio de 2026
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Objeto e Descrição do Serviço</h2>
            <p>
              A <strong className="text-white">AprovAI360 Tecnologia Ltda.</strong>, pessoa jurídica de direito privado,
              desenvolve e opera a plataforma de estudos <strong className="text-white">AprovAI360</strong> (doravante
              "Plataforma"), disponível em <em>aprovai.app</em> e aplicativos associados.
            </p>
            <p className="mt-3">
              A Plataforma oferece ferramentas de preparação para concursos públicos brasileiros, incluindo banco de
              questões comentadas, simulados, revisão espaçada com algoritmo SM-2, mentor de inteligência artificial,
              planos de estudo personalizados, relatórios de desempenho e demais funcionalidades descritas no produto.
            </p>
            <p className="mt-3">
              Ao acessar ou utilizar a Plataforma, o usuário ("Assinante" ou "Usuário") concorda integralmente com
              estes Termos de Uso. Caso não concorde, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Cadastro e Responsabilidades do Usuário</h2>
            <p>
              Para utilizar a Plataforma, o Usuário deve criar uma conta fornecendo nome completo, endereço de
              e-mail válido e senha. O Usuário declara que:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Tem pelo menos 18 (dezoito) anos de idade, ou conta com autorização expressa do responsável legal;</li>
              <li>As informações fornecidas no cadastro são verdadeiras, precisas e atualizadas;</li>
              <li>É o único responsável pela confidencialidade de suas credenciais de acesso;</li>
              <li>Notificará imediatamente a AprovAI360 caso identifique acesso não autorizado à sua conta;</li>
              <li>
                Não utilizará a Plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros.
              </li>
            </ul>
            <p className="mt-3">
              A AprovAI360 reserva-se o direito de suspender ou encerrar contas que apresentem informações falsas
              ou que violem estes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Planos, Pagamentos e Cancelamento</h2>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">3.1 Planos disponíveis</h3>
            <p>
              A Plataforma oferece planos gratuitos e pagos. Os planos pagos concedem acesso a funcionalidades
              adicionais, como maior quantidade de mentoria IA, simulados ilimitados e conteúdos exclusivos.
              Os valores, benefícios e condições de cada plano estão descritos na página de Planos da Plataforma
              e podem ser alterados mediante aviso prévio de 30 (trinta) dias.
            </p>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">3.2 Pagamentos</h3>
            <p>
              Os pagamentos são processados via <strong className="text-white">Mercado Pago</strong>, plataforma
              de pagamentos certificada pelo Banco Central do Brasil. A AprovAI360 não armazena dados de cartão
              de crédito ou informações financeiras sensíveis do Usuário. As assinaturas são cobradas de forma
              recorrente na periodicidade contratada (mensal ou anual), conforme escolha do Usuário no momento
              da aquisição.
            </p>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">3.3 Cancelamento</h3>
            <p>
              O Usuário pode cancelar sua assinatura a qualquer momento pelo painel de configurações da conta.
              O cancelamento não gera reembolso proporcional do período já pago, exceto na hipótese prevista
              no item 3.4 abaixo. Após o cancelamento, o acesso às funcionalidades premium permanece ativo
              até o fim do período vigente.
            </p>

            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-2">3.4 Direito de Arrependimento</h3>
            <p>
              Em conformidade com o art. 49 do Código de Defesa do Consumidor (Lei 8.078/1990), o Usuário
              poderá exercer o direito de arrependimento em até <strong className="text-white">7 (sete) dias
              corridos</strong> contados da data da contratação, mediante solicitação pelo e-mail
              {" "}<a href="mailto:suporte@aprovai.app" className="text-teal-400 hover:underline">suporte@aprovai.app</a>.
              Neste caso, o valor pago será integralmente reembolsado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Uso Aceitável</h2>
            <p>É expressamente vedado ao Usuário:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong className="text-gray-100">Compartilhar conta:</strong> ceder, vender, transferir ou compartilhar
                suas credenciais de acesso com terceiros, seja gratuitamente ou mediante pagamento;
              </li>
              <li>
                <strong className="text-gray-100">Reproduzir conteúdo:</strong> copiar, reproduzir, publicar, distribuir,
                transmitir ou comercializar questões, textos, áudios, vídeos ou qualquer material disponibilizado
                na Plataforma sem autorização prévia e por escrito da AprovAI360;
              </li>
              <li>
                Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da Plataforma;
              </li>
              <li>
                Utilizar bots, scripts, scrapers ou qualquer ferramenta automatizada para acessar ou coletar
                dados da Plataforma;
              </li>
              <li>
                Praticar atos que prejudiquem a infraestrutura, o desempenho ou a segurança da Plataforma
                ou de seus demais usuários;
              </li>
              <li>
                Utilizar a Plataforma de forma que viole leis, regulamentos ou direitos de terceiros.
              </li>
            </ul>
            <p className="mt-3">
              A violação destas regras poderá acarretar suspensão ou encerramento imediato da conta,
              sem reembolso, além das medidas legais cabíveis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo disponibilizado na Plataforma — incluindo, mas não se limitando a, textos,
              questões, gabaritos, comentários, algoritmos, design, logotipos, marcas, software e interfaces —
              é de propriedade exclusiva da AprovAI360 Tecnologia Ltda. ou licenciado por terceiros à
              AprovAI360, sendo protegido pela Lei de Direitos Autorais (Lei 9.610/1998), pela Lei de
              Propriedade Industrial (Lei 9.279/1996) e por demais normas aplicáveis.
            </p>
            <p className="mt-3">
              A contratação de qualquer plano concede ao Usuário uma licença pessoal, intransferível,
              não exclusiva e revogável para acessar e utilizar a Plataforma exclusivamente para fins
              de estudo pessoal, vedada qualquer utilização comercial ou reprodução não autorizada.
            </p>
            <p className="mt-3">
              Questões de concursos públicos reproduzidas na Plataforma são de domínio público conforme
              legislação vigente, porém os comentários, explicações e materiais adicionais são de
              propriedade da AprovAI360.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Limitação de Responsabilidade</h2>
            <p>
              A AprovAI360 envida seus melhores esforços para manter a Plataforma disponível e atualizada,
              porém não garante disponibilidade ininterrupta, ausência de erros ou que o conteúdo esteja
              isento de imprecisões. A Plataforma é fornecida "no estado em que se encontra" (<em>as is</em>).
            </p>
            <p className="mt-3">
              A AprovAI360 não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Aprovação ou reprovação do Usuário em concursos públicos;</li>
              <li>Interrupções decorrentes de manutenção programada, falhas de terceiros ou casos fortuitos;</li>
              <li>Danos indiretos, lucros cessantes ou danos morais decorrentes do uso ou impossibilidade de uso da Plataforma;</li>
              <li>Conteúdo gerado por inteligência artificial que porventura contenha imprecisões — recomendamos sempre verificar as fontes oficiais.</li>
            </ul>
            <p className="mt-3">
              Em qualquer hipótese, a responsabilidade total da AprovAI360 perante o Usuário fica limitada
              ao valor pago pelo Usuário nos últimos 3 (três) meses anteriores ao evento danoso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Privacidade e Proteção de Dados</h2>
            <p>
              O tratamento dos dados pessoais do Usuário é regido pela nossa{" "}
              <a href="/privacidade" className="text-teal-400 hover:underline">Política de Privacidade</a>,
              elaborada em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
              Ao utilizar a Plataforma, o Usuário declara ter lido e concordado com referida Política.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Alterações nos Termos</h2>
            <p>
              A AprovAI360 pode modificar estes Termos a qualquer momento. As alterações relevantes serão
              comunicadas por e-mail ou por aviso na Plataforma com antecedência mínima de 15 (quinze) dias.
              O uso continuado da Plataforma após a entrada em vigor das alterações constitui aceitação dos
              novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Rescisão</h2>
            <p>
              O Usuário pode encerrar sua conta a qualquer momento pelo painel de configurações ou solicitando
              ao suporte. A AprovAI360 pode rescindir o acesso do Usuário imediatamente, sem aviso prévio,
              em caso de violação destes Termos ou por determinação legal. Disposições que, por sua natureza,
              devam sobreviver ao encerramento da conta (como propriedade intelectual e limitação de
              responsabilidade) permanecerão vigentes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Foro e Lei Aplicável</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Para dirimir
              quaisquer controvérsias decorrentes destes Termos, as partes elegem o foro da Comarca de
              Salvador/BA, com exclusão de qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contato</h2>
            <p>
              Em caso de dúvidas, sugestões ou reclamações, entre em contato com nossa equipe:
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                <strong className="text-gray-100">Suporte:</strong>{" "}
                <a href="mailto:suporte@aprovai.app" className="text-teal-400 hover:underline">suporte@aprovai.app</a>
              </li>
              <li>
                <strong className="text-gray-100">Privacidade:</strong>{" "}
                <a href="mailto:privacidade@aprovai.app" className="text-teal-400 hover:underline">privacidade@aprovai.app</a>
              </li>
              <li>
                <strong className="text-gray-100">Empresa:</strong> AprovAI360 Tecnologia Ltda.
              </li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex gap-6 text-sm text-gray-600">
          <a href="/privacidade" className="hover:text-gray-400 transition-colors">Política de Privacidade</a>
          <a href="/" className="hover:text-gray-400 transition-colors">Voltar para o início</a>
        </div>
      </div>
    </div>
  );
}
