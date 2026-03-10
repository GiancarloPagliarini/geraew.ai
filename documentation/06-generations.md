# Generations - Geracao de Imagens e Videos

Base: `/api/v1/generations`

Todas as rotas exigem **autenticacao** (`Authorization: Bearer <token>`).

---

## POST /generations/text-to-image

Gera uma imagem a partir de um prompt de texto.

**Request:**

```json
{
  "prompt": "A futuristic cityscape at sunset, cyberpunk style",
  "negativePrompt": "blurry, low quality",
  "resolution": "RES_2K",
  "aspectRatio": "16:9",
  "outputFormat": "jpg",
  "googleSearch": false,
  "imageModel": "gemini-3.1-pro-preview",
  "parameters": {
    "style": "cinematic",
    "seed": 42
  }
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `prompt` | string | Sim | Prompt de texto (max 20.000 chars) |
| `negativePrompt` | string | Nao | Prompt negativo (max 2.000 chars) |
| `resolution` | Resolution | Sim | `RES_1K`, `RES_2K`, `RES_4K` |
| `aspectRatio` | string | Nao | Proporcao da imagem (default: `"auto"`) |
| `outputFormat` | string | Nao | `"png"` ou `"jpg"` (default: `"jpg"`) |
| `googleSearch` | boolean | Nao | Ativa Google Search para contexto real (default: false) |
| `imageModel` | string | Nao | `"gemini-3.1-pro-preview"` ou `"gemini-3.1-flash-image-preview"` |
| `parameters` | object | Nao | Parametros extras (style, seed, etc.) |

**Valores de `aspectRatio`:**
```
"1:1" | "1:4" | "1:8" | "2:3" | "3:2" | "3:4" | "4:1" | "4:3" | "4:5" | "5:4" | "8:1" | "9:16" | "16:9" | "21:9" | "auto"
```

**Response 201:**

```json
{
  "id": "clx1gen001...",
  "status": "PROCESSING",
  "creditsConsumed": 15
}
```

---

## POST /generations/image-to-image

Gera uma imagem a partir de outra imagem + prompt.

**Request:**

```json
{
  "prompt": "Transform into watercolor painting style",
  "inputImageUrl": "generation_input/550e8400.../photo.jpg",
  "resolution": "RES_2K",
  "aspectRatio": "auto"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `prompt` | string | Sim | Prompt de transformacao (max 20.000 chars) |
| `inputImageUrl` | string | Sim | S3 key ou URL da imagem de input |
| `negativePrompt` | string | Nao | Prompt negativo |
| `resolution` | Resolution | Sim | `RES_1K`, `RES_2K`, `RES_4K` |
| `aspectRatio` | string | Nao | Proporcao |
| `outputFormat` | string | Nao | `"png"` ou `"jpg"` |
| `googleSearch` | boolean | Nao | default: false |
| `imageModel` | string | Nao | Modelo de imagem |
| `parameters` | object | Nao | Parametros extras |

> Use `POST /uploads/presigned-url` para obter a URL de upload do `inputImageUrl` antes de chamar este endpoint.

**Response 201:** Mesmo formato de text-to-image.

---

## POST /generations/text-to-video

Gera um video a partir de texto.

**Request:**

```json
{
  "prompt": "A drone flying over mountains at golden hour",
  "resolution": "RES_1080P",
  "durationSeconds": 5,
  "hasAudio": true,
  "referenceImageUrls": ["generation_input/abc.../ref1.jpg"]
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `prompt` | string | Sim | Prompt para o video (max 5.000 chars) |
| `resolution` | Resolution | Sim | `RES_1080P`, `RES_4K` |
| `durationSeconds` | int | Sim | Duracao em segundos (1-30) |
| `hasAudio` | boolean | Nao | Gerar com audio (default: false) |
| `referenceImageUrls` | string[] | Nao | URLs de imagens de referencia (max 3) |
| `negativePrompt` | string | Nao | Prompt negativo |
| `aspectRatio` | string | Nao | Proporcao |
| `parameters` | object | Nao | Parametros extras |

**Response 201:** Mesmo formato (`id`, `status`, `creditsConsumed`).

---

## POST /generations/image-to-video

Gera um video a partir de uma imagem.

**Request:**

```json
{
  "inputImageUrl": "generation_input/550e8400.../photo.jpg",
  "prompt": "Make the person walk forward slowly",
  "resolution": "RES_1080P",
  "durationSeconds": 5,
  "hasAudio": false,
  "lastFrameUrl": "generation_input/abc.../last-frame.jpg"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `inputImageUrl` | string | Sim | S3 key da imagem de input |
| `prompt` | string | Nao | Prompt para guiar a geracao (max 5.000 chars) |
| `resolution` | Resolution | Sim | `RES_1080P`, `RES_4K` |
| `durationSeconds` | int | Sim | Duracao em segundos (1-30) |
| `hasAudio` | boolean | Nao | Gerar com audio (default: false) |
| `lastFrameUrl` | string | Nao | URL do ultimo frame desejado |
| `negativePrompt` | string | Nao | Prompt negativo |
| `aspectRatio` | string | Nao | Proporcao |
| `parameters` | object | Nao | Parametros extras |

**Response 201:** Mesmo formato.

---

## POST /generations/motion-control

Gera video com motion control (imagem + video de referencia de movimento).

**Request:**

```json
{
  "inputImageUrl": "generation_input/abc.../portrait.jpg",
  "referenceVideoUrl": "reference_video/def.../dance.mp4",
  "resolution": "RES_1080P",
  "durationSeconds": 5
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `inputImageUrl` | string | Sim | S3 key da imagem de input |
| `referenceVideoUrl` | string | Sim | S3 key do video de referencia de movimento |
| `resolution` | Resolution | Sim | `RES_720P`, `RES_1080P` |
| `durationSeconds` | int | Sim | Duracao em segundos (1-30) |
| `negativePrompt` | string | Nao | Prompt negativo |
| `aspectRatio` | string | Nao | Proporcao |
| `parameters` | object | Nao | Parametros extras |

**Response 201:** Mesmo formato.

---

## GET /generations

Lista geracoes do usuario com paginacao e filtros.

**Query params:**

| Param | Tipo | Default | Descricao |
|---|---|---|---|
| `page` | int | 1 | Pagina |
| `limit` | int | 20 | Itens por pagina (max 100) |
| `sort` | string | `created_at:desc` | Ordenacao |
| `type` | GenerationType | - | Filtrar por tipo |
| `status` | GenerationStatus | - | Filtrar por status |
| `favorited` | boolean | - | Filtrar favoritos (`true`/`false`) |

**Exemplo:** `GET /generations?page=1&limit=10&type=TEXT_TO_IMAGE&status=COMPLETED&favorited=true`

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx1gen001...",
      "type": "TEXT_TO_IMAGE",
      "status": "COMPLETED",
      "prompt": "A futuristic cityscape...",
      "negativePrompt": "blurry",
      "inputImageUrl": null,
      "referenceVideoUrl": null,
      "resolution": "RES_2K",
      "durationSeconds": null,
      "hasAudio": false,
      "modelUsed": "gemini-3.1-pro-preview",
      "parameters": { "style": "cinematic" },
      "outputUrl": "https://cdn.geraew.com/outputs/clx1gen001.jpg",
      "thumbnailUrl": null,
      "hasWatermark": false,
      "creditsConsumed": 15,
      "processingTimeMs": 12500,
      "errorMessage": null,
      "errorCode": null,
      "isFavorited": true,
      "createdAt": "2026-03-09T14:30:00.000Z",
      "completedAt": "2026-03-09T14:30:12.500Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

## GET /generations/:id

Retorna detalhes e status de uma geracao especifica. **Use este endpoint para polling.**

**Response 200:** Mesmo formato de um item da listagem acima.

### Fluxo de Polling no Frontend

```typescript
// Apos criar uma geracao
const { id } = await api.post('/generations/text-to-image', payload);

// Polling a cada 3 segundos
const interval = setInterval(async () => {
  const generation = await api.get(`/generations/${id}`);

  if (generation.status === 'COMPLETED') {
    clearInterval(interval);
    // Exibir generation.outputUrl
  }

  if (generation.status === 'FAILED') {
    clearInterval(interval);
    // Exibir generation.errorMessage
    // Creditos ja foram estornados automaticamente
  }
}, 3000);
```

---

## DELETE /generations/:id

Soft delete — remove a geracao da galeria.

**Response 204:** Sem body.

---

## POST /generations/:id/favorite

Marca uma geracao como favorita.

**Response 204:** Sem body.

---

## DELETE /generations/:id/favorite

Remove uma geracao dos favoritos.

**Response 204:** Sem body.

---

## Tipos TypeScript para o Frontend

```typescript
type GenerationType = "TEXT_TO_IMAGE" | "IMAGE_TO_IMAGE" | "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO" | "MOTION_CONTROL";
type GenerationStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
type Resolution = "RES_1K" | "RES_2K" | "RES_4K" | "RES_720P" | "RES_1080P";
type AspectRatio = "1:1" | "1:4" | "1:8" | "2:3" | "3:2" | "3:4" | "4:1" | "4:3" | "4:5" | "5:4" | "8:1" | "9:16" | "16:9" | "21:9" | "auto";

interface Generation {
  id: string;
  type: GenerationType;
  status: GenerationStatus;
  prompt?: string;
  negativePrompt?: string;
  inputImageUrl?: string;
  referenceVideoUrl?: string;
  resolution: Resolution;
  durationSeconds?: number;
  hasAudio: boolean;
  modelUsed?: string;
  parameters?: Record<string, unknown>;
  outputUrl?: string;
  thumbnailUrl?: string;
  hasWatermark: boolean;
  creditsConsumed: number;
  processingTimeMs?: number;
  errorMessage?: string;
  errorCode?: string;
  isFavorited: boolean;
  createdAt: string;
  completedAt?: string;
}

interface CreateGenerationResponse {
  id: string;
  status: GenerationStatus;
  creditsConsumed: number;
}

// Request DTOs
interface TextToImageRequest {
  prompt: string;
  negativePrompt?: string;
  resolution: "RES_1K" | "RES_2K" | "RES_4K";
  aspectRatio?: AspectRatio;
  outputFormat?: "png" | "jpg";
  googleSearch?: boolean;
  imageModel?: "gemini-3.1-pro-preview" | "gemini-3.1-flash-image-preview";
  parameters?: Record<string, unknown>;
}

interface ImageToImageRequest extends TextToImageRequest {
  inputImageUrl: string;
}

interface TextToVideoRequest {
  prompt: string;
  resolution: "RES_1080P" | "RES_4K";
  durationSeconds: number; // 1-30
  hasAudio?: boolean;
  referenceImageUrls?: string[]; // max 3
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  parameters?: Record<string, unknown>;
}

interface ImageToVideoRequest {
  inputImageUrl: string;
  prompt?: string;
  resolution: "RES_1080P" | "RES_4K";
  durationSeconds: number; // 1-30
  hasAudio?: boolean;
  lastFrameUrl?: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  parameters?: Record<string, unknown>;
}

interface MotionControlRequest {
  inputImageUrl: string;
  referenceVideoUrl: string;
  resolution: "RES_720P" | "RES_1080P";
  durationSeconds: number; // 1-30
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  parameters?: Record<string, unknown>;
}

interface GenerationFilters {
  page?: number;
  limit?: number;
  sort?: string;
  type?: GenerationType;
  status?: GenerationStatus;
  favorited?: boolean;
}
```

## Dicas de Implementacao Frontend

1. **Antes de gerar**: chamar `POST /credits/estimate` para mostrar o custo e verificar saldo
2. **Antes de enviar imagens**: usar `POST /uploads/presigned-url` para obter URL de upload
3. **Apos criar geracao**: fazer polling em `GET /generations/:id` a cada 3s
4. **Status COMPLETED**: exibir `outputUrl` (imagem) ou `outputUrl` + `thumbnailUrl` (video)
5. **Status FAILED**: exibir `errorMessage`, creditos ja foram estornados automaticamente
6. **Limites**: verificar `plan.maxConcurrentGenerations` antes de permitir nova geracao
