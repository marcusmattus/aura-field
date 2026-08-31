import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? 'pro';
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

let configured = false;

function apiKey(): string | undefined {
  if (Platform.OS === 'ios') return IOS_KEY;
  if (Platform.OS === 'android') return ANDROID_KEY;
  return undefined;
}

export function hasPurchases(): boolean {
  return Boolean(apiKey()) && Platform.OS !== 'web';
}

export async function configurePurchases(appUserID?: string): Promise<void> {
  if (configured || !hasPurchases()) return;
  if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: apiKey()!, appUserID });
  configured = true;
}

export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export async function getAnnualPackage(): Promise<PurchasesPackage | null> {
  if (!hasPurchases()) return null;
  await configurePurchases();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return null;
  return current.annual ?? current.availablePackages[0] ?? null;
}

export async function purchaseAnnual(): Promise<{
  ok: boolean;
  active: boolean;
  error?: string;
}> {
  if (!hasPurchases()) {
    return { ok: false, active: false, error: 'Purchases are not configured for this build.' };
  }
  try {
    const pkg = await getAnnualPackage();
    if (!pkg) return { ok: false, active: false, error: 'No subscription package is available.' };
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { ok: true, active: hasProEntitlement(customerInfo) };
  } catch (error) {
    const cancelled = Boolean(
      error &&
      typeof error === 'object' &&
      'userCancelled' in error &&
      (error as { userCancelled?: boolean }).userCancelled,
    );
    return {
      ok: false,
      active: false,
      error: cancelled ? 'Purchase cancelled.' : 'Could not complete the purchase.',
    };
  }
}

export async function restorePurchases(): Promise<{
  ok: boolean;
  active: boolean;
  error?: string;
}> {
  if (!hasPurchases()) {
    return { ok: false, active: false, error: 'Purchases are not configured for this build.' };
  }
  try {
    await configurePurchases();
    const info = await Purchases.restorePurchases();
    return { ok: true, active: hasProEntitlement(info) };
  } catch {
    return { ok: false, active: false, error: 'Could not restore purchases.' };
  }
}
