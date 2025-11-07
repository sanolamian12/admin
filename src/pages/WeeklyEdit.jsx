// ✅ WeeklyEdit.jsx (다국어 A 스타일 + Validation + 파일 유지/교체 로직 유지)

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";

const WeeklyEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    title_en: "",
    serVerse: "",
    serVerse_en: "",
    serPreacher: "",
    serPreacher_en: "",
    serSummary: "",
    serSummary_en: "",
    fileUrl: "",
    file: null, // 새 파일 선택 시 사용
  });

  // ✅ 기존 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const weeklyRef = doc(db, "weekly", id);
        const detailRef = doc(db, "weekly_detail", id);

        const [weeklySnap, detailSnap] = await Promise.all([
          getDoc(weeklyRef),
          getDoc(detailRef),
        ]);

        if (weeklySnap.exists() && detailSnap.exists()) {
          const weeklyData = weeklySnap.data();
          const detailData = detailSnap.data();

          setFormData({
            title: weeklyData.title || "",
            title_en: weeklyData.title_en || "",
            serVerse: detailData["ser-verse"] || "",
            serVerse_en: detailData["ser-verse_en"] || "",
            serPreacher: detailData["ser-preacher"] || "",
            serPreacher_en: detailData["ser-preacher_en"] || "",
            serSummary: detailData["ser-summary"] || "",
            serSummary_en: detailData["ser-summary_en"] || "",
            fileUrl: detailData.file_url || "",
            file: null,
          });
        } else {
          alert("해당 게시물을 찾을 수 없습니다.");
          navigate("/admin/weekly");
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // ✅ 입력 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ 새 파일 선택
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setFormData((prev) => ({ ...prev, file }));
  };

  // ✅ 파일 선택 취소
  const handleCancelFile = () => {
    setFormData((prev) => ({ ...prev, file: null }));
    setUploadProgress(0);
  };

  // ✅ 수정 제출
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ 필수 Validation
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
      let newFileUrl = formData.fileUrl;
      const storage = getStorage();

      // 🔹 파일 교체 로직: 새 파일 업로드 시 기존 파일 삭제 후 교체
      if (formData.file) {
        if (formData.fileUrl) {
          try {
            const decodedUrl = decodeURIComponent(formData.fileUrl);
            const basePath = decodedUrl.match(/\/o\/(.*?)\?alt=/)?.[1];
            if (basePath) {
              const oldFileRef = ref(storage, basePath);
              await deleteObject(oldFileRef);
              console.log("기존 파일 삭제 완료");
            }
          } catch (err) {
            console.warn("기존 파일 삭제 중 오류:", err.message);
          }
        }

        const newRef = ref(storage, `weekly_files/${Date.now()}_${formData.file.name}`);
        const uploadTask = uploadBytesResumable(newRef, formData.file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress.toFixed(0));
            },
            (error) => reject(error),
            async () => {
              newFileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // ✅ Firestore 업데이트
      const weeklyRef = doc(db, "weekly", id);
      const detailRef = doc(db, "weekly_detail", id);

      await updateDoc(weeklyRef, {
        title: formData.title,
        title_en: formData.title_en,
        registeredAt: serverTimestamp(),
      });

      await updateDoc(detailRef, {
        "ser-verse": formData.serVerse,
        "ser-verse_en": formData.serVerse_en,
        "ser-preacher": formData.serPreacher,
        "ser-preacher_en": formData.serPreacher_en,
        "ser-summary": formData.serSummary,
        "ser-summary_en": formData.serSummary_en,
        file_url: newFileUrl,
      });

      alert("게시물이 수정되었습니다!");
      navigate(`/admin/weekly/${id}`);
    } catch (error) {
      console.error("수정 실패:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-center py-10 text-gray-600">불러오는 중...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-sm">
      <h2 className="text-2xl font-bold mb-4">✏️ 예배 게시물 수정</h2>

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
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">제목 (EN)</label>
          <input
            type="text"
            name="title_en"
            value={formData.title_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
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
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">본문 말씀 (EN)</label>
          <input
            type="text"
            name="serVerse_en"
            value={formData.serVerse_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
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
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">설교자 (EN)</label>
          <input
            type="text"
            name="serPreacher_en"
            value={formData.serPreacher_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
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
          />

          <label className="block font-semibold text-gray-700 mt-3 mb-1">설교 요약 (EN)</label>
          <textarea
            name="serSummary_en"
            value={formData.serSummary_en}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded min-h-[100px]"
          />
        </div>

        {/* 파일 */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">첨부파일</label>

          {formData.fileUrl && !formData.file && (
            <p className="text-sm text-gray-700 mb-2">
              현재 파일:{" "}
              <a
                href={formData.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                파일 열기
              </a>
            </p>
          )}

          {formData.file && (
            <p className="text-sm text-gray-700 mb-2">
              새 파일 선택: <strong>{formData.file.name}</strong>
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
            <p className="text-sm text-gray-500 mt-1">
              업로드 중... {uploadProgress}%
            </p>
          )}
        </div>

        {/* 수정 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition disabled:opacity-60"
        >
          {loading ? "수정 중..." : "수정하기"}
        </button>
      </form>
    </div>
  );
};

export default WeeklyEdit;
