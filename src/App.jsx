// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./Login.jsx";
import AdminPage from "./AdminPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full bg-blue-100 flex flex-col">
        {/* 상단 테스트 네비(원하면 삭제 가능) */}
        <header className="w-full flex items-center gap-4 px-6 py-4 bg-white/70 backdrop-blur">
          <h1 className="text-xl font-bold text-blue-700">Tailwind 연결 확인 🎨</h1>
          <Link
            to="/login"
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
          >
            로그인
          </Link>
          <Link
            to="/admin"
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
          >
            관리자 페이지
          </Link>
        </header>

        {/* 라우트: 풀폭 컨텐츠 영역 */}
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
