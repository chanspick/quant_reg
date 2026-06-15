import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 정적 대시보드와 동일한 className 머지 정책 (copy).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
