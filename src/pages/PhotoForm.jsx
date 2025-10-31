// src/pages/PhotoForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  Timestamp, // ✅ 추가
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const PhotoForm = () => {
  const [caption, setCaption] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // 🔹 공통 파일 업로드 함수
  const uploadFile = async (path, file) => {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  };

  // 🔹 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption || imageFiles.length === 0) {
      alert("제목과 이미지를 모두 선택하세요.");
      return;
    }

    try {
      setUploading(true);

      // ✅ 시드니 시간 기준 Timestamp 생성
      const now = new Date();
      const sydneyTime = new Date(now.getTime() + 11 * 60 * 60 * 1000);

      // 1️⃣ photo 문서 생성
      const photoRef = await addDoc(collection(db, "photo"), {
        caption,
        user: "admin", // 추후 auth.currentUser.email 로 교체 가능
        registeredAt: Timestamp.fromDate(sydneyTime), // ✅ 변경됨
        isActive: true,
        thumb_url: "",
        views: 0,
      });

      const photoId = photoRef.id;

      // 2️⃣ 상세 이미지 업로드 (첫 번째 이미지 = 대표)
      const detailCol = collection(db, "photo", photoId, "photo_detail");

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const index = String(i + 1).padStart(3, "0"); // 001, 002...
        const imgPath = `photo/${photoId}/images/${index}.jpg`;

        const imgURL = await uploadFile(imgPath, file);

        await addDoc(detailCol, {
          content_id: photoId,
          picture_id: index,
          image_url: imgURL,
          thumb_url: "", // Cloud Function이 thumb_001.jpg 등 자동 추가
        });
      }

      alert("새 앨범이 등록되었습니다!");
      navigate("/admin/photo");
    } catch (err) {
      console.error("🔥 업로드 오류:", err);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📸 새 앨범 등록</h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl bg-white p-6 rounded-2xl shadow-md space-y-6"
      >
        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold mb-2">앨범 제목</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="예: 2025 부활절 예배"
            maxLength={40}
            required
          />
        </div>

        {/* 상세 이미지 여러 장 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            이미지 업로드 (첫 번째 이미지가 대표로 사용됩니다)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files))}
            required
          />
          {imageFiles.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              선택된 파일: {imageFiles.length}개
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/admin/photo")}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={uploading}
            className={`px-4 py-2 rounded text-white ${
              uploading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {uploading ? "업로드 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PhotoForm;
