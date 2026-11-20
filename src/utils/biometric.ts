/**
 * Biometrik selalu diverifikasi oleh OS (Android Keystore / Secure Enclave).
 * Aplikasi tidak pernah menerima atau menyimpan template sidik jari/wajah.
 * `disableDeviceFallback` memastikan fallback bukan PIN/pola bawaan HP,
 * melainkan PIN Mamoo.
 */
export type BiometricAvailability = {
  available: boolean;
  hasHardware: boolean;
  enrolled: boolean;
};

export type BiometricResult = {
  success: boolean;
  error?: string;
  cancelled: boolean;
};

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const LocalAuth = await import('expo-local-authentication');
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuth.hasHardwareAsync(),
      LocalAuth.isEnrolledAsync(),
    ]);
    return { available: hasHardware && enrolled, hasHardware, enrolled };
  } catch {
    return { available: false, hasHardware: false, enrolled: false };
  }
}

export async function authenticateBiometric(
  promptMessage = 'Verifikasi untuk membuka Mamoo',
): Promise<BiometricResult> {
  try {
    const LocalAuth = await import('expo-local-authentication');
    const result = await LocalAuth.authenticateAsync({
      promptMessage,
      cancelLabel: 'Gunakan PIN',
      fallbackLabel: 'Gunakan PIN',
      disableDeviceFallback: true,
    });
    const error = 'error' in result ? result.error : undefined;
    return {
      success: result.success,
      error,
      cancelled:
        error === 'user_cancel' ||
        error === 'system_cancel' ||
        error === 'app_cancel',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Biometrik gagal dibuka.',
      cancelled: false,
    };
  }
}
