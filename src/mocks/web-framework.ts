// Mock for @apps-in-toss/web-framework (local development only)

export async function appLogin() {
  // Mock: return a fake authorization code
  const mockCode = 'mock-auth-' + Date.now().toString(36);
  console.log('[MOCK] appLogin called, returning:', mockCode);
  return { authorizationCode: mockCode };
}

export function contactsViral(options: {
  options: { moduleId: string };
  onEvent: (event: any) => void;
  onError: (error: unknown) => void;
}) {
  console.log('[MOCK] contactsViral called with moduleId:', options.options.moduleId);
  // Simulate successful viral send after 1 second
  setTimeout(() => {
    options.onEvent({ type: 'sendViral', data: { rewardAmount: 100, rewardUnit: 'point' } });
  }, 1000);
  setTimeout(() => {
    options.onEvent({ type: 'close' });
  }, 1500);
  return () => console.log('[MOCK] contactsViral cleanup');
}

export async function getTossShareLink(deepLink: string, _imageUrl?: string) {
  console.log('[MOCK] getTossShareLink called with:', deepLink);
  // Return the deep link as-is for local testing
  return deepLink;
}

export const GoogleAdMob = {
  async loadAppsInTossAdMob(options: { options: { adGroupId: string } }) {
    console.log('[MOCK] GoogleAdMob.loadAppsInTossAdMob:', options.options.adGroupId);
    return true;
  },
  async showAppsInTossAdMob(options: {
    options: { adGroupId: string };
    onEvent: (event: any) => void;
    onError: (error: unknown) => void;
  }) {
    console.log('[MOCK] GoogleAdMob.showAppsInTossAdMob:', options.options.adGroupId);
    // Simulate user earning reward after 2 seconds
    setTimeout(() => {
      options.onEvent({ type: 'userEarnedReward' });
    }, 2000);
    return true;
  },
};

export async function share(options: { message: string }) {
  console.log('[MOCK] share called with message:', options.message);
  // Try native share API, fallback to alert
  if (navigator.share) {
    try {
      await navigator.share({ text: options.message });
    } catch (e) {
      console.log('[MOCK] Native share cancelled or failed');
    }
  } else {
    alert('Share: ' + options.message);
  }
  return true;
}
