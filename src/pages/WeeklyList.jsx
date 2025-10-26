import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage"; // ✅ 추가

const WeeklyList = () => {
  const [weeklyList, setWeeklyList] = useState([]);
  const navigate = useNavigate();

  // Firestore에서 데이터 가져오기
  const fetchWeeklyList = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "weekly"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWeeklyList(list);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    }
  };

  useEffect(() => {
    fetchWeeklyList();
  }, []);

  // ✅ 첨부파일 + 문서 동시 삭제 기능
  const handleDelete = async (id) => {
    if (!window.confirm("정말 이 게시물을 삭제하시겠습니까?")) return;

    try {
      const storage = getStorage();

      // 1️⃣ weekly_detail 문서 확인
      const detailRef = doc(db, "weekly_detail", id);
      const detailSnap = await getDoc(detailRef);

      if (detailSnap.exists()) {
        const detailData = detailSnap.data();
        const fileUrl = detailData.file_url;

        // 2️⃣ Storage 파일 삭제
        if (fileUrl) {
          try {
            // URL에서 실제 Storage 경로 추출
            const decodedUrl = decodeURIComponent(fileUrl);
            const basePath = decodedUrl.match(/\/o\/(.*?)\?alt=/)?.[1];
            if (basePath) {
              const fileRef = ref(storage, basePath);
              await deleteObject(fileRef);
              console.log(`✅ Storage 파일 삭제 완료: ${basePath}`);
            }
          } catch (err) {
            console.warn("⚠️ 파일 삭제 중 오류 (무시 가능):", err.message);
          }
        }

        // 3️⃣ weekly_detail 문서 삭제
        await deleteDoc(detailRef);
      }

      // 4️⃣ weekly 문서 삭제
      await deleteDoc(doc(db, "weekly", id));

      alert("게시물 및 첨부파일이 삭제되었습니다.");
      fetchWeeklyList(); // 목록 갱신
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">주간 예배 게시물 목록</h2>
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b text-left">제목</th>
            <th className="py-2 px-4 border-b text-left">등록일</th>
            <th className="py-2 px-4 border-b text-left">조회수</th>
            <th className="py-2 px-4 border-b text-left">관리</th>
          </tr>
        </thead>
        <tbody>
          {weeklyList.length > 0 ? (
            weeklyList.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer hover:bg-gray-50 transition"
                onClick={() => navigate(`/admin/weekly/${item.id}`)}
              >
                <td className="py-2 px-4 border-b">{item.title}</td>
                <td className="py-2 px-4 border-b">
                  {item.registeredAt?.toDate
                    ? item.registeredAt.toDate().toLocaleDateString()
                    : "-"}
                </td>
                <td className="py-2 px-4 border-b">{item.views || 0}</td>
                <td className="py-2 px-4 border-b">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 상세 이동 방지
                      handleDelete(item.id);
                    }}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="py-4 text-center">
                게시물이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default WeeklyList;
