"use client";

import dynamic from "next/dynamic";

// localStorage(설정·우리 반 문제)를 바로 읽기 위해 브라우저에서만 렌더링
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "var(--display)", fontSize: 28, color: "#8446e5" }}>
      와글와글 퀴즈놀이터 준비 중…
    </div>
  ),
});

export default function ClientApp() {
  return <App />;
}
