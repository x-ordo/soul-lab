// Type declarations for @apps-in-toss/web-framework mock
declare module '@apps-in-toss/web-framework' {
  export function preloadRewardedAd(adGroupId: string): Promise<void>;
  export function showRewardedAd(
    adGroupId: string,
    onRewarded: () => void,
    onFailed?: () => void
  ): void;
  export function openContactsPicker(
    moduleId: string,
    onOpen: () => void,
    onClose: () => void
  ): void;
  export function makeShareLink(
    deepLink: string,
    ogImageUrl?: string
  ): Promise<string>;
  export function shareMessage(message: string): Promise<boolean>;
}
