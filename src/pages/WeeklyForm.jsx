// ✅ WeeklyForm.jsx (다국어 A 스타일 + Validation 적용)

import React, { useState } from "react";
import { db } from "../firebase";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

const WeeklyForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    title_en: "",
    serVerse: "",
    serVerse_en: "",
    serPreacher: "",
    serPreacher_en: "",
    serSummary: "",
    serSummary_en: "",
    file: null,
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
    setFormData((prev) => ({ ...prev, file: null }));
    setUploadProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validation: 모든 한글/영문 필드 필수
    const requiredFields = [
      "title",
      "title_en",
      "serVerse",
      "serVerse_en",
      "serPreacher",
      "serPreacher_en",
      "serSummary",
      "serSummary_en",
    ];

    for (const field of requiredFields) {
      if (!formData[field].trim()) {
        alert("모든 항목의 한글/영문 입력이 필요합니다.");
        return;
      }
    }

    setLoading(true);

    try {
      const weeklyRef = doc(collection(db, "weekly"));
      const id = weeklyRef.id;
      let downloadURL = "";

      // ✅ 파일 업로드 (선택사항)
      if (formData.file) {
        const storage = getStorage();
        const fileRef = ref(storage, `weekly_files/${Date.now()}_${formData.file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, formData.file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress.toFixed(0));
            },
            (error) => reject(error),
            async () => {
              downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // ✅ 시드니 시간 Timestamp
      const now = new Date();
      const sydneyTime = new Date(now.getTime() + 11 * 60 * 60 * 1000);

      // ✅ weekly 저장
      await setDoc(weeklyRef, {
        id,
        title: formData.title,
        title_en: formData.title_en,
        views: 0,
        isActive: true,
        registeredAt: Timestamp.fromDate(sydneyTime),
      });

      // ✅ weekly_detail 저장
      await setDoc(doc(db, "weekly_detail", id), {
        id,
        "ser-verse": formData.serVerse,
        "ser-verse_en": formData.serVerse_en,
        "ser-preacher": formData.serPreacher,
        "ser-preacher_en": formData.serPreacher_en,
        "ser-summary": formData.serSummary,
        "ser-summary_en": formData.serSummary_en,
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

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 제목 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">제목 (KR)</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: 우리는 거룩한 제사장"
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">제목 (EN)</label>
          <input
            type="text"
            name="title_en"
            value={formData.title_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: We Are a Holy Priesthood"
          />
        </div>

        {/* 본문 말씀 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">본문 말씀 (KR)</label>
          <input
            type="text"
            name="serVerse"
            value={formData.serVerse}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: 출애굽기 19장 5-6절"
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">본문 말씀 (EN)</label>
          <input
            type="text"
            name="serVerse_en"
            value={formData.serVerse_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: Exodus 19:5-6"
          />
        </div>

        {/* 설교자 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">설교자 (KR)</label>
          <input
            type="text"
            name="serPreacher"
            value={formData.serPreacher}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: 홍길동 목사"
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">설교자 (EN)</label>
          <input
            type="text"
            name="serPreacher_en"
            value={formData.serPreacher_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="예: Rev. Hong"
          />
        </div>

        {/* 요약 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">설교 요약 (KR)</label>
          <textarea
            name="serSummary"
            value={formData.serSummary}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded min-h-[100px]"
            placeholder="설교 요약 내용을 입력하세요."
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">설교 요약 (EN)</label>
          <textarea
            name="serSummary_en"
            value={formData.serSummary_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded min-h-[100px]"
            placeholder="Enter English summary here."
          />
        </div>

        {/* 파일 업로드 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">파일 첨부</label>

          {!formData.file ? (
            <p className="text-gray-500 text-sm mb-2">선택된 첨부파일이 없습니다.</p>
          ) : (
            <p className="text-gray-700 text-sm mb-2">
              선택된 파일: <strong>{formData.file.name}</strong>
            </p>
          )}

          <div className="flex items-center gap-3">
            <input type="file" accept="image/*,.pdf,.mp3,.mp4" onChange={handleFileSelect} />
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
            <p className="text-sm text-gray-500 mt-1">업로드 중... {uploadProgress}%</p>
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
