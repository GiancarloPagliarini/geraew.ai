# GeraEW API - Visao Geral para Integracao Frontend

## Base URL

```
http://localhost:3000/api/v1
```

Producao: `https://api.geraew.com/api/v1` (ajustar conforme deploy)

## Autenticacao

Todas as rotas protegidas exigem header:

```
Authorization: Bearer <access_token>
```

- Access token expira em **15 minutos**
- Refresh token expira em **7 dias**
- Rotas marcadas como **[Publica]** nao exigem autenticacao

## Formato de Resposta Padrao

### Sucesso

```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

> `meta` so aparece em endpoints paginados.

### Erro

```json
{
  "statusCode": 402,
  "message": "Creditos insuficientes. Necessario: 480, disponivel: 200.",
  "error": "INSUFFICIENT_CREDITS"
}
```

## Codigos de Erro Customizados

| Codigo | HTTP | Descricao |
|---|---|---|
| `INSUFFICIENT_CREDITS` | 402 | Saldo insuficiente |
| `MAX_CONCURRENT_REACHED` | 429 | Limite de geracoes simultaneas |
| `INVALID_FILE_TYPE` | 400 | Tipo de arquivo nao suportado |
| `FILE_TOO_LARGE` | 400 | Arquivo excede tamanho maximo |
| `GENERATION_FAILED` | 500 | Erro na API externa |
| `GENERATION_TIMEOUT` | 504 | Timeout na geracao |
| `PLAN_UPGRADE_REQUIRED` | 403 | Feature nao disponivel no plano |
| `SUBSCRIPTION_PAST_DUE` | 402 | Pagamento pendente |

## Paginacao

Endpoints paginados aceitam query params:

| Param | Tipo | Default | Descricao |
|---|---|---|---|
| `page` | int | 1 | Pagina (min: 1) |
| `limit` | int | 20 | Itens por pagina (min: 1, max: 100) |
| `sort` | string | - | Ordenacao no formato `campo:asc` ou `campo:desc` |

Resposta paginada:

```typescript
{
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

## Enums

Usar esses valores exatos nas requests:

### GenerationType
```
TEXT_TO_IMAGE | IMAGE_TO_IMAGE | TEXT_TO_VIDEO | IMAGE_TO_VIDEO | MOTION_CONTROL
```

### GenerationStatus
```
PENDING | PROCESSING | COMPLETED | FAILED
```

### Resolution
```
RES_1K | RES_2K | RES_4K | RES_720P | RES_1080P
```

### SubscriptionStatus
```
ACTIVE | CANCELED | PAST_DUE | TRIALING
```

### PaymentStatus
```
PENDING | COMPLETED | FAILED | REFUNDED
```

### PaymentType
```
SUBSCRIPTION | CREDIT_PURCHASE
```

### CreditTransactionType
```
SUBSCRIPTION_RENEWAL | PURCHASE | GENERATION_DEBIT | GENERATION_REFUND | REFERRAL_BONUS | ADMIN_ADJUSTMENT
```

## Swagger Docs

Disponivel em `http://localhost:3000/api/docs`

## Modulos da API

| Modulo | Arquivo de Documentacao | Descricao |
|---|---|---|
| Auth | `01-auth.md` | Registro, login, OAuth Google, tokens |
| Users | `02-users.md` | Perfil do usuario |
| Plans | `03-plans.md` | Listagem de planos |
| Subscriptions | `04-subscriptions.md` | Assinaturas |
| Credits | `05-credits.md` | Saldo, transacoes, pacotes, estimativa |
| Generations | `06-generations.md` | Geracao de imagens e videos |
| Gallery | `07-gallery.md` | Galeria de conteudo gerado |
| Uploads | `08-uploads.md` | Upload de arquivos via presigned URL |
| Admin | `09-admin.md` | Painel administrativo |
