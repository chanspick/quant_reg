import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui className 머지 헬퍼.
 * Tailwind 클래스 충돌을 해결하면서 조건부 클래스를 안전하게 결합한다.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
