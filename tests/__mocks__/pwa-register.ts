// vitest 환경에서 vite-plugin-pwa 의 virtual 모듈을 대체.
// 실제 SW 등록은 일어나지 않으며, applyUpdate 도 noop 이다.
export function registerSW(_options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisterError?: (error: unknown) => void;
}): (reloadPage?: boolean) => Promise<void> {
  return async (_reloadPage?: boolean): Promise<void> => {
    /* no-op */
  };
}
