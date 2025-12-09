// ✅ WeeklyList.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";

const WeeklyList = () => {
  const [weeklyList, setWeeklyList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // 👈 현재 페이지
  const itemsPerPage = 50; // 👈 페이지당 항목 수: 50개 고정

  const navigate = useNavigate();

  // Firestore에서 데이터 가져오기 및 정렬
  const fetchWeeklyList = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "weekly"));
      let list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 1. ✅ 최신 날짜(registeredAt) 기준 내림차순 정렬
      list.sort((a, b) => {
        // Timestamp 객체를 가정하고 getTime()으로 비교 (밀리초)
        const dateA = a.registeredAt?.toDate ? a.registeredAt.toDate().getTime() : 0;
        const dateB = b.registeredAt?.toDate ? b.registeredAt.toDate().getTime() : 0;
        return dateB - dateA; // 내림차순 (최신 날짜가 위로)
      });

      setWeeklyList(list);
      setCurrentPage(1); // 새로운 목록을 가져올 때 페이지를 1로 초기화
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    }
  };

  useEffect(() => {
    fetchWeeklyList();
  }, []);

  // ✅ 첨부파일 + 문서 동시 삭제 기능 (기존 로직 유지)
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

  // 2. ✅ 페이지네이션 계산 및 현재 페이지 데이터 추출
  const totalPages = Math.ceil(weeklyList.length / itemsPerPage);

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return weeklyList.slice(startIndex, endIndex);
  }, [weeklyList, currentPage, itemsPerPage]); // 의존성 배열에 weeklyList 추가

  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 페이지네이션 버튼 렌더링
  const renderPagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 10; // 화면에 표시할 최대 페이지 번호 수

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex justify-center mt-4 space-x-2">
        {/* 이전 버튼 */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          이전
        </button>

        {/* 첫 페이지로 이동 (필요하다면) */}
        {startPage > 1 && (
            <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-1 border rounded hover:bg-gray-100"
            >
                1...
            </button>
        )}

        {/* 페이지 번호들 */}
        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => handlePageChange(number)}
            className={`px-3 py-1 border rounded ${
              number === currentPage ? "bg-blue-500 text-white" : "hover:bg-gray-100"
            }`}
          >
            {number}
          </button>
        ))}

        {/* 마지막 페이지로 이동 (필요하다면) */}
        {endPage < totalPages && (
            <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1 border rounded hover:bg-gray-100"
            >
                ...{totalPages}
            </button>
        )}

        {/* 다음 버튼 */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          다음
        </button>
      </div>
    );
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
          {/* ✅ currentItems로 변경하여 현재 페이지 항목만 표시 */}
          {currentItems.length > 0 ? (
            currentItems.map((item) => (
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
              {/* 전체 리스트가 비어있을 때만 표시 */}
              <td colSpan="4" className="py-4 text-center">
                {weeklyList.length === 0 ? "게시물이 없습니다." : "현재 페이지에 표시할 게시물이 없습니다."}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 2. ✅ 페이지네이션 컨트롤 추가 */}
      {totalPages > 1 && renderPagination()}

    </div>
  );
};

export default WeeklyList;