'use client';

import {
  Type, Copy, Check, X, ImageIcon, Film, ChevronDown,
  Camera, Sparkles, RefreshCw, Users, Shirt, Target, Hand, Clapperboard, Gem,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';

interface Prompt {
  id: string;
  type: string;
  prompt: string;
  image?: string;
}

interface Category {
  id: string;
  title: string;
  prompts: Prompt[];
}

interface Section {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  categories: Category[];
}

const promptSections: Section[] = [
  // =============================================
  // SECAO 1: PROMPTS REALISMO
  // =============================================
  {
    id: 'fotos-realistas',
    icon: Camera,
    title: 'Prompts Realismo',
    description: 'Prompts otimizados para gerar diferentes tipos de mulheres com aparência ultra-realista',
    categories: [
      {
        id: 'ruiva',
        title: 'Ruiva — Todas as Variações',
        prompts: [
          {
            id: 'ruiva-rosto',
            type: 'ROSTO',
            prompt: 'Hyper-realistic portrait photo of a young woman, 25 years old, European, fair skin with light freckles, long wavy red ginger hair, natural makeup, neutral expression, green eyes, looking at camera, soft natural daylight, natural skin texture with visible pores, subtle skin imperfections, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'ruiva-corpo',
            type: 'CORPO INTEIRO',
            prompt: 'Full body hyper-realistic photo of a young woman, 25 years old, European, fair skin with light freckles, long wavy red ginger hair, standing in urban street, wearing casual jeans and white t-shirt, relaxed natural pose, soft daylight, natural skin texture, green eyes, shot on iPhone 15 Pro, wide angle lens, 8k resolution, ultra detailed',
          },
          {
            id: 'ruiva-lifestyle',
            type: 'LIFESTYLE',
            prompt: 'Candid hyper-realistic photo of a young woman, 25 years old, European, fair skin with light freckles, long wavy red ginger hair, sitting at a coffee shop, natural relaxed moment, wearing cozy sweater, golden hour lighting, lifestyle photography, green eyes, natural skin texture with visible pores, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'ruiva-produto',
            type: 'SEGURANDO PRODUTO',
            prompt: 'Hyper-realistic photo of a young woman, 25 years old, European, fair skin with light freckles, long wavy red ginger hair, holding skincare bottle near her face, soft smile, green eyes, looking at camera, clean minimal background, soft natural lighting, natural skin texture, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'ruiva-selfie',
            type: 'SELFIE',
            prompt: 'Hyper-realistic selfie photo of a young woman, 25 years old, European, fair skin with light freckles, long wavy red ginger hair, taking a mirror selfie, soft smile, green eyes, wearing casual outfit, natural bedroom lighting, authentic vibe, natural skin texture with visible pores, shot on iPhone 15 Pro front camera, 8k resolution, ultra detailed',
          },
        ],
      },
      {
        id: 'negra',
        title: 'Negra — Todas as Variações',
        prompts: [
          {
            id: 'negra-rosto',
            type: 'ROSTO',
            prompt: 'Hyper-realistic portrait photo of a young woman, 24 years old, African American, dark brown skin, long black braids, natural makeup, neutral expression, brown eyes, looking at camera, soft natural lighting, natural skin texture with visible pores, subtle skin imperfections, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'negra-corpo',
            type: 'CORPO INTEIRO',
            prompt: 'Full body hyper-realistic photo of a young woman, 24 years old, African American, dark brown skin, long black braids, standing in modern apartment, wearing elegant black dress, relaxed natural pose, soft daylight, natural skin texture, brown eyes, shot on iPhone 15 Pro, wide angle lens, 8k resolution, ultra detailed',
          },
          {
            id: 'negra-lifestyle',
            type: 'LIFESTYLE',
            prompt: 'Candid hyper-realistic photo of a young woman, 24 years old, African American, dark brown skin, long black braids, sitting at a minimalist cafe, natural relaxed moment, wearing casual chic outfit, golden hour lighting, lifestyle photography, brown eyes, natural skin texture with visible pores, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'negra-produto',
            type: 'SEGURANDO PRODUTO',
            prompt: 'Hyper-realistic photo of a young woman, 24 years old, African American, dark brown skin, long black braids, holding makeup palette near her face, soft smile, brown eyes, looking at camera, clean minimal background, soft natural lighting, natural skin texture, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'negra-selfie',
            type: 'SELFIE',
            prompt: 'Hyper-realistic selfie photo of a young woman, 24 years old, African American, dark brown skin, long black braids, taking a mirror selfie, confident smile, brown eyes, wearing trendy outfit, natural bedroom lighting, authentic vibe, natural skin texture with visible pores, shot on iPhone 15 Pro front camera, 8k resolution, ultra detailed',
          },
        ],
      },
      {
        id: 'morena',
        title: 'Morena — Todas as Variações',
        prompts: [
          {
            id: 'morena-rosto',
            type: 'ROSTO',
            prompt: 'Hyper-realistic portrait photo of a young woman, 24 years old, Brazilian, olive tan skin, long wavy brown hair, natural makeup, soft neutral expression, hazel eyes, looking at camera, soft natural outdoor lighting, natural skin texture with visible pores, subtle skin imperfections, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'morena-corpo',
            type: 'CORPO INTEIRO',
            prompt: 'Full body hyper-realistic photo of a young woman, 24 years old, Brazilian, olive tan skin, long wavy brown hair, standing on beach boardwalk, wearing summer dress, relaxed natural pose, golden hour lighting, natural skin texture, hazel eyes, shot on iPhone 15 Pro, wide angle lens, 8k resolution, ultra detailed',
          },
          {
            id: 'morena-lifestyle',
            type: 'LIFESTYLE',
            prompt: 'Candid hyper-realistic photo of a young woman, 24 years old, Brazilian, olive tan skin, long wavy brown hair, sitting at a rooftop bar, natural relaxed moment, wearing casual linen outfit, sunset lighting, lifestyle photography, hazel eyes, natural skin texture with visible pores, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'morena-produto',
            type: 'SEGURANDO PRODUTO',
            prompt: 'Hyper-realistic photo of a young woman, 24 years old, Brazilian, olive tan skin, long wavy brown hair, holding sunscreen bottle near her face, soft smile, hazel eyes, looking at camera, beach background slightly blurred, soft natural lighting, natural skin texture, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'morena-selfie',
            type: 'SELFIE',
            prompt: 'Hyper-realistic selfie photo of a young woman, 24 years old, Brazilian, olive tan skin, long wavy brown hair, taking a mirror selfie, warm smile, hazel eyes, wearing bikini top, natural beach house lighting, authentic vibe, natural skin texture with visible pores, shot on iPhone 15 Pro front camera, 8k resolution, ultra detailed',
          },
        ],
      },
      {
        id: 'loira',
        title: 'Loira — Todas as Variações',
        prompts: [
          {
            id: 'loira-rosto',
            type: 'ROSTO',
            prompt: 'Hyper-realistic portrait photo of a young woman, 25 years old, European, fair light skin, long straight blonde hair, natural makeup, neutral expression, blue eyes, looking at camera, soft natural daylight, natural skin texture with visible pores, subtle skin imperfections, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'loira-corpo',
            type: 'CORPO INTEIRO',
            prompt: 'Full body hyper-realistic photo of a young woman, 25 years old, European, fair light skin, long straight blonde hair, standing in luxury hotel lobby, wearing elegant beige outfit, relaxed natural pose, soft indoor lighting, natural skin texture, blue eyes, shot on iPhone 15 Pro, wide angle lens, 8k resolution, ultra detailed',
          },
          {
            id: 'loira-lifestyle',
            type: 'LIFESTYLE',
            prompt: 'Candid hyper-realistic photo of a young woman, 25 years old, European, fair light skin, long straight blonde hair, sitting at a Parisian cafe, natural relaxed moment, wearing chic blazer, soft morning light, lifestyle photography, blue eyes, natural skin texture with visible pores, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'loira-produto',
            type: 'SEGURANDO PRODUTO',
            prompt: 'Hyper-realistic photo of a young woman, 25 years old, European, fair light skin, long straight blonde hair, holding luxury handbag, soft smile, blue eyes, looking at camera, clean minimal white background, soft studio lighting, natural skin texture, shot on iPhone 15 Pro, portrait mode, 8k resolution, ultra detailed',
          },
          {
            id: 'loira-selfie',
            type: 'SELFIE',
            prompt: 'Hyper-realistic selfie photo of a young woman, 25 years old, European, fair light skin, long straight blonde hair, taking a mirror selfie, soft smile, blue eyes, wearing casual elegant outfit, natural apartment lighting, authentic vibe, natural skin texture with visible pores, shot on iPhone 15 Pro front camera, 8k resolution, ultra detailed',
          },
        ],
      },
    ],
  },

  // =============================================
  // SECAO 2: PROMPTS PELE PERFEITA
  // =============================================
  {
    id: 'qualidade-pele',
    icon: Sparkles,
    title: 'Prompts Pele Perfeita',
    description: 'Prompts para aprimorar a textura e qualidade da pele nas imagens com realismo fotográfico',
    categories: [
      {
        id: 'pele-realista',
        title: 'Pele Ultra-Realista',
        prompts: [
          {
            id: 'pele-realista',
            type: 'REALISMO FOTOGRÁFICO',
            prompt: 'Enhance the uploaded image into ultra-detailed, photorealistic realism while preserving its original composition, emotion, and identity. Do not beautify, stylize, or idealize the subject. Introduce authentic real-world imperfections: natural asymmetry in facial features and body posture, subtle unevenness in eyes, eyebrows, lips, and bone structure. Add realistic skin texture with visible pores, fine lines, tiny blemishes, slight discoloration, uneven tones, and micro-shadows. Avoid smooth or plastic skin completely. Improve clarity and depth without over-sharpening. Enhance micro-details such as individual hair strands, flyaways, fabric fibers, wrinkles, dust, wear, fingerprints, reflections, and environmental imperfections appropriate to the scene. Replace artificial or "AI" lighting with believable real-life lighting based on the scene: natural falloff, imperfect shadows, soft highlights, realistic contrast, and subtle light color shifts. Lighting should feel accidental.',
          },
        ],
      },
    ],
  },

  // =============================================
  // SECAO 3: FACE SWAP
  // =============================================
  // {
  //   id: 'face-swap',
  //   icon: RefreshCw,
  //   title: 'Face Swap',
  //   description: 'Prompts para trocar rostos em imagens de forma realista',
  //   categories: [
  //     {
  //       id: 'face-swap-basico',
  //       title: 'Face Swap — Troca de Rosto',
  //       prompts: [
  //         {
  //           id: 'face-swap-pose',
  //           type: 'POSE E ROUPA',
  //           prompt: 'Recreate the scene in Image 2 (clothing, body pose, and setting) replacing the person with the woman in Image 1. The skin tone in Image 1 must be applied evenly across the entire body\u2014face, neck, arms, hands, legs, and any visible skin areas\u2014ensuring absolute consistency in coloring. Facial features, face shape, hair, and expression must be preserved with complete fidelity to Image 1. The integration between face and body must be perfect in lighting, shadows, skin texture, and anatomical proportions, resulting in a photorealistic image indistinguishable from an authentic photo.',
  //         },
  //       ],
  //     },
  //   ],
  // },

  // =============================================
  // SECAO 4: REFERENCE LOOKALIKE
  // =============================================
  // {
  //   id: 'reference-lookalike',
  //   icon: Users,
  //   title: 'Reference Lookalike',
  //   description: 'Crie influenciadoras baseadas em referências visuais',
  //   categories: [
  //     {
  //       id: 'reference-lookalike-base',
  //       title: 'Referência Visual',
  //       prompts: [
  //         {
  //           id: 'reference-lookalike-prompt',
  //           type: 'LOOKALIKE',
  //           prompt: 'I would like a woman who looks like the one in the photo.',
  //         },
  //       ],
  //     },
  //   ],
  // },

  // =============================================
  // SECAO 5: PROVADOR VIRTUAL
  // =============================================
  // {
  //   id: 'virtual-tryon',
  //   icon: Shirt,
  //   title: 'Provador Virtual',
  //   description: 'Prompts para vestir roupas em pessoas de forma realista',
  //   categories: [
  //     {
  //       id: 'tryon-multiplas-pecas',
  //       title: 'Combinar Múltiplas Peças',
  //       prompts: [
  //         {
  //           id: 'tryon-multiplas',
  //           type: 'MÚLTIPLAS PEÇAS',
  //           prompt: 'Dress the woman in Image 1 with all the clothing items sent in the other images, combining them into a single complete and coherent look. Each piece should fit the woman\'s body naturally, respecting her proportions, curves, and posture\u2014with realistic draping, including folds, pleats, fabric texture, and shading consistent with the lighting in the scene. The pieces should work harmoniously together, with natural overlaps and fits (e.g., blouse tucked into pants, jacket over blouse, accessories positioned correctly). Skin tone should remain uniform across all visible areas of the body. The face, features, hair, facial expression, and scenery/background of Image 1 must be preserved with complete fidelity. The final result should look like a real photo of the same woman wearing that complete outfit, without any signs of editing or artificial overlays.',
  //         },
  //       ],
  //     },
  //     {
  //       id: 'tryon-look-completo',
  //       title: 'Transferir Look Completo',
  //       prompts: [
  //         {
  //           id: 'tryon-look-completo',
  //           type: 'LOOK COMPLETO',
  //           prompt: 'Dress the person in Image 1 with the complete outfit shown in Image 2. Transfer the entire look exactly as it appears in the reference image, including all clothing items, accessories, and styling details. The outfit should fit the person\'s body naturally, respecting their unique proportions, body shape, curves, and posture. Adapt the clothing to their body type with realistic draping, folds, wrinkles, fabric texture, and shadows that match the lighting conditions of Image 1. The outfit should look like it was tailored for this person, maintaining the original style, colors, patterns, and design details from Image 2, but adjusted to fit this specific body perfectly. Preserve the face, facial features, hair, skin tone, expression, and complete background/scenery from Image 1 with absolute fidelity. The final result must look like an authentic, unedited photograph of this person naturally wearing that exact outfit.',
  //         },
  //       ],
  //     },
  //     {
  //       id: 'tryon-promover-produto',
  //       title: 'Promover Produto',
  //       prompts: [
  //         {
  //           id: 'tryon-promover-produto',
  //           type: 'FOTO PROMOCIONAL',
  //           prompt: 'Image 1 is the reference person. Image 2 is the product. Recreate the person in Image 1 holding the product in Image 2 in a natural and promotional way, as if they were doing a professional promotion for social media or advertising. The product must remain completely faithful to Image 2\u2014same packaging, color, label, logo, shape, and actual proportions. The person should hold or interact with the product in a spontaneous and attractive way, with anatomically correct hand and finger positions, without distortions. The facial expression should convey confidence and connection with the product. The face, features, skin tone (uniform throughout the body), hair, and physical characteristics of Image 1 must be preserved with complete fidelity. Lighting, shadows, and reflections must be consistent between the person and the product, as if both were in the same environment. The result should be a photorealistic image with advertising campaign quality, indistinguishable from a real professional photo, without any signs of editing, collage, or artificial montage.',
  //         },
  //       ],
  //     },
  //   ],
  // },

  // =============================================
  // SECAO 6: PROMOCAO DE PRODUTOS
  // =============================================
  {
    id: 'promocao-produtos',
    icon: Target,
    title: 'Promoção de Produtos',
    description: 'Prompts otimizados para criar fotos promocionais profissionais de produtos com modelos',
    categories: [
      {
        id: 'ugc-segurando-produto',
        title: 'UGC — Segurando Produto',
        prompts: [
          {
            id: 'ugc-segurando-produto-base',
            type: 'UGC NATURAL',
            prompt: 'Realistic photo of the person from [image 1] naturally holding the product from [image 2] in their hand. The person is smiling slightly, looking at the camera in a casual, authentic UGC style. Natural indoor lighting, soft shadows, shot on iPhone, lifestyle photography aesthetic. The product is clearly visible and in focus. No watermarks, no text overlays. The skin tones, lighting, and shadows on the person and product must match seamlessly.',
          },
        ],
      },
      {
        id: 'ugc-selfie-story',
        title: 'UGC — Selfie / Story',
        prompts: [
          {
            id: 'ugc-selfie-story-base',
            type: 'SELFIE STYLE',
            prompt: 'Casual selfie-style photo of the person from [image 1] holding the product from [image 2] close to their face, smiling genuinely. Shot on iPhone front camera, slightly warm tones, natural daylight from a window. Authentic influencer UGC aesthetic, no filters, no heavy editing.',
          },
        ],
      },
      {
        id: 'ugc-unboxing',
        title: 'UGC — Unboxing',
        prompts: [
          {
            id: 'ugc-unboxing-base',
            type: 'UNBOXING',
            prompt: 'Realistic photo of the person from [image 1] opening a package and holding up the product from [image 2] with an excited expression. Table with packaging materials visible. Natural home environment, warm lighting, UGC content creator style. Shot on smartphone.',
          },
        ],
      },
      {
        id: 'ugc-em-uso',
        title: 'UGC — Em Uso (Skincare, Bebida...)',
        prompts: [
          {
            id: 'ugc-em-uso-base',
            type: 'EM USO UGC',
            prompt: 'Lifestyle photo of the person from [image 1] using/applying the product from [image 2]. Relaxed expression, natural bathroom/kitchen setting, soft natural light. Candid UGC aesthetic, not overly posed. Realistic skin texture and product placement.',
          },
        ],
      },
    ],
  },

  // =============================================
  // SECAO 7: POV PRODUTO
  // =============================================
  {
    id: 'pov-produto',
    icon: Hand,
    title: 'POV Produto',
    description: 'Prompts para gerar fotos em primeira pessoa (POV) segurando produtos com mãos femininas e unhas pintadas',
    categories: [
      {
        id: 'pov-first-person',
        title: 'POV — Mão Feminina com Produto',
        prompts: [
          {
            id: 'pov-produto-feminino',
            type: 'POV FIRST PERSON',
            prompt: 'Realistic first-person POV photo showing the product from [image 1] being held by elegant feminine hands with painted nails. The perspective is from the person\'s own point of view looking down, holding the product with both hands at chest/lap height. The fingers are anatomically perfect \u2014 slim, delicate, and feminine, with well-manicured nails painted in a solid color (light pink, red, nude, or burgundy). The hand skin is smooth, uniform, and realistic with natural texture. The product must maintain full fidelity to the reference image \u2014 same packaging, color, label, logo, shape, and real proportions. The lighting is natural and soft, with coherent shadows between the hands and the product. The background is slightly blurred (soft bokeh) showing a lifestyle setting \u2014 coffee table, bathroom counter, bed, or couch. No watermarks, no text. The final result must look like a real photo taken by a woman holding the product, in a casual and authentic UGC content style for Instagram.',
          },
        ],
      },
    ],
  },

  // =============================================
  // SECAO 8: VIDEO TIKTOK
  // =============================================
  // {
  //   id: 'video-tiktok',
  //   icon: Clapperboard,
  //   title: 'Vídeo TikTok',
  //   description: 'Copie o prompt e envie junto com a imagem (mãos + produto) para uma IA de texto gerar o prompt do vídeo',
  //   categories: [
  //     {
  //       id: 'tiktok-pov-shop',
  //       title: 'POV — Divulgação TikTok Shop',
  //       prompts: [
  //         {
  //           id: 'tiktok-pov-shop',
  //           type: 'TIKTOK POV SHOP',
  //           prompt: 'I want a POV first-person video to promote this product on TikTok Shop. The video should show only hands \u2014 no face, no body. The hands hold the product and gesture naturally while presenting it, as if showing it to a friend. Analyze the image I am sending and generate the video prompt based on it. The video, hands, product, and background must be faithful to the image sent. If I don\'t send a speech script, create a natural and engaging script in Portuguese. If I send a script, improve it \u2014 make it more natural, add attention hooks, and keep the casual TikTok tone. Each take is a maximum of 8 seconds. If the script is long, split into multiple numbered takes (Take 1, Take 2...), each with its own prompt. The speech script must be embedded inside the video prompt. The video prompt must be in English and the speech in Portuguese.',
  //         },
  //       ],
  //     },
  //   ],
  // },

  // =============================================
  // SECAO 9: MOLDAGEM CORPORAL
  // =============================================
  {
    id: 'moldagem-corporal',
    icon: Gem,
    title: 'Moldagem Corporal',
    description: 'Prompts para gerar corpo inteiro em diferentes ângulos e modificar proporções corporais',
    categories: [
      {
        id: 'corpo-4-angulos',
        title: 'Corpo Inteiro — 4 Ângulos',
        prompts: [
          {
            id: 'corpo-frente',
            type: 'FRENTE',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nFront view \u2014 facing camera directly. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fashion catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, hair, and body proportions as reference image.',
          },
          {
            id: 'corpo-direita',
            type: 'LADO DIREITO',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nRight profile view \u2014 facing right side of frame. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fashion catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, hair, and body proportions as reference image.',
          },
          {
            id: 'corpo-esquerda',
            type: 'LADO ESQUERDO',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nLeft profile view \u2014 facing left side of frame. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fashion catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, hair, and body proportions as reference image.',
          },
          {
            id: 'corpo-costas',
            type: 'COSTAS',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nBack view \u2014 facing away from camera, showing full back of body. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fashion catalog quality, photorealistic, sharp details.\n\nMaintain exact same body proportions, skin tone, and hair as reference image.',
          },
        ],
      },
      {
        id: 'modificacoes-corpo',
        title: 'Modificações Corporais — Porcentagem',
        prompts: [
          {
            id: 'mod-template',
            type: 'TEMPLATE CUSTOMIZÁVEL',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\n[ANGULO] view. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nBODY MODIFICATIONS:\n- [INSERIR MODIFICACOES AQUI]\nExemplos:\n\u2022 Increase glute/buttocks size by X%\n\u2022 Increase thigh size by X%\n\u2022 Decrease waist size by X%\n\u2022 Increase abdominal definition by X%\n\u2022 Increase hip width by X%\n\u2022 Increase arm muscle definition by X%\n\u2022 Increase bust/chest size by X%\n\u2022 Increase shoulder width by X%\n\nAll enhancements should look natural, realistic, and proportional.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fitness catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, and hair as reference image.',
          },
          {
            id: 'mod-fitness',
            type: 'FITNESS INFLUENCER',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nRight profile view \u2014 facing right side of frame. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nBODY MODIFICATIONS:\n- Increase glute/buttocks size by 50%\n- Increase thigh size by 30%\n- Decrease waist size by 15%\n- Increase abdominal definition by 40%\n- Increase arm muscle definition by 25%\n\nAll enhancements should look natural, realistic, and proportional.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fitness catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, and hair as reference image.',
          },
          {
            id: 'mod-curvilinea',
            type: 'CURVILÍNEO (HOURGLASS)',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nFront view \u2014 facing camera directly. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nBODY MODIFICATIONS:\n- Increase glute/buttocks size by 40%\n- Increase hip width by 30%\n- Decrease waist size by 20%\n- Increase bust size by 25%\n\nAll enhancements should look natural, realistic, and proportional.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fashion catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, and hair as reference image.',
          },
          {
            id: 'mod-atletico',
            type: 'ATLÉTICO (ESPORTISTA)',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nFront view \u2014 facing camera directly. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nBODY MODIFICATIONS:\n- Increase thigh size by 25%\n- Increase calf muscle size by 20%\n- Increase abdominal definition by 50%\n- Increase arm muscle definition by 30%\n- Increase shoulder width by 20%\n\nAll enhancements should look natural, realistic, and proportional.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fitness catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, and hair as reference image.',
          },
          {
            id: 'mod-modelo',
            type: 'MODELO (SLIM TONED)',
            prompt: 'Full-body reference photo of this same woman, head to toe.\n\nFront view \u2014 facing camera directly. Neutral standing position, arms relaxed naturally at sides, feet slightly apart. No dynamic pose \u2014 clean model reference style.\n\nBODY MODIFICATIONS:\n- Decrease waist size by 10%\n- Increase abdominal definition by 30%\n- Increase glute/buttocks size by 20%\n- Increase arm muscle definition by 15%\n\nAll enhancements should look natural, realistic, and proportional.\n\nSame clothing/outfit as in the reference image.\n\nPure white background, soft even studio lighting, fashion catalog quality, photorealistic, sharp details.\n\nMaintain exact same face, features, skin tone, and hair as reference image.',
          },
        ],
      },
    ],
  },
];

function countSectionPrompts(section: Section) {
  return section.categories.reduce((acc, cat) => acc + cat.prompts.length, 0);
}

interface PromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptsDialog({ open, onOpenChange }: PromptsDialogProps) {
  const { requestPanelWithPrompt } = useEditor();
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);

  function toggleCategory(categoryId: string) {
    if (!user) {
      toast.error('Faça login para ver os prompts', {
        action: { label: 'Entrar', onClick: () => { window.location.href = '/login'; } },
      });
      return;
    }
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  async function handleCopy(prompt: string, id: string) {
    await navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    toast.success('Prompt copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleOpenPanel(panelType: 'generate-image' | 'generate-video', prompt: string) {
    requestPanelWithPrompt({ panelType, prompt });
  }

  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  const visibleSections = activeSection
    ? promptSections.filter((s) => s.id === activeSection)
    : promptSections;

  return (
    <aside className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <Type className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/60">Fábrica de Prompts</h2>
            <p className="text-xs text-[#f3f0ed]/30">Escolha um prompt e abra em um painel</p>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-[#f3f0ed]/[0.05] overflow-x-auto sidebar-scroll">
        <button
          onClick={() => setActiveSection(null)}
          className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${activeSection === null
            ? 'bg-[#a2dd00]/20 text-[#a2dd00] ring-1 ring-[#a2dd00]/30'
            : 'text-[#f3f0ed]/40 hover:text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5'
            }`}
        >
          Todos
        </button>
        {promptSections.map((section) => {
          const SectionTabIcon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${activeSection === section.id
                ? 'bg-[#a2dd00]/20 text-[#a2dd00] ring-1 ring-[#a2dd00]/30'
                : 'text-[#f3f0ed]/40 hover:text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5'
                }`}
            >
              <SectionTabIcon className="h-3 w-3" />
              {section.title}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-4 py-3 gap-5 overflow-y-auto sidebar-scroll">
        {visibleSections.map((section) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className="flex flex-col gap-3">
              {/* Section header */}
              <div className="flex items-center gap-2">
                <SectionIcon className="h-4 w-4 text-[#f3f0ed]/50" />
                <div>
                  <h3 className="text-xs font-bold text-[#f3f0ed]/70 uppercase tracking-wider">{section.title}</h3>
                  <p className="text-[10px] text-[#f3f0ed]/30">{section.description}</p>
                </div>
              </div>

              {/* Categories */}
              {section.categories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                return (
                  <div
                    key={category.id}
                    className="rounded-xl bg-[#f3f0ed]/[0.03] ring-1 ring-[#f3f0ed]/[0.06] overflow-hidden"
                  >
                    {/* Category header - clickable */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-[#f3f0ed]/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-left">
                          <p className="text-sm font-bold text-[#f3f0ed]/90">{category.title}</p>
                          <p className="text-[10px] text-[#f3f0ed]/30">{category.prompts.length} prompts</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-[#f3f0ed]/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Prompts list */}
                    {isExpanded && (
                      <div className="flex flex-col gap-2 px-3.5 pb-3.5">
                        {category.prompts.map((promptItem) => (
                          <div
                            key={promptItem.id}
                            className="relative rounded-lg overflow-hidden ring-1 ring-[#f3f0ed]/[0.05] aspect-square flex flex-col justify-end"
                          >
                            {/* Background image or placeholder */}
                            {promptItem.image ? (
                              <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${promptItem.image})` }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-[#1e2a2d] via-[#243035] to-[#1a2528]">
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
                                  <ImageIcon className="h-16 w-16" />
                                </div>
                              </div>
                            )}

                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                            {/* Content */}
                            <div className="relative z-10 p-3 flex flex-col gap-2">
                              {/* Prompt type badge */}
                              <span className="self-start text-[10px] font-bold text-[#a2dd00] uppercase tracking-wider bg-[#a2dd00]/15 backdrop-blur-sm px-2 py-0.5 rounded">
                                {promptItem.type}
                              </span>

                              {/* Prompt text */}
                              <p className="text-[11px] text-[#f3f0ed]/70 leading-relaxed line-clamp-3 whitespace-pre-line">
                                {promptItem.prompt}
                              </p>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenPanel('generate-image', promptItem.prompt)}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00]/15 backdrop-blur-sm px-2 py-1.5 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/25 hover:bg-[#a2dd00]/25 transition-colors"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  Imagem
                                </button>
                                <button
                                  onClick={() => handleOpenPanel('generate-video', promptItem.prompt)}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00]/15 backdrop-blur-sm px-2 py-1.5 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/25 hover:bg-[#a2dd00]/25 transition-colors"
                                >
                                  <Film className="h-3 w-3" />
                                  Vídeo
                                </button>
                                <button
                                  onClick={() => handleCopy(promptItem.prompt, promptItem.id)}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#f3f0ed]/50 ring-1 ring-[#f3f0ed]/[0.08] backdrop-blur-sm hover:bg-[#f3f0ed]/10 hover:text-[#f3f0ed]/80 transition-colors"
                                >
                                  {copiedId === promptItem.id ? (
                                    <Check className="h-3 w-3 text-[#a2dd00]" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="flex flex-col gap-1.5 border-t border-[#f3f0ed]/[0.07] pt-3">
          <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/40 uppercase mt-1">
            {visibleSections.reduce((acc, s) => acc + countSectionPrompts(s), 0)} prompts disponíveis
          </span>
        </div>
      </div>
    </aside>
  );
}
