// src/pages/NoticeList.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, storage } from "../firebase";
//import { refFromURL, deleteObject } from "firebase/storage";
import { ref, deleteObject } from "firebase/storage";
import { useNavigate } from "react-router-dom";

function NoticeList() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null); // ✅ 삭제 중인 ID
  const navigate = useNavigate();

  // 🔹 공지 목록 불러오기
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const q = query(collection(db, "notice"), orderBy("registeredAt", "desc"));
        const querySnapshot = await getDocs(q);
        const noticeList = [];

        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          const detailRef = doc(db, "notice_detail", data.id);
          const detailSnap = await getDoc(detailRef);
          const fileURL = detailSnap.exists() ? detailSnap.data().file_url || "" : "";

          noticeList.push({
            id: data.id,
            title: data.title,
            user: data.user,
            registeredAt: data.registeredAt?.toDate().toLocaleString() || "",
            views: data.views,
            isActive: data.isActive,
            file_url: fileURL,
          });
        }

        setNotices(noticeList);
      } catch (error) {
        console.error("🔥 Error fetching notices:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotices();
  }, []);

  // 🔹 공지 삭제 기능 (Storage 포함)
  const handleDelete = async (noticeId) => {
    const confirmDelete = window.confirm("정말로 이 공지를 삭제하시겠습니까?");
    if (!confirmDelete) return;

    setDeletingId(noticeId); // ✅ 로딩 시작
    try {
      // 1️⃣ notice_detail 문서에서 file_url 가져오기
      const detailRef = doc(db, "notice_detail", noticeId);
      const detailSnap = await getDoc(detailRef);
      let fileURL = "";
      if (detailSnap.exists()) fileURL = detailSnap.data().file_url || "";

      // 2️⃣ Storage 파일 삭제
      if (fileURL) {
        try {
            // 🔹 예시 URL:
            // https://firebasestorage.googleapis.com/v0/b/yourapp.appspot.com/o/notice_files%2Fnotice_1730...%2Fmanual.pdf?alt=media
            const decodedPath = decodeURIComponent(
              fileURL.split("/o/")[1].split("?")[0]
            ); // => "notice_files/notice_1730.../manual.pdf"

            const fileRef = ref(storage, decodedPath);
            await deleteObject(fileRef);
            console.log("📁 첨부파일 삭제 완료:", decodedPath);
          } catch (fileErr) {
            console.warn("⚠️ 첨부파일 삭제 실패:", fileErr);
        }
      }

      // 3️⃣ Firestore 문서 삭제
      await deleteDoc(doc(db, "notice", noticeId));
      await deleteDoc(detailRef);

      // 4️⃣ 로컬 상태 갱신
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      alert("공지 및 첨부파일이 모두 삭제되었습니다!");
    } catch (error) {
      console.error("🔥 공지 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null); // ✅ 로딩 종료
    }
  };

  if (loading) return <p className="text-center p-4">Loading...</p>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">공지사항 목록</h2>
        <button
          onClick={() => navigate("/admin/notice/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + 새 공지 등록
        </button>
      </div>

      <table className="min-w-full bg-white border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-4 border-b">제목</th>
            <th className="py-2 px-4 border-b">작성자</th>
            <th className="py-2 px-4 border-b">등록일</th>
            <th className="py-2 px-4 border-b">조회수</th>
            <th className="py-2 px-4 border-b">활성여부</th>
            <th className="py-2 px-4 border-b">첨부파일</th>
            <th className="py-2 px-4 border-b">관리</th>
          </tr>
        </thead>

        <tbody>
          {notices.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 text-center">
              <td className="py-2 px-4 border-b">{item.title}</td>
              <td className="py-2 px-4 border-b">{item.user}</td>
              <td className="py-2 px-4 border-b">{item.registeredAt}</td>
              <td className="py-2 px-4 border-b">{item.views}</td>
              <td className="py-2 px-4 border-b">
                {item.isActive ? "✅ 활성" : "❌ 비활성"}
              </td>
              <td className="py-2 px-4 border-b">
                {item.file_url ? (
                  <button
                    onClick={() => window.open(item.file_url, "_blank")}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    📎 보기
                  </button>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="py-2 px-4 border-b space-x-2">
                <button
                  onClick={() => navigate(`/admin/notice/edit/${item.id}`)}
                  className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500 transition"
                  disabled={deletingId === item.id}
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className={`px-3 py-1 rounded text-white transition ${
                    deletingId === item.id
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {deletingId === item.id ? "삭제 중..." : "🗑️ 삭제"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default NoticeList;
