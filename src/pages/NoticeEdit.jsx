// src/pages/NoticeEdit.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function NoticeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [notice, setNotice] = useState({
    title: "",
    isActive: true,
  });
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 Firestore에서 기존 데이터 불러오기
  useEffect(() => {
    const fetchNotice = async () => {
      try {
        const noticeDoc = await getDoc(doc(db, "notice", id));
        const detailDoc = await getDoc(doc(db, "notice_detail", id));

        if (noticeDoc.exists()) {
          const nData = noticeDoc.data();
          setNotice({
            title: nData.title,
            isActive: nData.isActive,
          });
        }

        if (detailDoc.exists()) {
          setContent(detailDoc.data().content || "");
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

  // 🔹 Firestore 업데이트
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!notice.title.trim()) return alert("제목을 입력하세요.");

    try {
      await updateDoc(doc(db, "notice", id), {
        title: notice.title,
        isActive: notice.isActive,
      });

      await updateDoc(doc(db, "notice_detail", id), {
        content,
      });

      alert("공지 수정이 완료되었습니다!");
      navigate("/admin/notice");
    } catch (error) {
      console.error("공지 수정 실패:", error);
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <p className="text-center p-4">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-xl p-8">
      <h2 className="text-2xl font-bold mb-6 text-blue-700">✏️ 공지 수정</h2>

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* 제목 */}
        <div>
          <label className="block font-semibold mb-2">제목</label>
          <input
            type="text"
            value={notice.title}
            onChange={(e) => setNotice({ ...notice, title: e.target.value })}
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

        {/* 활성화 여부 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={notice.isActive}
            onChange={(e) => setNotice({ ...notice, isActive: e.target.checked })}
            className="w-5 h-5 accent-blue-600"
          />
          <label htmlFor="isActive" className="font-medium text-gray-700">
            공지 활성화 (체크 해제 시 비활성화)
          </label>
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
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}

export default NoticeEdit;
