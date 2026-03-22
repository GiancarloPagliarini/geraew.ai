import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
auth.useDeviceLanguage();

// Em dev, usa test phone numbers configurados no Firebase Console
// Em prod, o reCAPTCHA invisible funciona normalmente
if (process.env.NODE_ENV !== 'production') {
  auth.settings.appVerificationDisabledForTesting = true;
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Inicializa o reCAPTCHA invisível (necessário para Firebase Phone Auth)
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });

  return recaptchaVerifier;
}

export function clearRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

/**
 * Envia SMS de verificação para o número de telefone
 * Retorna o ConfirmationResult para verificar o código depois
 */
export async function sendSmsVerification(phone: string): Promise<ConfirmationResult> {
  if (!recaptchaVerifier) {
    throw new Error('reCAPTCHA não inicializado. Chame setupRecaptcha primeiro.');
  }

  // Normaliza para formato E.164 (+55...)
  let formatted = phone.replace(/\D/g, '');
  if (!formatted.startsWith('+')) {
    if (!formatted.startsWith('55')) {
      formatted = `55${formatted}`;
    }
    formatted = `+${formatted}`;
  }

  try {
    return await signInWithPhoneNumber(auth, formatted, recaptchaVerifier);
  } catch (error) {
    // Recria o reCAPTCHA em caso de falha (token expirado/invalidado)
    clearRecaptcha();
    throw error;
  }
}

/**
 * Verifica o código SMS e retorna o Firebase ID Token
 */
export async function verifySmsCode(
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<string> {
  const userCredential = await confirmationResult.confirm(code);
  const idToken = await userCredential.user.getIdToken();
  return idToken;
}
