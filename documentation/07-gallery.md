# Gallery - Galeria

Base: `/api/v1/gallery`

Todas as rotas exigem **autenticacao** (`Authorization: Bearer <token>`).

A galeria e um alias simplificado que retorna apenas geracoes completadas (nao deletadas).

---

## GET /gallery

Lista geracoes completadas do usuario (galeria).

**Query params:**

| Param | Tipo | Default | Descricao |
|---|---|---|---|
| `page` | int | 1 | Pagina |
| `limit` | int | 20 | Itens por pagina (max 100) |
| `sort` | string | `created_at:desc` | Ordenacao |

**Response 200:**

```json
{
  "data": [
    {
      "id": "clx1gen001...",
      "type": "TEXT_TO_IMAGE",
      "status": "COMPLETED",
      "prompt": "A futuristic cityscape...",
      "resolution": "RES_2K",
      "outputUrl": "https://cdn.geraew.com/outputs/clx1gen001.jpg",
      "thumbnailUrl": null,
      "hasWatermark": false,
      "creditsConsumed": 15,
      "isFavorited": true,
      "createdAt": "2026-03-09T14:30:00.000Z",
      "completedAt": "2026-03-09T14:30:12.500Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 30,
    "totalPages": 2
  }
}
```

> Retorna o mesmo formato de `Generation` do modulo Generations, mas filtrado apenas por `status=COMPLETED` e `isDeleted=false`.

---

## GET /gallery/stats

Estatisticas da galeria do usuario.

**Response 200:**

```json
{
  "totalGenerations": 85,
  "totalCreditsUsed": 2450,
  "generationsByType": {
    "TEXT_TO_IMAGE": 40,
    "IMAGE_TO_IMAGE": 15,
    "TEXT_TO_VIDEO": 20,
    "IMAGE_TO_VIDEO": 8,
    "MOTION_CONTROL": 2
  },
  "favoriteCount": 12
}
```

---

## Tipos TypeScript para o Frontend

```typescript
interface GalleryStats {
  totalGenerations: number;
  totalCreditsUsed: number;
  generationsByType: {
    TEXT_TO_IMAGE: number;
    IMAGE_TO_IMAGE: number;
    TEXT_TO_VIDEO: number;
    IMAGE_TO_VIDEO: number;
    MOTION_CONTROL: number;
  };
  favoriteCount: number;
}
```

> Para favoritar/desfavoritar e deletar itens da galeria, use os endpoints do modulo **Generations**:
> - `POST /generations/:id/favorite`
> - `DELETE /generations/:id/favorite`
> - `DELETE /generations/:id`
