# Guia de Integração: SSE para Gerações em Tempo Real

## Contexto

A API agora dispara **Server-Sent Events (SSE)** quando uma geração termina (sucesso ou falha), eliminando a necessidade de polling.

O frontend abre uma conexão SSE após criar uma geração e recebe uma notificação instantânea quando o processamento finaliza.

---

## Endpoints SSE

| Endpoint | Descrição |
|---|---|
| `GET /api/v1/generations/events` | Recebe eventos de **todas** as gerações do usuário |
| `GET /api/v1/generations/:id/events` | Recebe eventos de **uma geração específica** |

Ambos exigem autenticação (JWT Bearer Token).

---

## Formato dos Eventos

### Geração concluída (`completed`)

```json
{
  "userId": "uuid-do-usuario",
  "generationId": "uuid-da-geracao",
  "status": "completed",
  "data": {
    "outputUrls": [
      "https://cdn.exemplo.com/outputs/uuid/output-0.png"
    ],
    "processingTimeMs": 12340
  }
}
```

### Geração com falha (`failed`)

```json
{
  "userId": "uuid-do-usuario",
  "generationId": "uuid-da-geracao",
  "status": "failed",
  "data": {
    "errorMessage": "API timeout",
    "errorCode": "GENERATION_FAILED",
    "creditsRefunded": 15
  }
}
```

---

## Fluxo Completo

```
1. Usuário clica "Gerar"
2. Frontend faz POST /api/v1/generations/generate-image
   → Resposta: { id: "uuid", status: "processing", creditsConsumed: 15 }
3. Frontend mostra estado "Gerando..." com loading/spinner
4. Frontend abre conexão SSE para /api/v1/generations/:id/events
5. Quando receber evento:
   - status "completed" → exibir imagens de data.outputUrls
   - status "failed"    → exibir erro + informar estorno de créditos
6. Fechar conexão SSE
```

---

## Como Conectar

### Autenticação

`EventSource` nativo do browser **não suporta headers customizados**. Por isso, use `fetch` com `ReadableStream` para enviar o token JWT no header `Authorization`.

### Escutar uma geração específica (recomendado)

```javascript
async function listenGeneration(generationId, accessToken, callbacks) {
  const { onCompleted, onFailed, onError } = callbacks;

  try {
    const response = await fetch(
      `/api/v1/generations/${generationId}/events`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SSE connection failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop(); // ultimo item pode estar incompleto

      for (const part of parts) {
        const dataLine = part
          .split('\n')
          .find((line) => line.startsWith('data: '));

        if (!dataLine) continue;

        const event = JSON.parse(dataLine.slice(6));

        if (event.status === 'completed') {
          onCompleted({
            generationId: event.generationId,
            outputUrls: event.data.outputUrls,
            processingTimeMs: event.data.processingTimeMs,
          });
          return; // encerra a conexao
        }

        if (event.status === 'failed') {
          onFailed({
            generationId: event.generationId,
            errorMessage: event.data.errorMessage,
            errorCode: event.data.errorCode,
            creditsRefunded: event.data.creditsRefunded,
          });
          return;
        }
      }
    }
  } catch (error) {
    if (onError) onError(error);
  }
}
```

**Uso:**

```javascript
// Apos criar a geracao
const response = await api.post('/generations/generate-image', formData);
const { id, creditsConsumed } = response.data;

// Mostrar loading
setLoading(true);

// Escutar SSE
listenGeneration(id, accessToken, {
  onCompleted: ({ outputUrls, processingTimeMs }) => {
    setLoading(false);
    setOutputImages(outputUrls);
    showToast(`Gerado em ${(processingTimeMs / 1000).toFixed(1)}s`);
  },
  onFailed: ({ errorMessage, creditsRefunded }) => {
    setLoading(false);
    showError(`Falha: ${errorMessage}`);
    showToast(`${creditsRefunded} créditos devolvidos`);
  },
  onError: (error) => {
    // Fallback para polling se SSE falhar
    console.warn('SSE falhou, usando polling:', error);
    startPolling(id);
  },
});
```

### Escutar todas as gerações (para dashboard/lista)

Útil quando o usuário tem várias gerações simultâneas:

```javascript
async function listenAllGenerations(accessToken, onEvent) {
  const response = await fetch('/api/v1/generations/events', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'text/event-stream',
    },
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();

    for (const part of parts) {
      const dataLine = part
        .split('\n')
        .find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      onEvent(JSON.parse(dataLine.slice(6)));
    }
  }
}
```

**Uso:**

```javascript
// Na pagina de lista/galeria
listenAllGenerations(accessToken, (event) => {
  const { generationId, status, data } = event;

  // Atualizar o item correspondente na lista
  updateGenerationInList(generationId, {
    status,
    outputUrls: data.outputUrls,
    errorMessage: data.errorMessage,
  });
});
```

---

## Fallback para Polling

Se a conexão SSE falhar (rede instável, proxy que não suporta SSE, etc.), fazer fallback para polling:

```javascript
function startPolling(generationId, accessToken, callbacks, intervalMs = 3000) {
  const { onCompleted, onFailed } = callbacks;

  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/v1/generations/${generationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      const generation = data.data || data;

      if (generation.status === 'completed') {
        clearInterval(interval);
        onCompleted({
          generationId: generation.id,
          outputUrls: generation.outputs.map((o) => o.url),
          processingTimeMs: generation.processingTimeMs,
        });
      }

      if (generation.status === 'failed') {
        clearInterval(interval);
        onFailed({
          generationId: generation.id,
          errorMessage: generation.errorMessage,
          errorCode: generation.errorCode,
          creditsRefunded: generation.creditsConsumed,
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, intervalMs);

  // Retorna funcao para cancelar
  return () => clearInterval(interval);
}
```

---

## Implementação Completa com Fallback Automático

```javascript
function watchGeneration(generationId, accessToken, callbacks) {
  const TIMEOUT_MS = 60000; // 1 minuto sem resposta = fallback
  let timeoutId;

  // Tentar SSE primeiro
  listenGeneration(generationId, accessToken, {
    onCompleted: (result) => {
      clearTimeout(timeoutId);
      callbacks.onCompleted(result);
    },
    onFailed: (result) => {
      clearTimeout(timeoutId);
      callbacks.onFailed(result);
    },
    onError: () => {
      clearTimeout(timeoutId);
      // SSE falhou, usar polling
      startPolling(generationId, accessToken, callbacks);
    },
  });

  // Timeout de seguranca: se SSE nao responder, usa polling
  timeoutId = setTimeout(() => {
    startPolling(generationId, accessToken, callbacks);
  }, TIMEOUT_MS);
}
```

**Uso final simplificado:**

```javascript
const { id } = await createGeneration(formData);

watchGeneration(id, accessToken, {
  onCompleted: ({ outputUrls }) => {
    // mostrar resultado
  },
  onFailed: ({ errorMessage, creditsRefunded }) => {
    // mostrar erro
  },
});
```

---

## Observações Importantes

1. **Sempre fechar a conexão SSE** quando o componente desmontar ou quando receber o evento final
2. **Não manter conexões SSE abertas indefinidamente** — conectar apenas quando houver geração em processamento
3. **O evento é enviado uma única vez** — se o frontend não estiver conectado no momento, usar `GET /api/v1/generations/:id` para consultar o status atual
4. **Múltiplas gerações simultâneas**: usar o endpoint `/events` (sem ID) para escutar todas de uma vez, em vez de abrir N conexões separadas
5. **Creditos são estornados automaticamente** em caso de falha — o campo `creditsRefunded` no evento confirma o valor devolvido
