import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
// 경로 확장자 명시
import { db } from "../firebase.js"; 

const CalendarList = () => {
  const [data, setData] = useState([]);

  // Firestore 컬렉션 참조
  const calendarRef = collection(db, "calendar");

  // 일정 불러오기 (데이터 변경 실시간 반영을 위해 onSnapshot 대신 getDocs 사용)
  const fetchData = async () => {
    try {
        // NOTE: orderBy를 사용할 때 Firestore index가 필요할 수 있습니다.
        const q = query(calendarRef, orderBy("eventDay", "desc"));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(list);
    } catch (error) {
        console.error("일정 데이터 로딩 중 오류 발생:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 일정 삭제
  const handleDelete = async (id) => {
    // 경고: alert() 대신 커스텀 모달 UI를 사용하는 것이 권장됩니다.
    if (window.confirm("이 일정을 완전히 삭제하고 재등록하시겠습니까?")) { 
      try {
        await deleteDoc(doc(db, "calendar", id));
        fetchData(); // 삭제 후 목록 새로고침
        console.log("일정 삭제 완료:", id);
      } catch (error) {
        console.error("일정 삭제 중 오류 발생:", error);
        alert("일정 삭제에 실패했습니다. 콘솔을 확인해주세요.");
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-2">📅 Calendar List</h2>

      {/* 일정 목록 테이블 */}
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Event Day</th>
              <th className="px-4 py-2">Content</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b hover:bg-gray-50 ${
                  !row.isActive ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{row.eventDay}</td>
                <td className="px-4 py-2">{row.content}</td>
                <td className="px-4 py-2">{row.user}</td>
                <td className="px-4 py-2 text-center">
                  {row.isActive ? "✅" : "❌"}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  등록된 일정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-500 mt-4 italic">
        * 참고: 컨텐츠 수정이 필요한 경우, 해당 일정을 [Delete] 후 [새 일정 등록하기]를 이용해 주십시오.
      </p>
    </div>
  );
};

export default CalendarList;