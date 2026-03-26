import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Introdução',
    content: [
      'A Geraew AI ("nós", "nosso" ou "Plataforma"), disponível em www.geraew.com.br, valoriza e respeita a privacidade de seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos, compartilhamos e protegemos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD – Lei nº 13.709/2018).',
      'Ao utilizar nossa Plataforma, você consente com as práticas descritas nesta Política. Recomendamos a leitura atenta de todo o documento.',
    ],
  },
  {
    title: '2. Dados Pessoais Coletados',
    subsections: [
      {
        title: '2.1. Dados fornecidos pelo usuário',
        content: ['Podemos coletar os seguintes dados quando você se cadastra ou utiliza a Plataforma:'],
        list: [
          'Nome completo',
          'Endereço de e-mail',
          'Informações de perfil (foto, nome de exibição)',
          'Dados de pagamento (processados por gateways de pagamento terceirizados)',
          'Prompts (comandos textuais) inseridos para geração de conteúdo',
        ],
      },
      {
        title: '2.2. Dados coletados automaticamente',
        content: ['Ao acessar a Plataforma, coletamos automaticamente:'],
        list: [
          'Endereço IP e dados de geolocalização aproximada',
          'Tipo de navegador, sistema operacional e dispositivo utilizado',
          'Páginas visitadas, tempo de acesso e interações com a Plataforma',
          'Cookies e tecnologias similares de rastreamento',
          'Dados de uso do serviço (tipo e quantidade de gerações realizadas)',
        ],
      },
      {
        title: '2.3. Dados de terceiros',
        content: [
          'Caso você realize login por meio de serviços de terceiros (como Google ou redes sociais), podemos receber dados básicos de seu perfil conforme autorizado pelo provedor e por você.',
        ],
      },
    ],
  },
  {
    title: '3. Finalidades do Tratamento de Dados',
    content: ['Utilizamos seus dados pessoais para as seguintes finalidades:'],
    list: [
      'Criação e gerenciamento de sua conta na Plataforma',
      'Prestação e melhoria dos serviços de geração de imagens e vídeos com IA',
      'Processamento de pagamentos e gestão de assinaturas',
      'Envio de comunicações sobre o serviço (atualizações, alterações, avisos de segurança)',
      'Envio de comunicações de marketing (com consentimento prévio e opção de descadastro)',
      'Análise de uso e desempenho da Plataforma para melhorias contínuas',
      'Prevenção de fraudes e garantia da segurança da Plataforma',
      'Cumprimento de obrigações legais e regulatórias',
      'Treinamento e aprimoramento dos modelos de inteligência artificial (de forma anonimizada)',
    ],
  },
  {
    title: '4. Bases Legais para o Tratamento',
    content: ['O tratamento dos seus dados pessoais fundamenta-se nas seguintes bases legais previstas na LGPD:'],
    highlights: [
      { label: 'Consentimento', desc: 'quando você autoriza expressamente o tratamento (ex.: marketing)' },
      { label: 'Execução de contrato', desc: 'para prestação dos serviços contratados' },
      { label: 'Legítimo interesse', desc: 'para melhoria da Plataforma e prevenção de fraudes' },
      { label: 'Cumprimento de obrigação legal', desc: 'quando exigido por lei ou regulamentação' },
    ],
  },
  {
    title: '5. Compartilhamento de Dados',
    content: ['Seus dados pessoais poderão ser compartilhados com:'],
    list: [
      'Provedores de serviços de pagamento para processamento de transações financeiras',
      'Provedores de infraestrutura e hospedagem em nuvem',
      'Provedores de modelos de inteligência artificial utilizados na geração de conteúdo',
      'Ferramentas de análise e monitoramento de desempenho',
      'Autoridades competentes, quando exigido por lei ou ordem judicial',
    ],
    after: 'Não vendemos, alugamos ou comercializamos seus dados pessoais a terceiros para fins de marketing. Todos os parceiros e fornecedores estão sujeitos a obrigações contratuais de confidencialidade e proteção de dados.',
  },
  {
    title: '6. Transferência Internacional de Dados',
    content: [
      'Seus dados poderão ser transferidos e armazenados em servidores localizados fora do Brasil, inclusive em países que podem não possuir leis de proteção de dados equivalentes à LGPD. Nesses casos, adotamos medidas de segurança adequadas, como cláusulas contratuais padrão, para garantir a proteção dos seus dados.',
    ],
  },
  {
    title: '7. Armazenamento e Segurança dos Dados',
    content: [
      'Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, destruição, perda, alteração ou tratamento indevido, incluindo:',
    ],
    list: [
      'Criptografia de dados em trânsito (TLS/SSL) e em repouso',
      'Controle de acesso baseado em funções',
      'Monitoramento contínuo de segurança',
    ],
    after: 'Seus dados pessoais serão armazenados pelo tempo necessário para cumprir as finalidades para as quais foram coletados, ou conforme exigido por lei.',
  },
  {
    title: '8. Cookies e Tecnologias de Rastreamento',
    content: ['A Plataforma utiliza cookies e tecnologias similares para:'],
    list: [
      'Manter sua sessão ativa e lembrar suas preferências',
      'Analisar o uso da Plataforma e melhorar a experiência do usuário',
      'Personalizar conteúdo e anúncios (quando aplicável)',
    ],
    after: 'Você pode gerenciar suas preferências de cookies através das configurações do seu navegador. A desativação de determinados cookies pode afetar a funcionalidade da Plataforma.',
  },
  {
    title: '9. Direitos do Titular dos Dados',
    content: ['Em conformidade com a LGPD, você tem direito a:'],
    list: [
      'Confirmação da existência de tratamento de seus dados pessoais',
      'Acesso aos seus dados pessoais',
      'Correção de dados incompletos, inexatos ou desatualizados',
      'Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD',
      'Portabilidade dos dados a outro fornecedor de serviço',
      'Eliminação dos dados pessoais tratados com base no consentimento',
      'Informação sobre com quem seus dados foram compartilhados',
      'Informação sobre a possibilidade de não fornecer consentimento e suas consequências',
      'Revogação do consentimento a qualquer tempo',
    ],
    after: 'Para exercer qualquer desses direitos, entre em contato conosco pelos canais disponíveis na Plataforma. Responderemos à sua solicitação no prazo legal de 15 (quinze) dias.',
  },
  {
    title: '10. Dados de Menores de Idade',
    content: [
      'A Plataforma não é destinada a menores de 18 (dezoito) anos. Não coletamos intencionalmente dados pessoais de menores. Caso tenhamos conhecimento de que dados de um menor foram coletados sem o consentimento adequado, tomaremos as medidas necessárias para excluí-los.',
    ],
  },
  {
    title: '11. Alterações nesta Política',
    content: [
      'Esta Política de Privacidade poderá ser atualizada periodicamente para refletir mudanças em nossas práticas ou na legislação aplicável. A versão atualizada será publicada na Plataforma com a data da última modificação. Recomendamos a consulta periódica deste documento.',
    ],
  },
];

type Subsection = {
  title: string;
  content: string[];
  list?: string[];
};

type Section = {
  title: string;
  content?: string[];
  list?: string[];
  after?: string;
  highlights?: { label: string; desc: string }[];
  subsections?: Subsection[];
};

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#111518] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#111518]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/login" className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
          <Image src="/full_logo.svg" alt="Geraew AI" width={100} height={32} className="mix-blend-lighten" />
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-3 py-1 text-[10px] font-semibold tracking-widest uppercase text-[#a2dd00]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
            Legal
          </div>
          <h1 className="text-3xl font-bold text-white">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-white/40">Última atualização: 26 de março de 2026</p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-8">
          {(sections as Section[]).map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
              <h2 className="mb-4 text-base font-semibold text-white">{section.title}</h2>

              {section.subsections ? (
                <div className="flex flex-col gap-5">
                  {section.subsections.map((sub) => (
                    <div key={sub.title}>
                      <h3 className="mb-2 text-sm font-medium text-[#a2dd00]/80">{sub.title}</h3>
                      {sub.content.map((p, i) => (
                        <p key={i} className="text-sm leading-relaxed text-white/60 mb-2 last:mb-0">{p}</p>
                      ))}
                      {sub.list && (
                        <ul className="mt-2 flex flex-col gap-2">
                          {sub.list.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a2dd00]/60" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {section.content?.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-white/60 mb-3">{p}</p>
                  ))}
                  {section.highlights && (
                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                      {section.highlights.map((h, i) => (
                        <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                          <p className="text-xs font-semibold text-[#a2dd00]/80 mb-1">{h.label}</p>
                          <p className="text-xs text-white/50 leading-relaxed">{h.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {section.list && (
                    <ul className="mb-3 flex flex-col gap-2">
                      {section.list.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a2dd00]/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.after && (
                    <p className="text-sm leading-relaxed text-white/60">{section.after}</p>
                  )}
                </>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-8 text-center">
          <p className="text-xs text-white/25">© 2026 Geraew AI — Todos os direitos reservados.</p>
          <Link href="/termos-de-uso" className="text-xs text-[#a2dd00]/50 hover:text-[#a2dd00]/80 transition-colors">
            Ver Termos de Uso →
          </Link>
        </div>
      </main>
    </div>
  );
}
