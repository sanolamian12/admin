// src/pages/PhotoDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  orderBy,
  getDocs,
  deleteDoc,
  query,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

const PhotoDetail = () => {
  const { id } = useParams(); // photo 문서 ID
  const navigate = useNavigate();

  const [photo, setPhoto] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Firestore에서 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1️⃣ photo 메인 문서
        const photoRef = doc(db, "photo", id);
        const photoSnap = await getDoc(photoRef);
        if (photoSnap.exists()) setPhoto({ id: photoSnap.id, ...photoSnap.data() });

        // 2️⃣ photo_detail 하위 이미지 목록
        const detailRef = collection(db, "photo", id, "photo_detail");
        const q = query(detailRef, orderBy("picture_id", "asc"));
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

  // 🔹 특정 상세 이미지 삭제 (Firestore + Storage)
  const handleDeleteImage = async (docId, imageUrl) => {
    const ok = window.confirm("이 이미지를 삭제하시겠습니까?");
    if (!ok) return;

    try {
      // 1️⃣ Firestore photo_detail 문서 삭제
      await deleteDoc(doc(db, "photo", id, "photo_detail", docId));

      // 2️⃣ Storage 원본 이미지 삭제
      const fileRef = ref(storage, imageUrl);
      await deleteObject(fileRef).catch(() =>
        console.log("⚠️ 원본 이미지 없음, 스킵")
      );

      // 3️⃣ 썸네일 삭제 (경로 변환: /images/ → /thumbs/)
      const thumbPath = imageUrl.replace("/images/", "/thumbs/").replace(/([^/]+)$/, "thumb_$1");
      const thumbRef = ref(storage, thumbPath);
      await deleteObject(thumbRef).catch(() =>
        console.log("⚠️ 썸네일 없음, 스킵")
      );

      // 4️⃣ UI 업데이트
      setDetails((prev) => prev.filter((d) => d.id !== docId));
      alert("이미지가 삭제되었습니다.");
    } catch (err) {
      console.error("⚠️ Error deleting image:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

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
      {/* 상단 타이틀 */}
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
            <div
              key={d.id}
              className="border rounded-xl shadow-sm bg-white relative hover:shadow-md transition"
            >
              <img
                src={d.thumb_url || d.image_url}
                alt={d.picture_id}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              <div className="p-3 text-sm text-gray-600 flex justify-between items-center">
                <span>사진 #{d.picture_id}</span>
                <div className="flex gap-3 items-center">
                  <a
                    href={d.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    원본 보기
                  </a>
                  <button
                    onClick={() => handleDeleteImage(d.id, d.image_url)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    삭제
                  </button>
                </div>
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
