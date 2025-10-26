// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom"; // ✅ Navigate 추가
import Login from "./Login.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import NoticeList from "./pages/NoticeList.jsx";
import NoticeForm from "./pages/NoticeForm.jsx";
import NoticeEdit from "./pages/NoticeEdit.jsx";

// ✅ 추가: 주간 예배 목록/상세
import WeeklyList from "./pages/WeeklyList.jsx";
import WeeklyDetail from "./pages/WeeklyDetail.jsx";
import WeeklyForm from "./pages/WeeklyForm.jsx";
import WeeklyEdit from "./pages/WeeklyEdit.jsx";

import CalendarList from "./pages/CalendarList.jsx";
// import CalendarForm from "./pages/CalendarForm.jsx";
import CalendarNewPage from './pages/CalendarNewPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full bg-blue-100 flex flex-col">
        {/* 상단 테스트 네비 (원하면 삭제 가능) */}
        <header className="w-full flex items-center gap-4 px-6 py-4 bg-white/70 backdrop-blur">
          <h1 className="text-xl font-bold text-blue-700">
            Tailwind 연결 확인 🎨
          </h1>
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

        {/* 라우트 영역 */}
        <main className="flex-1 w-full">
          <Routes>
            {/* ✅ 루트는 /admin 으로 리다이렉트 */}
            <Route path="/" element={<Navigate to="/admin" replace />} />

            <Route path="/login" element={<Login />} />

            {/* 보호된 관리자 라우트 */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              {/* /admin 기본 홈 */}
              <Route index element={<AdminPage />} />

              {/* 공지 */}
              <Route path="notice" element={<NoticeList />} />
              <Route path="notice/new" element={<NoticeForm />} />
              <Route path="notice/edit/:id" element={<NoticeEdit />} />

              {/* 주간 예배 */}
              <Route path="weekly" element={<WeeklyList />} />
              <Route path="weekly/new" element={<WeeklyForm />} />
              <Route path="weekly/:id" element={<WeeklyDetail />} />
              <Route path="weekly/edit/:id" element={<WeeklyEdit />} />

             {/* 달력 스케줄 */}
              <Route path="/admin/calendar" element={<CalendarList />} />
{/*               <Route path="/admin/calendar/new" element={<CalendarForm />} /> */}
              <Route path="/admin/calendar/new" element={<CalendarNewPage />} />
            </Route>


            {/* 알 수 없는 경로 → /admin */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
