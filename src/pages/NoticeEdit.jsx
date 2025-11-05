// src/pages/NoticeEdit.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, storage } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

function NoticeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [notice, setNotice] = useState({
    title: "",
    isActive: true,
    userName: "",
    registeredAt: "",
    updatedAt: "",
  });

  const [content, setContent] = useState("");
  const [fileURL, setFileURL] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔹 Firestore에서 기존 데이터 불러오기
  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const noticeDoc = await getDoc(doc(db, "notice", id));
        const detailDoc = await getDoc(doc(db, "notice_detail", id));

        if (noticeDoc.exists()) {
          const n = noticeDoc.data();
          setNotice({
            title: n.title || "",
            isActive: n.isActive ?? true,
            userName: n.userName || "",
            registeredAt: n.registeredAt
              ? n.registeredAt.toDate().toLocaleString()
              : "",
            updatedAt: n.updatedAt
              ? n.updatedAt.toDate().toLocaleString()
              : "",
          });
        }

        if (detailDoc.exists()) {
          const d = detailDoc.data();
          setContent(d.content || "");
          setFileURL(d.file_url || "");
        }
      } catch (error) {
        console.error("공지 데이터 불러오기 실패:", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [id]);

  // 🔹 파일 업로드/교체
  const handleFileReplace = async () => {
    if (!newFile) return fileURL;

    try {
      if (fileURL) {
        try {
          const decodedPath = decodeURIComponent(
            fileURL.split("/o/")[1].split("?")[0]
          );
          const oldRef = ref(storage, decodedPath);
          await deleteObject(oldRef);
          console.log("📁 기존 첨부파일 삭제 완료");
        } catch (err) {
          console.warn("⚠️ 기존 파일 삭제 실패:", err);
        }
      }

      const newRef = ref(storage, `notice/${id}/${newFile.name}`);
      await uploadBytes(newRef, newFile);
      return await getDownloadURL(newRef);
    } catch (error) {
      console.error("파일 교체 중 오류:", error);
      alert("첨부파일 교체 중 오류가 발생했습니다.");
      return fileURL;
    }
  };

  // 🔹 공지 수정 저장
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!notice.title.trim()) return alert("제목을 입력하세요.");

    setSaving(true);
    try {
      const updatedFileURL = await handleFileReplace();

      await updateDoc(doc(db, "notice", id), {
        title: notice.title,
        isActive: notice.isActive,
        updatedAt: serverTimestamp(), // ✅ 수정일 갱신
      });

      await updateDoc(doc(db, "notice_detail", id), {
        content,
        file_url: updatedFileURL,
      });

      alert("공지 수정이 완료되었습니다!");
      navigate("/admin/notice");
    } catch (error) {
      console.error("공지 수정 실패:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <p className="text-center p-4">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-xl p-8 relative">

      {/* 🔹 작성자/등록일/수정일 Info Box (오른쪽 상단) */}
      <div className="absolute right-6 top-6 text-right text-gray-500 text-sm leading-5">
        <p><strong>작성자:</strong> {notice.userName || "-"}</p>
        {notice.registeredAt && <p>등록: {notice.registeredAt}</p>}
        {notice.updatedAt && <p>수정: {notice.updatedAt}</p>}
      </div>

      <h2 className="text-2xl font-bold mb-10 text-blue-700">✏️ 공지 수정</h2>

      <form onSubmit={handleUpdate} className="space-y-6">

        {/* 제목 */}
        <div>
          <label className="block font-semibold mb-2">제목</label>
          <input
            type="text"
            value={notice.title}
            onChange={(e) =>
              setNotice({ ...notice, title: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="block font-semibold mb-2">내용</label>
          <textarea
            rows="6"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 첨부파일 */}
        <div>
          <label className="block font-semibold mb-2">첨부파일</label>
          {fileURL ? (
            <div className="flex items-center gap-4">
              <a
                href={fileURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                📎 현재 파일 열기
              </a>
              <span className="text-gray-500">또는 새 파일로 교체</span>
            </div>
          ) : (
            <p className="text-gray-500">첨부된 파일 없음</p>
          )}
          <input
            type="file"
            onChange={(e) => setNewFile(e.target.files[0])}
            className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 cursor-pointer"
          />
        </div>

        {/* 활성화 여부 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={notice.isActive}
            onChange={(e) =>
              setNotice({ ...notice, isActive: e.target.checked })
            }
            className="w-5 h-5 accent-blue-600"
          />
          <label htmlFor="isActive" className="font-medium text-gray-700">
            공지 활성화 (체크 해제 시 비활성화)
          </label>
        </div>

        {/* 버튼 */}
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
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-white ${
              saving
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } transition`}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NoticeEdit;
