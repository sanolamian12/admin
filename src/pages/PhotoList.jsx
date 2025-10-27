// src/pages/PhotoList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

const PhotoList = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔹 Firestore에서 photo 목록 로드
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const q = query(collection(db, "photo"), orderBy("registeredAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPhotos(data);
      } catch (err) {
        console.error("🔥 Error loading photos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  // 🔹 isActive 토글
  const toggleActive = async (id, current) => {
    await updateDoc(doc(db, "photo", id), { isActive: !current });
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !current } : p))
    );
  };

  // 🔹 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("이 앨범을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "photo", id));
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return <p className="text-center py-10 text-gray-500">로딩 중...</p>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📸 사진 앨범 목록</h1>
        <Link
          to="/admin/photo/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + 새 앨범 등록
        </Link>
      </div>

      {photos.length === 0 ? (
        <p className="text-gray-500">등록된 앨범이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {photos.map((p) => (
            <div
              key={p.id}
              className="border rounded-xl shadow-sm bg-white hover:shadow-md transition relative"
            >
              {/* 썸네일 */}
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/admin/photo/${p.id}`)}
              >
                {p.thumb_url ? (
                  <img
                    src={p.thumb_url}
                    alt={p.caption}
                    className="w-full h-48 object-cover rounded-t-xl"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </div>

              {/* 내용 */}
              <div className="p-4">
                <p className="font-semibold text-gray-800 mb-1">
                  {p.caption || "제목 없음"}
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  등록자: {p.user || "Unknown"}
                </p>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => toggleActive(p.id, p.isActive)}
                    className={`px-3 py-1 rounded text-sm ${
                      p.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {p.isActive ? "활성" : "비활성"}
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoList;
