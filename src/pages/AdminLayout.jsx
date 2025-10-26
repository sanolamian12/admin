// src/pages/AdminLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const AdminLayout = () => {
  const [user] = useAuthState(auth);

  const handleLogout = async () => {
    await signOut(auth);
    alert("로그아웃 되었습니다.");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-r from-blue-50 to-blue-100 flex flex-col">
      {/* 헤더 */}
      <header className="w-full flex justify-between items-center px-12 py-6 bg-white/70 backdrop-blur-md shadow-md">
        <h1 className="text-3xl font-bold text-blue-700 tracking-tight">
          🔧 관리자 대시보드 [DEBUG v3]
        </h1>
        <div className="flex gap-4 items-center">
          <Link
            to="/admin"
            className="text-blue-700 font-semibold hover:underline"
          >
            홈
          </Link>
          <Link
            to="/admin/notice"
            className="text-blue-700 font-semibold hover:underline"
          >
            공지관리
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 w-full px-12 py-10">
        {user ? (
          <Outlet /> // 하위 라우트 (AdminHome, NoticeList 등) 표시
        ) : (
          <p className="text-gray-500 text-center py-20 text-lg">
            로그인 정보를 불러오는 중...
          </p>
        )}
      </main>
    </div>
  );
};

export default AdminLayout;
