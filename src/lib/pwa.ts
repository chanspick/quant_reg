import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * SPEC-PQC-001 §3.8 (PWA)
 * - REQ-PWA-002: SW 등록
 * - REQ-PWA-006: beforeinstallprompt 캡처 → install 어포던스
 * - REQ-PWA-007: 새 SW 버전 감지 → 사용자 알림 및 "지금 적용" 액션
 * - REQ-PWA-009: 등록 실패 시 graceful degradation
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

// 모듈 스코프 상태 — 단일 SW 등록을 보장하면서 여러 컴포넌트가 동일한
// updateAvailable 신호를 구독할 수 있게 한다 (REQ-PWA-007).
let registerCalled = false;
let updateAvailable = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
const updateListeners: Set<(value: boolean) => void> = new Set();

function notifyUpdateListeners(value: boolean): void {
  updateAvailable = value;
  updateListeners.forEach((fn) => fn(value));
}

/**
 * SW 등록 (1회만 호출). 실패해도 앱이 SPA 로 동작 (REQ-PWA-009).
 * onNeedRefresh → updateAvailable 신호를 발행하여 UpdateToast 가 노출되도록 한다.
 */
export function registerServiceWorker(): void {
  if (registerCalled) return;
  registerCalled = true;
  try {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        notifyUpdateListeners(true);
      },
      onOfflineReady() {
        // 오프라인 준비 완료 — 별도 UI 노출 없이 OfflineNotice 에 위임.
      },
      onRegisterError(error) {
        // 콘솔 경고만 — SPA로 계속 동작
        console.warn('[PWA] Service Worker 등록 실패:', error);
      },
    });
  } catch (error) {
    console.warn('[PWA] Service Worker API 사용 불가:', error);
  }
}

/**
 * beforeinstallprompt 이벤트를 캡처해 install 버튼 노출 여부를 결정.
 * (REQ-PWA-006, OQ-009: 헤더 1회 + About 페이지 재노출)
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
} {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const installed = () => setEvent(null);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const promptInstall = async (): Promise<void> => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };

  return { canInstall: event !== null, promptInstall };
}

/**
 * 새 SW 버전 감지 시 toast 노출용 훅 (REQ-PWA-007).
 * - registerServiceWorker() 가 호출되어 있어야 onNeedRefresh 신호가 발행된다.
 * - applyUpdate() 는 updateSW(true) 를 호출해 skipWaiting + 페이지 reload 를 수행한다.
 */
export function useUpdateAvailable(): {
  updateAvailable: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
} {
  // lazy initializer 로 마운트 시점의 module-level 상태를 캡처.
  // useEffect 내부 setState 동기 호출을 피해 cascading render 를 방지한다.
  const [value, setValue] = useState<boolean>(() => updateAvailable);

  useEffect(() => {
    const listener = (next: boolean): void => setValue(next);
    updateListeners.add(listener);
    return () => {
      updateListeners.delete(listener);
    };
  }, []);

  const applyUpdate = useCallback((): void => {
    if (updateSW) {
      // vite-plugin-pwa registerSW: true 는 새 SW activate 후 페이지 reload 수행.
      void updateSW(true);
    }
    // toast 즉시 숨김 (reload 이전 짧은 시간 동안의 깜빡임 방지).
    notifyUpdateListeners(false);
  }, []);

  const dismissUpdate = useCallback((): void => {
    notifyUpdateListeners(false);
  }, []);

  return { updateAvailable: value, applyUpdate, dismissUpdate };
}
