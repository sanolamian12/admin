// src/pages/PhotoList.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, listAll, deleteObject } from "firebase/storage";

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

  // 🔹 Storage 내 모든 하위 파일 재귀 삭제
  const deleteAllInFolder = async (folderRef) => {
    const list = await listAll(folderRef);
    const promises = [];

    // 현재 폴더 내 파일 삭제
    for (const item of list.items) {
      promises.push(deleteObject(item));
    }

    // 하위 폴더 내 파일 재귀 삭제
    for (const prefix of list.prefixes) {
      promises.push(deleteAllInFolder(prefix));
    }

    await Promise.all(promises);
  };

  // 🔹 Firestore 문서 + Storage 이미지 완전 삭제
  const handleDelete = async (photoId) => {
    const ok = window.confirm("이 앨범을 완전히 삭제하시겠습니까? (복원 불가)");
    if (!ok) return;

    try {
      // 1️⃣ Firestore: 하위 photo_detail 삭제
      const detailSnap = await getDocs(collection(db, "photo", photoId, "photo_detail"));
      const deleteDetailPromises = detailSnap.docs.map((d) =>
        deleteDoc(doc(db, "photo", photoId, "photo_detail", d.id))
      );
      await Promise.all(deleteDetailPromises);

      // 2️⃣ Firestore: 상위 photo 문서 삭제
      await deleteDoc(doc(db, "photo", photoId));

      // 3️⃣ Storage: 해당 앨범의 모든 이미지 및 썸네일 삭제
      const albumRef = ref(storage, `photo/${photoId}`);
      await deleteAllInFolder(albumRef);

      // 4️⃣ UI 갱신
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      alert("앨범이 완전히 삭제되었습니다.");
    } catch (err) {
      console.error("⚠️ Error deleting photo album:", err);
      alert("삭제 중 오류가 발생했습니다.");
    }
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

                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={() => navigate(`/admin/photo/${p.id}`)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded"
                  >
                    상세보기
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
