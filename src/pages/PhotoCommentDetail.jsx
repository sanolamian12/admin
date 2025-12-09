// src/pages/PhotoCommentDetail.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase"; // Firebase DB 인스턴스 import

const PhotoCommentDetail = () => {
  const { photoId } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [photoTitle, setPhotoTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 특정 photoId에 해당하는 댓글 목록을 가져오는 함수
  const fetchComments = useCallback(async () => {
    try {
      // 1. 사진 제목 가져오기
      const photoDoc = await getDoc(doc(db, "photo", photoId));
      if (photoDoc.exists()) {
        setPhotoTitle(photoDoc.data().caption || "제목 없음");
      } else {
        setPhotoTitle("삭제되었거나 찾을 수 없는 앨범");
      }

      // 2. photo_reply 컬렉션에서 해당 content_id에 연결된 댓글만 쿼리
      const q = query(
        collection(db, "photo_reply"), // 컬렉션 이름 변경
        where("content_id", "==", photoId), // 필드 이름 변경
        orderBy("registeredAt", "desc")
      );

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setComments(data);

    } catch (err) {
      console.error("🔥 Error loading photo comments:", err);
    } finally {
      setLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 🧨 댓글 삭제 (Hard Delete)
  const handleDeleteComment = async (commentId) => {
    const ok = window.confirm(
      `⚠️ 댓글 ID ${commentId}를 삭제하시겠습니까?\n삭제 시 복구가 불가능합니다.`
    );
    if (!ok) return;

    try {
      // 1. Firestore: photo_reply 문서 삭제
      await deleteDoc(doc(db, "photo_reply", commentId));

      // 2. UI 갱신
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      alert(`✅ 댓글 ID ${commentId}가 삭제되었습니다.`);
    } catch (err) {
      console.error("⚠️ Error deleting comment:", err);
      alert("댓글 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">댓글 상세 로딩 중...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          💬 "{photoTitle}" 댓글 관리
        </h1>
        <button
          onClick={() => navigate("/admin/photo-comments")}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
        >
          ↩️ 전체 댓글 목록으로
        </button>
      </div>

      <div className="mb-4 text-lg font-medium">
        총 댓글 수: <span className="text-blue-600">{comments.length}</span>
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="p-4 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg">
            이 앨범에 등록된 댓글이 없습니다.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              // isActive가 false인 경우 (비활성화된 댓글)에만 경고 표시
              className={`p-4 border rounded-lg shadow-sm bg-white ${
                comment.isActive === false ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold text-gray-800">
                  {/* userName 필드를 사용합니다. */}
                  작성자: {comment.userName || "Unknown"} (UID: {comment.userUid ? comment.userUid.substring(0, 8) : '없음'})
                  {comment.isActive === false && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-yellow-600 rounded">
                      ⚠️ 비활성
                    </span>
                  )}
                </p>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-semibold"
                >
                  삭제
                </button>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap mb-2">
                {comment.content || "내용 없음"}
              </p>

              <div className="text-xs text-gray-500">
                댓글 ID: {comment.id} | 작성일: {
                  comment.registeredAt
                    ? new Date(comment.registeredAt.toDate()).toLocaleString('ko-KR')
                    : '날짜 정보 없음'
                }
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PhotoCommentDetail;