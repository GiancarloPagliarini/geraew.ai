import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é um agente especializado em análise visual de imagens para criação de prompts de IA generativa voltados a conteúdo UGC (User Generated Content) realista de influenciadores.

Sua função: receber UMA imagem e retornar APENAS um JSON válido seguindo EXATAMENTE a estrutura abaixo, preenchendo cada campo com base no que você observa visualmente na imagem.

## ESTRUTURA OBRIGATÓRIA DO JSON DE SAÍDA

{
  "reference_override": "SE uma imagem de referência da pessoa for fornecida junto a este prompt ao modelo de geração, IGNORE completamente todas as descrições físicas faciais contidas em 'character_lock.face_identity' e use a identidade visual da imagem de referência como fonte única de verdade para rosto, traços, estrutura óssea e expressão característica. As descrições físicas textuais existem apenas como fallback para quando nenhuma imagem de referência estiver disponível. Demais campos (cena, roupa, iluminação, pose, câmera, acessórios) devem ser seguidos normalmente.",
  "meta": {
    "aspect_ratio": "string (9:16, 1:1, 16:9 etc)",
    "quality": "ultra_photorealistic",
    "resolution": "8k",
    "camera": "string (ex: câmera frontal do iPhone 15 Pro Max OU câmera traseira do iPhone 15 Pro Max)",
    "lens": "string (ex: 24mm grande angular, 26mm principal, 77mm telefoto)",
    "style": "string descritiva do estilo fotográfico"
  },
  "character_lock": {
    "identity_source": "",
    "face_identity": ["array com 1 string longa descrevendo rosto: formato, sobrancelhas, olhos, nariz, boca, dentes, maçãs do rosto, queixo, assimetrias naturais, SEM NOMES PRÓPRIOS"],
    "regras_de_aparencia": {
      "descricao_geral": "string (cabelo, tom de pele, textura de pele, maquiagem)",
      "marcas_e_acessorios": "string (piercings, brincos, tatuagens, colares — apenas o que está visível)"
    }
  },
  "cena": {
    "local": "string descritiva do local",
    "ambiente": ["array de strings com elementos do cenário"],
    "atmosfera": "string descrevendo o mood"
  },
  "iluminacao": {
    "tipo": "string (ex: luz natural diurna, golden hour, dia nublado)",
    "luz_principal": "string",
    "luz_de_preenchimento": "string",
    "contraste": "string (baixo, médio, médio-alto, alto)",
    "evitar": ["array com estilos de luz que NÃO devem aparecer — sempre bloquear estúdio, ring light, aparência profissional"]
  },
  "perspectiva_da_camera": {
    "pov": "string (selfie de mão próxima ao rosto, selfie de braço estendido, foto tirada por terceiro)",
    "angulo": "string (high angle, low angle, altura dos olhos)",
    "distancia": "string (close-up, meio corpo, full body shot)",
    "visibilidade_do_celular": "string (celular não visível / celular visível no reflexo)"
  },
  "assunto": {
    "genero": "string",
    "idade": "string (ex: adulto jovem 22-27)",
    "vibe": "string descritiva da personalidade transmitida",
    "textura_pele": "string detalhada sobre poros, sardas, brilho, suor",
    "expressao": {
      "olhos": "string",
      "boca": "string",
      "emocao": "string"
    },
    "pose": {
      "posicao": "string",
      "apoio": "string",
      "mao": "string detalhando o que as mãos fazem, incluindo unhas"
    },
    "roupa": {
      "blusa": {
        "tipo": "string",
        "caimento": "string",
        "detalhes": "string detalhada com cor, estampa, material"
      },
      "extra": ["array com acessórios, calça, sapato, bolsa, props na mão"]
    }
  },
  "qualidade_da_imagem": {
    "foco": "string",
    "granulacao": "string",
    "nitidez": "string (sempre enfatizar que NÃO é extremamente nítida, é lo-fi)",
    "realismo": "string (sempre enfatizar que parece foto real de iPhone postada no Instagram)",
    "artefatos_de_sensor": "string",
    "distorcao_de_lente": "string",
    "pos_processamento": "string"
  }
}

## REGRAS CRÍTICAS

1. RETORNE APENAS O JSON. Sem markdown, sem \`\`\`json, sem texto antes ou depois, sem explicações. Apenas o objeto JSON puro começando com { e terminando com }.
2. O CAMPO "reference_override" DEVE SER INCLUÍDO SEMPRE, exatamente como especificado acima, sem alterações. Ele é uma instrução condicional que orienta o modelo de geração a ignorar descrições físicas textuais quando uma imagem de referência for fornecida junto ao prompt.
3. DETECÇÃO DE SELFIE vs FOTO POR TERCEIRO: selfie tem braço visível, enquadramento apertado, leve distorção de grande angular. Foto por terceiro: full body, ângulos impossíveis de selfie. Isso define se "camera" é frontal ou traseira.
4. CHARACTER_LOCK descritivo e ancorado como fallback textual. Nunca use nomes próprios.
5. ILUMINAÇÃO em "evitar" sempre bloqueie estúdio, ring light, aparência profissional, flash estourado.
6. TEXTURA DE PELE reflete o contexto (suor, brilho, rubor, fosca).
7. ROUPA com cores precisas e textos legíveis literais.
8. NEGATIVE IMPLÍCITO em "qualidade_da_imagem": NÃO CGI, NÃO 3D, NÃO estúdio. SEMPRE foto real de celular.
9. SE CONTEÚDO INAPROPRIADO, retorne apenas: {"error": "conteudo_inapropriado"}

Analise a imagem enviada e retorne APENAS o JSON correspondente, sempre incluindo o campo "reference_override" no topo com o texto exato especificado.`;

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

function detectMediaType(dataUrl: string): { media_type: MediaType; data: string } | null {
  const match = dataUrl.match(/^data:(image\/(jpeg|png|webp|gif));base64,(.+)$/);
  if (!match) return null;
  return { media_type: match[1] as MediaType, data: match[3] };
}

function compileToString(json: any): string {
  const parts: string[] = [];
  if (json.reference_override) parts.push(`[reference_override]: ${json.reference_override}`);
  const m = json.meta || {};
  parts.push(`${m.quality || 'ultra_photorealistic'}, ${m.resolution || '8k'}, ${m.camera || ''}, ${m.lens || ''}, ${m.style || ''}`);
  const cl = json.character_lock || {};
  if (Array.isArray(cl.face_identity)) parts.push(cl.face_identity.join(' '));
  if (cl.regras_de_aparencia) parts.push(`${cl.regras_de_aparencia.descricao_geral || ''} ${cl.regras_de_aparencia.marcas_e_acessorios || ''}`);
  const c = json.cena || {};
  parts.push(`${c.local || ''}, ${(c.ambiente || []).join(', ')}, atmosfera ${c.atmosfera || ''}`);
  const il = json.iluminacao || {};
  parts.push(`iluminação ${il.tipo || ''}, ${il.luz_principal || ''}, ${il.luz_de_preenchimento || ''}, contraste ${il.contraste || ''}, evitar ${(il.evitar || []).join(', ')}`);
  const p = json.perspectiva_da_camera || {};
  parts.push(`${p.pov || ''}, ${p.angulo || ''}, ${p.distancia || ''}, ${p.visibilidade_do_celular || ''}`);
  const a = json.assunto || {};
  parts.push(`${a.genero || ''} ${a.idade || ''}, vibe ${a.vibe || ''}${a.textura_pele ? ', pele ' + a.textura_pele : ''}`);
  if (a.expressao) parts.push(`olhos ${a.expressao.olhos || ''}, boca ${a.expressao.boca || ''}, emoção ${a.expressao.emocao || ''}`);
  if (a.pose) parts.push(`pose ${a.pose.posicao || ''}, apoio ${a.pose.apoio || ''}, mãos ${a.pose.mao || ''}`);
  if (a.roupa?.blusa) parts.push(`vestindo ${a.roupa.blusa.tipo || ''} ${a.roupa.blusa.caimento || ''}, ${a.roupa.blusa.detalhes || ''}`);
  if (a.roupa?.extra) parts.push((a.roupa.extra || []).join(', '));
  const q = json.qualidade_da_imagem || {};
  parts.push(`${q.foco || ''}, ${q.granulacao || ''}, ${q.nitidez || ''}, ${q.realismo || ''}, ${q.artefatos_de_sensor || ''}, ${q.distorcao_de_lente || ''}, ${q.pos_processamento || ''}`);
  return parts.filter(Boolean).map(s => s.trim().replace(/\s+/g, ' ')).join(', ');
}

function applyVideoMode(json: any) {
  if (json?.character_lock) delete json.character_lock.face_identity;
  if (json?.assunto) {
    delete json.assunto.textura_pele;
    json.assunto = {
      genero: json.assunto.genero,
      idade: json.assunto.idade,
      vibe: json.assunto.vibe,
      pose: json.assunto.pose,
      expressao: { emocao: json.assunto.expressao?.emocao },
      roupa: json.assunto.roupa,
    };
  }
  return json;
}

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'missing_api_key' }, { status: 500 });

    const body = await request.json();
    const { image, modoVideo } = body as { image: string; modoVideo?: boolean };
    if (!image) return NextResponse.json({ error: 'image_required' }, { status: 400 });

    let imageBlock: any;
    if (image.startsWith('data:')) {
      const parsed = detectMediaType(image);
      if (!parsed) return NextResponse.json({ error: 'invalid_image_format' }, { status: 400 });
      const sizeBytes = (parsed.data.length * 3) / 4;
      if (sizeBytes > 5 * 1024 * 1024) return NextResponse.json({ error: 'image_too_large' }, { status: 400 });
      imageBlock = { type: 'image', source: { type: 'base64', media_type: parsed.media_type, data: parsed.data } };
    } else if (/^https?:\/\//.test(image)) {
      imageBlock = { type: 'image', source: { type: 'url', url: image } };
    } else {
      return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const callClaude = async (extraUserText?: string) => {
      const res = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        temperature: 0.2,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              imageBlock,
              { type: 'text', text: extraUserText || 'Analise esta imagem e retorne APENAS o JSON.' },
            ],
          },
        ],
      });
      const textBlock = res.content.find((b: any) => b.type === 'text') as any;
      return textBlock?.text || '';
    };

    let raw = await callClaude();
    let json: any;
    try {
      json = extractJson(raw);
    } catch (err: any) {
      try {
        raw = await callClaude(`O JSON anterior falhou a validação: ${err.message}. Retorne APENAS o JSON corrigido seguindo a estrutura obrigatória.`);
        json = extractJson(raw);
      } catch {
        return NextResponse.json({ error: 'invalid_json_from_model', raw }, { status: 502 });
      }
    }

    if (json?.error === 'conteudo_inapropriado') {
      return NextResponse.json({ error: 'conteudo_inapropriado' }, { status: 400 });
    }

    if (modoVideo) json = applyVideoMode(json);

    const compiledPrompt = compileToString(json);

    return NextResponse.json({ json, compiledPrompt });
  } catch (err: any) {
    console.error('[prompt-agent]', err);
    return NextResponse.json({ error: 'internal_error', message: err?.message }, { status: 500 });
  }
}
