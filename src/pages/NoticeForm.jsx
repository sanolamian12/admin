// src/pages/NoticeForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore"; // ✅ Timestamp 추가
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function NoticeForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 🔹 파일 업로드 함수
  const handleFileUpload = async (noticeId) => {
    if (!file) return "";

    try {
      setUploading(true);
      const storageRef = ref(storage, `notice_files/${noticeId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("파일 업로드 실패:", error);
      alert("파일 업로드 중 오류가 발생했습니다.");
      return "";
    } finally {
      setUploading(false);
    }
  };

  // 🔹 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim())
      return alert("제목과 내용을 입력하세요.");

    setLoading(true);
    try {
      const noticeId = `notice_${Date.now()}`;
      const fileURL = await handleFileUpload(noticeId);

      // ✅ 시드니(UTC+11) 시간 생성
      const now = new Date();
      const sydneyTime = new Date(now.getTime() + 11 * 60 * 60 * 1000);

      // ✅ notice 문서 등록
      await setDoc(doc(db, "notice", noticeId), {
        id: noticeId,
        title,
        user: "admin",
        registeredAt: Timestamp.fromDate(sydneyTime), // ✅ 변경됨
        isActive: true,
        views: 0,
      });

      // ✅ notice_detail 문서 등록
      await setDoc(doc(db, "notice_detail", noticeId), {
        id: noticeId,
        content,
        file_url: fileURL || "",
      });

      alert("공지 등록 완료!");
      navigate("/admin/notice");
    } catch (error) {
      console.error("🔥 공지 등록 실패:", error);
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-xl p-8">
      <h2 className="text-2xl font-bold mb-6 text-blue-700">📢 새 공지 등록</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 제목 */}
        <div>
          <label className="block font-semibold mb-2">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="공지 제목을 입력하세요"
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block font-semibold mb-2">내용</label>
          <textarea
            rows="6"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="공지 내용을 입력하세요"
          />
        </div>

        {/* 파일 업로드 */}
        <div>
          <label className="block font-semibold mb-2">첨부 파일</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 cursor-pointer"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-2">
              선택된 파일: <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/admin/notice")}
            className="px-5 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className={`px-5 py-2 rounded-lg text-white ${
              loading || uploading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } transition`}
          >
            {uploading
              ? "파일 업로드 중..."
              : loading
              ? "등록 중..."
              : "등록하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NoticeForm;
