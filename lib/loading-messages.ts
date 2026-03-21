import { useEffect, useState } from 'react';

const messages = {
  editor: [
    'Afiando os pixels...',
    'Acordando a IA, ela dormiu tarde...',
    'Preparando a tela em branco (mas com estilo)...',
    'Carregando criatividade artificial...',
    'Esquentando os neurônios digitais...',
    'Organizando os pincéis virtuais...',
    'A IA tá tomando café, já volta...',
    'Gerando inspiração do zero...',
  ],
  perfil: [
    'Procurando seus dados no metaverso...',
    'Stalkeando seu próprio perfil...',
    'Carregando sua ficha criminal criativa...',
    'Puxando seu histórico de genialidade...',
    'Verificando se você ainda é você...',
    'Consultando o oráculo sobre sua conta...',
    'Desembaralhandos seus dados...',
    'Seu perfil tá se arrumando, espera...',
  ],
  login: [
    'Abrindo o portão secreto...',
    'Verificando se você é humano (ou IA)...',
    'Procurando a chave debaixo do tapete...',
    'Conectando aos servidores da criatividade...',
  ],
  creditos: [
    'Contando moedas virtuais...',
    'Consultando o cofre da IA...',
    'Calculando sua fortuna criativa...',
    'Sacudindo o cofrinho digital...',
    'Verificando se a IA aceitou seu Pix...',
    'Abrindo a carteira de créditos...',
  ],
  uso: [
    'Vasculhando seu histórico de crimes criativos...',
    'Contando quantas vezes você culpou a IA...',
    'Arqueologando suas gerações antigas...',
    'Destrinchando seus gastos com estilo...',
    'Recuperando os recibos do passado...',
    'Abrindo o livro-caixa da criatividade...',
    'Juntando todas as provas de uso...',
    'Auditando sua conta sem julgamentos...',
  ],
};

type PageKey = keyof typeof messages;

export function useLoadingMessage(page: PageKey): string | null {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const list = messages[page];
    setMsg(list[Math.floor(Math.random() * list.length)]);
  }, [page]);

  return msg;
}
