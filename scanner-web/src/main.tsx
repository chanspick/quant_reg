import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';

// 발표 시연용 단일 페이지 — 라우터 없음, 1 화면 3 상태(idle/loading/result).
const root = document.getElementById('root');
if (!root) {
  throw new Error('루트 엘리먼트 #root 를 찾을 수 없습니다.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
