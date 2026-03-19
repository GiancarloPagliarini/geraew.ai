# Integração Google Login — Frontend

## Visão Geral

O backend suporta **dois fluxos** de login com Google:

| Fluxo | Endpoint | Uso |
|---|---|---|
| **Web (redirect)** | `GET /api/v1/auth/google` | SPA com redirect para Google |
| **Mobile / SPA (token)** | `POST /api/v1/auth/google` | App envia ID token do Google diretamente |

**Recomendação para SPA (React/Next.js):** usar o fluxo via **token** (`POST`), pois evita redirects e oferece melhor UX.

---

## Fluxo Recomendado (Token — SPA)

### 1. Configurar Google Sign-In no Frontend

Instalar a lib do Google:

```bash
npm install @react-oauth/google
# ou
yarn add @react-oauth/google
```

### 2. Configurar o Provider

Envolver a app com o `GoogleOAuthProvider`:

```tsx
// app.tsx ou layout.tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "654325444730-qqb9hpkf3jekrad8tcgid7t154oitp92.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* rotas da app */}
    </GoogleOAuthProvider>
  );
}
```

> **Nota:** O `clientId` é o mesmo usado no backend. Colocar em variável de ambiente (`NEXT_PUBLIC_GOOGLE_CLIENT_ID` ou `VITE_GOOGLE_CLIENT_ID`).

### 3. Implementar o Botão de Login

```tsx
import { useGoogleLogin, GoogleLogin } from '@react-oauth/google';

// Opção A — Botão customizado (recomendado)
function LoginPage() {
  const googleLogin = useGoogleLogin({
    flow: 'implicit', // ou 'auth-code'
    onSuccess: async (response) => {
      // O response.credential contém o ID token
      await handleGoogleLogin(response.access_token);
    },
    onError: () => {
      console.error('Login com Google falhou');
    },
  });

  return (
    <button onClick={() => googleLogin()}>
      Entrar com Google
    </button>
  );
}

// Opção B — Botão padrão do Google (One Tap)
function LoginPage() {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        handleGoogleLogin(credentialResponse.credential);
      }}
      onError={() => {
        console.error('Login com Google falhou');
      }}
    />
  );
}
```

> **Importante sobre `useGoogleLogin` com `flow: 'implicit'`:** Esse hook retorna um `access_token` do Google, **não um ID token**. Para o endpoint `POST /api/v1/auth/google` do backend, você precisa do **ID token**. Use o **`GoogleLogin` (One Tap / botão padrão)** que retorna `credentialResponse.credential` — este sim é o ID token que o backend espera.

### 4. Enviar Token para o Backend

```tsx
const API_BASE = "https://clip-generator-geraew-api.ernvcw.easypanel.host/api/v1";

async function handleGoogleLogin(googleToken: string) {
  try {
    const response = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleToken }),
    });

    if (!response.ok) {
      throw new Error('Falha na autenticação');
    }

    const data = await response.json();

    // data retornado:
    // {
    //   "accessToken": "eyJhbG...",
    //   "refreshToken": "a1b2c3d4...",
    //   "user": {
    //     "id": "cuid123",
    //     "email": "user@gmail.com",
    //     "name": "João Silva",
    //     "avatarUrl": "https://lh3.googleusercontent.com/...",
    //     "role": "USER",
    //     "emailVerified": true,
    //     "createdAt": "2026-03-19T10:30:00Z"
    //   }
    // }

    // Salvar tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);

    // Redirecionar para dashboard
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Erro no login Google:', error);
  }
}
```

---

## Fluxo Alternativo (Redirect — Web)

Se preferir o fluxo clássico com redirect:

```tsx
function LoginPage() {
  const handleGoogleRedirect = () => {
    // Redireciona para o backend, que redireciona para o Google
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <button onClick={handleGoogleRedirect}>
      Entrar com Google
    </button>
  );
}
```

**Callback:** Após autenticação, o Google redireciona para `GET /api/v1/auth/google/callback`. O backend processa e retorna o `AuthResponseDto`.

> **Atenção:** No fluxo redirect, o backend retorna JSON na callback. Será necessário ajustar o backend para redirecionar o usuário de volta para o frontend com os tokens (ex: via query params ou cookie). **Por isso o fluxo via token (POST) é mais simples para SPAs.**

---

## Resposta do Backend

### Endpoint: `POST /api/v1/auth/google`

**Request:**
```json
{
  "googleToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjdWlkMTIzIiwiZW1haWwiOiJ1c2VyQGdtYWlsLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzEwODM2NjAwLCJleHAiOjE3MTA4Mzc1MDB9...",
  "refreshToken": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "user": {
    "id": "cuid_abc123",
    "email": "usuario@gmail.com",
    "name": "Nome Sobrenome",
    "avatarUrl": "https://lh3.googleusercontent.com/a/foto",
    "role": "USER",
    "emailVerified": true,
    "createdAt": "2026-03-19T10:30:00.000Z"
  }
}
```

**Erros possíveis:**
| Status | Mensagem |
|---|---|
| 401 | Token Google inválido ou expirado |
| 400 | Plano Free não encontrado (erro de config do backend) |

---

## Gerenciamento de Tokens

### Access Token
- **Formato:** JWT
- **Expiração:** 15 minutos
- **Enviar em todas as requests autenticadas:**
  ```
  Authorization: Bearer <accessToken>
  ```

### Refresh Token
- **Formato:** hex string (64 chars)
- **Expiração:** 7 dias
- **Usar para renovar o access token quando expirar**

### Renovar Access Token

```tsx
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token expirado/inválido → forçar logout
      logout();
      return null;
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}
```

### Interceptor de Request (Axios exemplo)

```tsx
import axios from 'axios';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Logout

```tsx
async function logout() {
  const refreshToken = localStorage.getItem('refreshToken');

  if (refreshToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {}); // fire-and-forget
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
}
```

---

## Buscar Dados do Usuário Logado

Após login, para carregar os dados do usuário (perfil + plano + créditos):

```tsx
// GET /api/v1/users/me
const response = await api.get('/users/me');
// Retorna: user info + subscription + credit balance
```

---

## Checklist de Implementação

- [ ] Configurar `GoogleOAuthProvider` com o `clientId`
- [ ] Implementar botão de login com Google (recomendado: `GoogleLogin` component)
- [ ] Implementar `handleGoogleLogin` → `POST /api/v1/auth/google`
- [ ] Salvar `accessToken` e `refreshToken` nos cookies
- [ ] Criar interceptor HTTP para enviar `Authorization: Bearer` em todas as requests
- [ ] Criar interceptor para renovar token automaticamente quando receber 401
- [ ] Implementar logout (revogar refresh token + limpar cookies)
- [ ] Implementar rota protegida que redireciona para `/login` se não autenticado
- [ ] Carregar dados do usuário via `GET /users/me` após login
- [ ] Testar fluxo completo: login → dashboard → refresh token → logout

---

## Variáveis de Ambiente (Frontend)

```env
# .env.local
NEXT_PUBLIC_API_URL=https://clip-generator-geraew-api.ernvcw.easypanel.host/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=654325444730-qqb9hpkf3jekrad8tcgid7t154oitp92.apps.googleusercontent.com
```

---

## Resumo dos Endpoints de Auth

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cadastro email+senha |
| `POST` | `/auth/login` | Login email+senha |
| `POST` | `/auth/google` | Login Google (enviar `googleToken`) |
| `POST` | `/auth/refresh` | Renovar access token |
| `POST` | `/auth/logout` | Revogar refresh token |
| `POST` | `/auth/forgot-password` | Solicitar reset de senha |
| `POST` | `/auth/reset-password` | Resetar senha com token |
| `GET` | `/users/me` | Dados do usuário logado |
