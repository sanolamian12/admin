// src/pages/WeeklyForm.jsx
import React, { useState } from "react";
import { db } from "../firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

const WeeklyForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    serVerse: "",
    serPreacher: "",
    serSummary: "",
    file: null,
    fileUrl: "",
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
      setUploadProgress(0);
    }
  };

  const handleCancelFile = () => {
    setFormData((prev) => ({ ...prev, file: null, fileUrl: "" }));
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const weeklyRef = doc(collection(db, "weekly"));
      const id = weeklyRef.id;
      let downloadURL = "";

      // ✅ (1) 파일 업로드 (선택된 경우에만)
      if (formData.file) {
        const storage = getStorage();
        const fileRef = ref(storage, `weekly_files/${Date.now()}_${formData.file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, formData.file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress.toFixed(0));
            },
            (error) => {
              console.error("업로드 실패:", error);
              reject(error);
            },
            async () => {
              downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // ✅ (2) Firestore 등록 — 누락 필드 추가됨
      await setDoc(weeklyRef, {
        id,
        title: formData.title,
        views: 0,

        // 🔹 추가된 필드
        isActive: true,                // ✅ 활성화 상태 (앱 필터 조건용)
        registeredAt: serverTimestamp(), // ✅ 정렬 및 최신순 표시용
      });

      // ✅ (3) 세부 내용 테이블
      await setDoc(doc(db, "weekly_detail", id), {
        id,
        "ser-verse": formData.serVerse,
        "ser-preacher": formData.serPreacher,
        "ser-summary": formData.serSummary,
        file_url: downloadURL,
      });

      alert("예배 게시물이 등록되었습니다!");
      navigate("/admin/weekly");
    } catch (error) {
      console.error("등록 실패:", error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm">
      <h2 className="text-2xl font-bold mb-4">⛪ 주간 예배 등록</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 제목 */}
        <div>
          <label className="block text-gray-700 mb-1">제목</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: 10월 26일 주일예배"
          />
        </div>

        {/* 본문 말씀 */}
        <div>
          <label className="block text-gray-700 mb-1">본문 말씀</label>
          <input
            type="text"
            name="serVerse"
            value={formData.serVerse}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: 요한복음 3:16"
          />
        </div>

        {/* 설교자 */}
        <div>
          <label className="block text-gray-700 mb-1">설교자</label>
          <input
            type="text"
            name="serPreacher"
            value={formData.serPreacher}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: 홍길동 목사"
          />
        </div>

        {/* 요약 */}
        <div>
          <label className="block text-gray-700 mb-1">요약</label>
          <textarea
            name="serSummary"
            value={formData.serSummary}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded min-h-[100px]"
            placeholder="설교 요약 내용을 입력하세요."
          />
        </div>

        {/* 파일 업로드 */}
        <div>
          <label className="block text-gray-700 mb-1">파일 첨부</label>
          {!formData.file ? (
            <p className="text-gray-500 text-sm mb-2">
              선택된 첨부파일이 없습니다.
            </p>
          ) : (
            <p className="text-gray-700 text-sm mb-2">
              선택된 파일: <strong>{formData.file.name}</strong>
            </p>
          )}

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*,.pdf,.mp3,.mp4"
              onChange={handleFileSelect}
            />
            {formData.file && (
              <button
                type="button"
                onClick={handleCancelFile}
                className="text-red-600 text-sm underline hover:text-red-800"
              >
                취소
              </button>
            )}
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <p className="text-sm text-gray-500 mt-1">
              업로드 중... {uploadProgress}%
            </p>
          )}
        </div>

        {/* 등록 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
        >
          {loading ? "등록 중..." : "등록하기"}
        </button>
      </form>
    </div>
  );
};

export default WeeklyForm;
