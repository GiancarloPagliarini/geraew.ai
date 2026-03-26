import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: '1. Aceitação dos Termos',
    content: [
      'Ao acessar ou utilizar a plataforma Geraew AI ("Plataforma"), disponível em www.geraew.com.br, você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição aqui prevista, você não deverá utilizar a Plataforma.',
      'A Geraew AI reserva-se o direito de alterar estes Termos a qualquer momento, sendo o usuário notificado por meio da Plataforma ou por e-mail. O uso continuado após a notificação constitui aceitação das alterações.',
    ],
  },
  {
    title: '2. Descrição do Serviço',
    content: [
      'A Geraew AI é uma plataforma online que utiliza tecnologias de inteligência artificial para geração de imagens e vídeos a partir de comandos textuais (prompts) fornecidos pelo usuário. Os serviços podem incluir, entre outros:',
    ],
    list: [
      'Geração de imagens estáticas com base em descrições textuais',
      'Geração e edição de vídeos com auxílio de inteligência artificial',
      'Ferramentas de edição, aprimoramento e personalização de conteúdo visual',
      'Armazenamento temporário de conteúdos gerados na Plataforma',
    ],
  },
  {
    title: '3. Cadastro e Conta do Usuário',
    content: [
      'Para acessar determinadas funcionalidades, o usuário deverá criar uma conta, fornecendo informações verdadeiras, completas e atualizadas. O usuário é integralmente responsável por:',
    ],
    list: [
      'Manter a confidencialidade de suas credenciais de acesso (login e senha)',
      'Todas as atividades realizadas em sua conta',
      'Notificar imediatamente a Geraew AI sobre qualquer uso não autorizado de sua conta',
    ],
    after: 'A Geraew AI reserva-se o direito de suspender ou encerrar contas que violem estes Termos, sem aviso prévio.',
  },
  {
    title: '4. Uso Aceitável da Plataforma',
    content: [
      'O usuário compromete-se a utilizar a Plataforma de maneira ética e em conformidade com a legislação vigente. É expressamente proibido utilizar a Plataforma para:',
    ],
    list: [
      'Gerar conteúdo que envolva pornografia infantil, exploração de menores ou qualquer conteúdo ilícito',
      'Criar imagens ou vídeos de pessoas reais sem o consentimento explícito dessas pessoas',
      'Produzir conteúdo difamatório, discriminatório, que incite violência ou ódio',
      'Gerar conteúdo que viole direitos autorais, marcas registradas ou outros direitos de propriedade intelectual de terceiros',
      'Criar deepfakes ou conteúdos enganosos com o intuito de desinformar ou fraudar',
      'Praticar engenharia reversa, descompilar ou tentar acessar o código-fonte da Plataforma',
      'Utilizar a Plataforma para envio de spam, phishing ou qualquer atividade maliciosa',
      'Sobrecarregar intencionalmente os servidores ou interferir no funcionamento da Plataforma',
    ],
    after: 'A Geraew AI reserva-se o direito de remover qualquer conteúdo que viole estas diretrizes e de suspender ou banir usuários infratores.',
  },
  {
    title: '5. Propriedade Intelectual',
    subsections: [
      {
        title: '5.1. Conteúdo Gerado pelo Usuário',
        content: [
          'O conteúdo gerado pelo usuário por meio da Plataforma (imagens e vídeos) poderá ser utilizado pelo usuário para fins pessoais e comerciais, conforme o plano contratado, observadas as restrições legais aplicáveis.',
          'O usuário reconhece que o conteúdo gerado por inteligência artificial pode não ser protegido por direitos autorais em todas as jurisdições e que a Geraew AI não garante exclusividade sobre o conteúdo gerado.',
        ],
      },
      {
        title: '5.2. Propriedade da Plataforma',
        content: [
          'A Plataforma, incluindo seu design, código-fonte, algoritmos, modelos de IA, logotipos, marcas e demais elementos, é de propriedade exclusiva da Geraew AI, protegida pelas leis de propriedade intelectual aplicáveis.',
        ],
      },
    ],
  },
  {
    title: '6. Planos e Pagamentos',
    content: [
      'A Geraew AI pode oferecer planos gratuitos e pagos. Ao contratar um plano pago, o usuário concorda com os preços e condições vigentes no momento da contratação. As condições específicas de cada plano, incluindo limites de geração, funcionalidades disponíveis e políticas de reembolso, estarão descritas na página de preços da Plataforma.',
      'O não pagamento poderá resultar na suspensão do acesso às funcionalidades do plano contratado.',
    ],
  },
  {
    title: '7. Limitação de Responsabilidade',
    content: [
      'A Geraew AI é fornecida "no estado em que se encontra" (as is). Na máxima extensão permitida por lei, a Geraew AI não se responsabiliza por:',
    ],
    list: [
      'Indisponibilidade temporária da Plataforma ou interrupções no serviço',
      'Conteúdo gerado pela inteligência artificial que possa ser considerado impreciso, ofensivo ou inadequado',
      'Danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso da Plataforma',
      'Perda de dados ou conteúdos armazenados na Plataforma',
      'Uso indevido do conteúdo gerado por terceiros',
    ],
    after: 'O usuário é o único responsável pelo uso que faz do conteúdo gerado na Plataforma.',
  },
  {
    title: '8. Privacidade e Proteção de Dados',
    content: [
      'O tratamento de dados pessoais dos usuários é regido pela nossa Política de Privacidade, que constitui parte integrante destes Termos de Uso. A Geraew AI compromete-se a tratar os dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).',
    ],
  },
  {
    title: '9. Rescisão',
    content: [
      'O usuário pode encerrar sua conta a qualquer momento através das configurações da Plataforma. A Geraew AI pode suspender ou encerrar o acesso do usuário a qualquer momento, em caso de violação destes Termos, sem prejuízo de outras medidas cabíveis.',
      'Após o encerramento, os conteúdos armazenados na conta do usuário poderão ser permanentemente excluídos após o período de retenção previsto na Política de Privacidade.',
    ],
  },
  {
    title: '10. Disposições Gerais',
    content: [
      'Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da Geraew AI para dirimir quaisquer controvérsias oriundas destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.',
      'Caso qualquer cláusula destes Termos seja considerada inválida ou inexequível, as demais cláusulas permanecerão em pleno vigor e efeito.',
    ],
  },
];

export default function TermosDeUsoPage() {
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
          <h1 className="text-3xl font-bold text-white">Termos de Uso</h1>
          <p className="mt-2 text-sm text-white/40">Última atualização: 26 de março de 2026</p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
              <h2 className="mb-4 text-base font-semibold text-white">{section.title}</h2>

              {'subsections' in section && section.subsections ? (
                <div className="flex flex-col gap-5">
                  {section.subsections.map((sub) => (
                    <div key={sub.title}>
                      <h3 className="mb-2 text-sm font-medium text-[#a2dd00]/80">{sub.title}</h3>
                      {sub.content.map((p, i) => (
                        <p key={i} className="text-sm leading-relaxed text-white/60 mb-2 last:mb-0">{p}</p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {'content' in section && section.content?.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-white/60 mb-3">{p}</p>
                  ))}
                  {'list' in section && section.list && (
                    <ul className="mb-3 flex flex-col gap-2">
                      {section.list.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a2dd00]/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {'after' in section && section.after && (
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
          <Link href="/politica-de-privacidade" className="text-xs text-[#a2dd00]/50 hover:text-[#a2dd00]/80 transition-colors">
            Ver Política de Privacidade →
          </Link>
        </div>
      </main>
    </div>
  );
}
