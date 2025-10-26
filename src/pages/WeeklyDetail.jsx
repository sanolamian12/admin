// src/pages/WeeklyDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const WeeklyDetail = () => {
  const { id } = useParams(); // URL에서 id 추출
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const docRef = doc(db, "weekly_detail", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDetail(docSnap.data());
        } else {
          console.warn("해당 문서를 찾을 수 없습니다.");
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

  if (!detail) {
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
      <h2 className="text-2xl font-bold mb-4">⛪ 예배 세부 정보</h2>
      <p className="text-gray-600 mb-2">
        <strong>본문 말씀:</strong> {detail["ser-verse"]}
      </p>
      <p className="text-gray-600 mb-2">
        <strong>설교자:</strong> {detail["ser-preacher"]}
      </p>
      <p className="text-gray-600 mb-4 whitespace-pre-line">
        <strong>요약:</strong> {detail["ser-summary"]}
      </p>

      {detail.file_url && (
        <div className="my-6">
          <p className="font-semibold text-gray-700 mb-2">📄 관련 파일:</p>
          <a
            href={detail.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            파일 열기
          </a>
        </div>
      )}

      <button
        style={{ marginRight: '10px' }}
        onClick={() => navigate(`/admin/weekly/edit/${id}`)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        수정하기
      </button>

      <button
        onClick={() => navigate(-1)}
        className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        목록으로

      </button>
    </div>
  );
};

export default WeeklyDetail;
