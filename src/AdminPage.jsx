// src/AdminPage.jsx
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const AdminPage = () => {
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
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition"
        >
          로그아웃
        </button>
      </header>

      {/* 메인 영역 - 전체 폭 */}
      <main className="flex-1 w-full px-12 py-10">
        {user ? (
          <>
            <p className="text-gray-700 text-lg mb-8">
              현재 로그인된 계정:&nbsp;
              <span className="font-semibold text-blue-700">{user.email}</span>
            </p>

            {/* 카드 그리드 */}
            <div className="grid grid-cols-3 gap-10">
              <div className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  📢 공지 관리
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  게시글 등록, 수정 및 삭제 기능을 관리합니다.
                </p>
              </div>

              <div className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  📊 사용자 통계
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  앱 사용자 수 및 방문 기록을 확인합니다.
                </p>
              </div>

              <div className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  📁 파일 업로드
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  이미지 및 문서 파일을 업로드합니다.
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-20 text-lg">
            로그인 정보를 불러오는 중...
          </p>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
