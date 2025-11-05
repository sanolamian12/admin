import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase.js";

const CalendarList = () => {
  const [data, setData] = useState([]);

  const calendarRef = collection(db, "calendar");

  const fetchData = async () => {
    try {
      const q = query(calendarRef, orderBy("eventDay", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));
      setData(list);
    } catch (error) {
      console.error("일정 데이터 로딩 중 오류 발생:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("정말로 이 일정을 완전히 삭제하시겠습니까? 복구할 수 없습니다.")) {
      try {
        await deleteDoc(doc(db, "calendar", id));
        fetchData();
      } catch (error) {
        console.error("일정 삭제 중 오류 발생:", error);
        alert("일정 삭제에 실패했습니다. 콘솔을 확인해주세요.");
      }
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-2">📅 Calendar List</h2>

      <div className="overflow-x-auto mt-4">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Event Day</th>
              <th className="px-4 py-2">Content</th>
              <th className="px-4 py-2">Writer</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b hover:bg-gray-50 ${row.isActive === false ? "opacity-50" : ""}`}
              >
                <td className="px-4 py-2">{idx + 1}</td>
                <td className="px-4 py-2">{row.eventDay}</td>
                <td className="px-4 py-2">{row.content}</td>
                <td className="px-4 py-2">{row.userName}</td>
                <td className="px-4 py-2 text-center">{row.isActive ? "✅" : "❌"}</td>
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
        * 수정 기능은 없습니다. 필요한 경우 삭제 후 새 일정 등록을 이용하세요.
      </p>
    </div>
  );
};

export default CalendarList;
