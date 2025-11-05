// src/pages/NoticeCommentDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";

function NoticeCommentDetail() {
  const { noticeId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [noticeInfo, setNoticeInfo] = useState(null);
  const [comments, setComments] = useState([]);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        // 1️⃣ 공지 정보 가져오기
        const noticeSnap = await getDoc(doc(db, "notice", noticeId));
        if (noticeSnap.exists()) {
          const n = noticeSnap.data();
          setNoticeInfo({
            title: n.title || "(제목 없음)",
            userName: n.userName || "-",
            registeredAt: n.registeredAt
              ? n.registeredAt.toDate().toLocaleString()
              : "",
          });
        }

        // 2️⃣ 해당 게시글 댓글 조회 (최신순)
        const q = query(
          collection(db, "notice_reply"),
          where("content_id", "==", noticeId),
          orderBy("registeredAt", "Asc")
        );

        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          registeredAt: d.data().registeredAt
            ? d.data().registeredAt.toDate().toLocaleString()
            : "",
        }));

        setComments(list);
      } catch (error) {
        console.error("댓글 조회 실패:", error);
        alert("댓글을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [noticeId]);

  // 🗑️ 댓글 삭제 (Hard Delete)
  const handleDelete = async (commentId) => {
    const confirmDel = window.confirm("해당 댓글을 삭제하시겠습니까?");
    if (!confirmDel) return;

    setDeleting(commentId);
    try {
      await deleteDoc(doc(db, "notice_reply", commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      alert("댓글이 삭제되었습니다.");
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <p className="p-4 text-center">Loading...</p>;

  return (
    <div className="p-6">
      {/* 상단 게시글 정보 */}
      {noticeInfo && (
        <div className="mb-6 p-4 bg-gray-50 border rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-1">📢 {noticeInfo.title}</h2>
          <p className="text-sm text-gray-600">
            작성자: {noticeInfo.userName} &nbsp;|&nbsp; 등록: {noticeInfo.registeredAt}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            총 댓글 수: {comments.length} 개
          </p>
        </div>
      )}

      {/* 뒤로가기 */}
      <button
        onClick={() => navigate("/admin/comments")}
        className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
      >
        ← 댓글 목록으로 돌아가기
      </button>

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <p className="text-center text-gray-500 py-10">등록된 댓글이 없습니다.</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b w-1/6">작성자</th>
              <th className="py-2 px-4 border-b w-3/6">내용</th>
              <th className="py-2 px-4 border-b w-2/6">작성일</th>
              <th className="py-2 px-4 border-b w-1/6">관리</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c) => (
              <tr key={c.id} className="text-center hover:bg-gray-50">
                <td className="py-2 px-4 border-b">{c.userName}</td>
                <td className="py-2 px-4 border-b text-left">{c.content}</td>
                <td className="py-2 px-4 border-b">{c.registeredAt}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className={`px-3 py-1 rounded text-white ${
                      deleting === c.id
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {deleting === c.id ? "삭제 중..." : "🗑️ 삭제"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default NoticeCommentDetail;
