import { appLogin, contactsViral, getTossShareLink, GoogleAdMob, share } from '@apps-in-toss/web-framework';

export async function fastLoginSeed(): Promise<string> {
  // 원칙: 토스 로그인 정보(최소 식별자)를 seed로 사용.
  // 현실: 생년월일/프로필은 scope + 서버 교환이 필요하므로 MVP에서는
  // authorizationCode(또는 반환 값)를 seed로 사용한다. (결정성 확보는 localStorage로)
  const res: any = await appLogin();
  const code =
    res?.authorizationCode ??
    res?.data?.authorizationCode ??
    res?.code ??
    res?.data?.code ??
    null;

  return typeof code === 'string' && code.length > 0 ? code : JSON.stringify(res);
}

export function runContactsViral(moduleId: string, onSent: (reward?: { amount?: number; unit?: string }) => void, onClose: () => void) {
  let cleanup: undefined | (() => void);

  cleanup = contactsViral({
    options: { moduleId: moduleId.trim() },
    onEvent: (event: any) => {
      if (event?.type === 'sendViral') {
        onSent({ amount: event?.data?.rewardAmount, unit: event?.data?.rewardUnit });
      }
      if (event?.type === 'close') {
        cleanup?.();
        onClose();
      }
    },
    onError: (error: unknown) => {
      console.error(error);
      cleanup?.();
      onClose();
    },
  });

  return () => cleanup?.();
}

export async function makeShareLink(deepLink: string, imageUrl?: string) {
  const ogImage = imageUrl ?? import.meta.env.VITE_OG_IMAGE_URL ?? '';
  return getTossShareLink(deepLink, ogImage);
}

export async function preloadRewardedAd(adGroupId: string) {
  try {
    await GoogleAdMob.loadAppsInTossAdMob({ options: { adGroupId } });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function showRewardedAd(adGroupId: string, onReward: () => void, onFallback: () => void) {
  try {
    await GoogleAdMob.showAppsInTossAdMob({
      options: { adGroupId },
      onEvent: (event: any) => {
        if (event?.type === 'userEarnedReward') {
          onReward();
        } else if (event?.type === 'adDismissedFullScreenContent') {
          // 사용자가 닫음 → 잠금 유지
        }
      },
      onError: (err: unknown) => {
        console.error(err);
        onFallback();
      },
    });
  } catch (e) {
    console.error(e);
    onFallback();
  }
}


export async function shareMessage(message: string) {
  try {
    await share({ message });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
