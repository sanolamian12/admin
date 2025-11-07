// ✅ WeeklyDetail.jsx (다국어 A 스타일 적용 버전)
// 한 화면에 한글 → 영어 순서로 모두 표시

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const WeeklyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [weekly, setWeekly] = useState(null); // weekly 컬렉션 데이터
  const [detail, setDetail] = useState(null); // weekly_detail 컬렉션 데이터
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const weeklyRef = doc(db, "weekly", id);
        const detailRef = doc(db, "weekly_detail", id);

        const [weeklySnap, detailSnap] = await Promise.all([
          getDoc(weeklyRef),
          getDoc(detailRef),
        ]);

        if (weeklySnap.exists()) setWeekly(weeklySnap.data());
        if (detailSnap.exists()) setDetail(detailSnap.data());

        if (!weeklySnap.exists() || !detailSnap.exists()) {
          console.warn("데이터 없음");
        }
      } catch (error) {
        console.error("세부정보 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading) {
    return <p className="text-center py-10 text-gray-600">불러오는 중...</p>;
  }

  if (!weekly || !detail) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>세부 정보를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm">
      <h2 className="text-2xl font-bold mb-6">⛪ 예배 세부 정보</h2>

      {/* 제목 */}
      <section className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800">제목</h3>
        <p className="text-gray-700 mt-1">{weekly.title}</p>
        {weekly.title_en && (
          <p className="text-gray-500 text-sm mt-1">{weekly.title_en}</p>
        )}
      </section>

      {/* 본문 말씀 */}
      <section className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800">본문 말씀</h3>
        <p className="text-gray-700 mt-1">{detail["ser-verse"]}</p>
        {detail["ser-verse_en"] && (
          <p className="text-gray-500 text-sm mt-1">{detail["ser-verse_en"]}</p>
        )}
      </section>

      {/* 설교자 */}
      <section className="mb-5">
        <h3 className="text-lg font-semibold text-gray-800">설교자</h3>
        <p className="text-gray-700 mt-1">{detail["ser-preacher"]}</p>
        {detail["ser-preacher_en"] && (
          <p className="text-gray-500 text-sm mt-1">
            {detail["ser-preacher_en"]}
          </p>
        )}
      </section>

      {/* 요약 */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800">설교 요약</h3>
        <p className="text-gray-700 whitespace-pre-line mt-1">
          {detail["ser-summary"]}
        </p>
        {detail["ser-summary_en"] && (
          <p className="text-gray-500 whitespace-pre-line text-sm mt-3">
            {detail["ser-summary_en"]}
          </p>
        )}
      </section>

      {/* 파일 */}
      {detail.file_url && (
        <section className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800">첨부 파일</h3>
          <a
            href={detail.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline mt-1 inline-block"
          >
            파일 열기
          </a>
        </section>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => navigate(`/admin/weekly/edit/${id}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          수정하기
        </button>

        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          목록으로
        </button>
      </div>
    </div>
  );
};

export default WeeklyDetail;
