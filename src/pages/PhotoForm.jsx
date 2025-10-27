// src/pages/PhotoForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateDoc, doc } from "firebase/firestore";

const PhotoForm = () => {
  const [caption, setCaption] = useState("");
  const [thumbFile, setThumbFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // 🔹 파일 업로드 헬퍼
  const uploadFile = async (path, file) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // 🔹 폴더 구조 & 네이밍 규칙 반영
  //  - cover/thumb_cover.jpg
  //  - images/001.jpg, 002.jpg ...
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption || !thumbFile) {
      alert("제목과 대표 이미지를 모두 선택하세요.");
      return;
    }

    try {
      setUploading(true);

      // 1️⃣ photo 문서 생성 (id 미리 확보)
      const photoRef = await addDoc(collection(db, "photo"), {
        caption,
        user: "admin", // 나중에 auth.currentUser.email 로 교체 가능
        registeredAt: serverTimestamp(),
        isActive: true,
        thumb_url: "",
        views: 0,
      });
      const photoId = photoRef.id;

      // 2️⃣ 썸네일 업로드
      const thumbPath = `photo/${photoId}/cover/thumb_cover.jpg`;
      const thumbURL = await uploadFile(thumbPath, thumbFile);
      //await photoRef.update?.({ thumb_url: thumbURL }); // addDoc 이후 update용 fallback
      await updateDoc(doc(db, "photo", photoId), { thumb_url: thumbURL });

      // 3️⃣ 상세 이미지 업로드 및 photo_detail 생성
      const photoDetailCol = collection(db, "photo_detail");
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const index = String(i + 1).padStart(3, "0"); // 001, 002...
        const imgPath = `photo/${photoId}/images/${index}.jpg`;
        const imgURL = await uploadFile(imgPath, file);

        await addDoc(photoDetailCol, {
          content_id: photoId,
          picture_id: index,
          thumb_url: thumbURL, // 대표 썸네일 재사용 (간단 버전)
          image_url: imgURL,
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        📸 새 앨범 등록
      </h1>

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

        {/* 썸네일 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            대표 썸네일 이미지
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbFile(e.target.files[0])}
            required
          />
        </div>

        {/* 상세 이미지 여러 장 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            상세 이미지 (여러 장 선택 가능)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImageFiles(Array.from(e.target.files))}
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
