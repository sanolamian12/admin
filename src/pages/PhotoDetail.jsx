// src/pages/PhotoDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

const PhotoDetail = () => {
  const { id } = useParams(); // URL의 photo id
  const navigate = useNavigate();

  const [photo, setPhoto] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Firestore에서 데이터 로드
  useEffect(() => {

      setPhoto(null);
      setDetails([]);

    const fetchData = async () => {
      try {
        // 1️⃣ photo 메인 문서
        const docRef = doc(db, "photo", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setPhoto({ id: docSnap.id, ...docSnap.data() });

        // 2️⃣ photo_detail 하위 이미지들
        const q = query(
          collection(db, "photo_detail"),
          where("content_id", "==", id),
          orderBy("picture_id", "asc")
        );
        const snap = await getDocs(q);
        setDetails(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("🔥 Error fetching photo detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <p className="text-center py-10 text-gray-500">로딩 중...</p>;
  }

  if (!photo) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-6">해당 앨범을 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate("/admin/photo")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* 상단 타이틀 영역 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          📸 앨범 상세보기 — {photo.caption}
        </h1>
        <button
          onClick={() => navigate("/admin/photo")}
          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
        >
          목록으로 돌아가기
        </button>
      </div>

      {/* 대표 썸네일 */}
      <div className="mb-8">
        {photo.thumb_url ? (
          <img
            src={photo.thumb_url}
            alt="썸네일"
            className="w-64 h-64 object-cover rounded-lg border"
          />
        ) : (
          <div className="w-64 h-64 bg-gray-200 flex items-center justify-center rounded-lg text-gray-500">
            No Thumbnail
          </div>
        )}
        <p className="mt-4 text-gray-600">
          등록자: <span className="font-semibold">{photo.user}</span> |{" "}
          <span className="text-sm">
            상태:{" "}
            <span
              className={`${
                photo.isActive ? "text-green-600" : "text-gray-500"
              } font-medium`}
            >
              {photo.isActive ? "활성" : "비활성"}
            </span>
          </span>
        </p>
      </div>

      {/* 상세 이미지 리스트 */}
      <h2 className="text-xl font-semibold text-gray-700 mb-4">상세 이미지</h2>
      {details && details.length > 0 ? (
        <div className="grid grid-cols-3 gap-6">
          {details.map((d) => (
            <div key={d.id} className="border rounded-xl shadow-sm bg-white">
              <img
                src={d.image_url}
                alt={d.picture_id}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              <div className="p-3 text-sm text-gray-600 flex justify-between items-center">
                <span>사진 #{d.picture_id}</span>
                <a
                  href={d.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  원본 보기
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">등록된 상세 이미지가 없습니다.</p>
      )}
    </div>
  );
};

export default PhotoDetail;
