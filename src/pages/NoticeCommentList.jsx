// src/pages/NoticeCommentList.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

function NoticeCommentList() {
  const [loading, setLoading] = useState(true);
  const [commentData, setCommentData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchComments = async () => {
      try {
        // 1️⃣ 모든 댓글 조회 (최신순)
        const replyQ = query(collection(db, "notice_reply"), orderBy("registeredAt", "desc"));
        const replySnap = await getDocs(replyQ);

        const commentMap = {};

        // 2️⃣ noticeId(content_id) 기준 그룹핑
        for (const docSnap of replySnap.docs) {
          const r = docSnap.data();
          const noticeId = r.content_id;

          if (!commentMap[noticeId]) {
            commentMap[noticeId] = { noticeId, comments: [], latest: null };
          }
          commentMap[noticeId].comments.push(r);

          // 최신 댓글 시간 기록
          if (!commentMap[noticeId].latest || r.registeredAt > commentMap[noticeId].latest) {
            commentMap[noticeId].latest = r.registeredAt;
          }
        }

        // 3️⃣ 그룹핑된 게시글의 제목/작성자 가져오기
        const result = [];
        for (const noticeId of Object.keys(commentMap)) {
          const noticeRef = doc(db, "notice", noticeId);
          const noticeSnap = await getDoc(noticeRef);

          if (noticeSnap.exists()) {
            const n = noticeSnap.data();
            result.push({
              noticeId,
              title: n.title || "(제목 없음)",
              userName: n.userName || "-",
              commentCount: commentMap[noticeId].comments.length,
              latestAt: commentMap[noticeId].latest
                ? commentMap[noticeId].latest.toDate().toLocaleString()
                : "",
            });
          }
        }

        // 최신 댓글 시각 기준 정렬
        result.sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));
        setCommentData(result);
      } catch (error) {
        console.error("댓글 목록 불러오기 실패:", error);
        alert("댓글 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  if (loading) return <p className="p-4 text-center">Loading...</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">💬 댓글이 달린 게시글 목록</h2>

      {commentData.length === 0 ? (
        <p className="text-center text-gray-500 py-10">댓글이 달린 게시글이 없습니다.</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b">게시글 제목</th>
              <th className="py-2 px-4 border-b">작성자</th>
              <th className="py-2 px-4 border-b">댓글 수</th>
              <th className="py-2 px-4 border-b">최신 댓글</th>
              <th className="py-2 px-4 border-b">관리</th>
            </tr>
          </thead>
          <tbody>
            {commentData.map((item) => (
              <tr key={item.noticeId} className="hover:bg-gray-50 text-center">
                <td className="py-2 px-4 border-b">{item.title}</td>
                <td className="py-2 px-4 border-b">{item.userName}</td>
                <td className="py-2 px-4 border-b">{item.commentCount}</td>
                <td className="py-2 px-4 border-b">{item.latestAt}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={() => navigate(`/admin/comments/${item.noticeId}`)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                  >
                    보기
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

export default NoticeCommentList;
