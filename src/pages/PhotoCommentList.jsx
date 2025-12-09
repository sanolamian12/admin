// src/pages/PhotoCommentList.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase"; // Firebase DB 인스턴스 import

const PhotoCommentList = () => {
  const [photoComments, setPhotoComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔹 댓글 데이터를 가져와 photoId별로 집계하는 함수
  const fetchPhotoCommentSummary = useCallback(async () => {
    try {
      // 1. 컬렉션 이름을 photo_reply로 변경합니다.
      const commentsSnap = await getDocs(collection(db, "photo_reply"));

      const commentGroups = {};
      const fetchPromises = [];

      for (const d of commentsSnap.docs) {
        const commentData = { id: d.id, ...d.data() };
        // 2. photoId 필드 이름을 content_id로 변경합니다.
        const photoId = commentData.content_id;

        if (!photoId) continue;

        if (!commentGroups[photoId]) {
          commentGroups[photoId] = {
            photoId: photoId,
            commentCount: 0,
            reportedCount: 0,
            photoTitle: "로딩 중...",
          };

          // 3. photo 문서에서 제목을 가져오는 Promise를 배열에 추가
          fetchPromises.push(
            getDoc(doc(db, "photo", photoId)).then(photoDoc => {
                if (photoDoc.exists()) {
                    // photo 컬렉션에는 caption 필드가 있다고 가정합니다.
                    commentGroups[photoId].photoTitle = photoDoc.data().caption || "제목 없음";
                } else {
                    commentGroups[photoId].photoTitle = "삭제된 앨범";
                }
            })
          );
        }

        // 4. 댓글 수 및 신고 수 집계 (isReported 필드가 없다고 가정하고, 일단 isActive를 사용하지 않음)
        commentGroups[photoId].commentCount += 1;
        // *참고: isReported 필드 대신 isActive 필드(boolean)가 있으나, 이는 댓글 활성화 여부입니다.
        // 신고 기능을 별도로 사용하지 않는다면 reportedCount 로직을 제거할 수 있습니다.
        // 여기서는 기존 구조 유지를 위해 신고 필드는 0으로 처리합니다.
      }

      await Promise.all(fetchPromises);

      const sortedList = Object.values(commentGroups).sort(
        (a, b) => b.commentCount - a.commentCount
      );

      setPhotoComments(sortedList);
    } catch (err) {
      console.error("🔥 Error loading photo comments summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotoCommentSummary();
  }, [fetchPhotoCommentSummary]);

  const handleDetailClick = (photoId) => {
    navigate(`/admin/photo-comments/${photoId}`);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">댓글 목록 로딩 중...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📸 사진 별 댓글 관리</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
              <th className="px-4 py-3 border-b">사진 ID</th>
              <th className="px-4 py-3 border-b">사진 앨범 제목</th>
              <th className="px-4 py-3 border-b text-center">총 댓글 수</th>
              {/* 신고 기능이 없으므로 신고된 댓글 수 항목은 제거합니다. */}
              <th className="px-4 py-3 border-b text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {photoComments.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                  댓글이 등록된 사진 앨범이 없습니다.
                </td>
              </tr>
            ) : (
              photoComments.map((p) => (
                <tr key={p.photoId} className="hover:bg-gray-50 transition duration-150">
                  <td className="px-4 py-3 border-b text-sm text-gray-800">{p.photoId}</td>
                  <td className="px-4 py-3 border-b font-medium text-gray-900">{p.photoTitle}</td>
                  <td className="px-4 py-3 border-b text-center text-sm">{p.commentCount}</td>
                  <td className="px-4 py-3 border-b text-right">
                    <button
                      onClick={() => handleDetailClick(p.photoId)}
                      className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 transition"
                    >
                      댓글 상세 관리
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PhotoCommentList;