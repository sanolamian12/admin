// src/pages/AdminPage.jsx
import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";

const AdminPage = () => {
  const [user] = useAuthState(auth);

  return (
    <div className="w-full">
      {user ? (
        <>
          <p className="text-gray-700 text-lg mb-8">
            현재 로그인된 계정:&nbsp;
            <span className="font-semibold text-blue-700">{user.email}</span>
          </p>

          <div className="grid grid-cols-3 gap-10">
            {/* ✅ 공지 관리 */}
            <Link
              to="/admin/notice"
              className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white block"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-3">📢 공지 관리</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                게시글 등록, 수정 및 삭제 기능을 관리합니다.
              </p>
            </Link>

            {/* ✅ 예배 게시물 관리 */}
            <div className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
              <h2 className="text-xl font-bold text-gray-800 mb-3">⛪ 예배 게시물 관리</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                주간 예배 게시물의 등록, 조회 및 삭제 기능을 관리합니다.
              </p>
              <div className="flex flex-col space-y-2">
                <Link
                  to="/admin/weekly"
                  className="text-blue-600 underline text-sm hover:text-blue-800 transition"
                >
                  예배 목록 보기
                </Link>
                <Link
                  to="/admin/weekly/new"
                  className="text-blue-600 underline text-sm hover:text-blue-800 transition"
                >
                  새 예배 등록하기
                </Link>
              </div>
            </div>

            {/* ✅ 사진 앨범 관리 (새로 추가된 섹션) */}
            <div className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
              <h2 className="text-xl font-bold text-gray-800 mb-3">📸 사진 앨범 관리</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                교회 행사 및 예배 사진을 등록하고 앨범별로 관리합니다.
              </p>
              <div className="flex flex-col space-y-2">
                <Link
                  to="/admin/photo"
                  className="text-blue-600 underline text-sm hover:text-blue-800 transition"
                >
                  앨범 목록 보기
                </Link>
                <Link
                  to="/admin/photo/new"
                  className="text-blue-600 underline text-sm hover:text-blue-800 transition"
                >
                  새 앨범 등록하기
                </Link>
              </div>
            </div>

            {/* ✅ 일정 관리 */}
            <div className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
              <h2 className="text-xl font-bold text-gray-800 mb-3">📅 일정 관리</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                교회 및 개인 일정 등록, 조회, 삭제 기능을 관리합니다.
              </p>
              <div className="flex flex-col space-y-2">
                <Link
                  to="/admin/calendar"
                  className="text-blue-600 underline text-sm hover:text-blue-800 transition"
                >
                  일정 목록 보기
                </Link>
                <Link
                  to="/admin/calendar/new"
                  className="text-blue-600 underline text-sm hover:text-blue-800 transition"
                >
                  새 일정 등록하기
                </Link>
              </div>
            </div>

            {/* ✅ 사용자 통계 */}
            <div className="p-8 border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition bg-white">
              <h2 className="text-xl font-bold text-gray-800 mb-3">📊 사용자 통계</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                앱 사용자 수 및 방문 기록을 확인합니다.
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-center py-20 text-lg">
          로그인 정보를 불러오는 중...
        </p>
      )}
    </div>
  );
};

export default AdminPage;
