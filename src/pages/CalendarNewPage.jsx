import React from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  Timestamp,
} from "firebase/firestore";
// 경로 확장자 명시
import { db } from "../firebase.js";
import CalendarForm from "../pages/CalendarForm.jsx"; // 경로 확장자 명시

const CalendarNewPage = () => {
  const navigate = useNavigate();
  // Firestore 컬렉션 참조
  const calendarRef = collection(db, "calendar");

  // DB에 새 일정 추가 및 목록으로 이동하는 최종 onSubmit 핸들러
  const handleAddSubmit = async (formData) => {
    try {
      // 폼 데이터를 가져와 등록 시각 추가
      const newData = {
        ...formData,
        registeredAt: Timestamp.now(),
      };

      // DB 추가 로직 실행
      await addDoc(calendarRef, newData);

      console.log("새 일정이 성공적으로 등록되었습니다.");
      // 등록 후 목록 화면으로 이동
      navigate("/admin/calendar");

    } catch (error) {
      console.error("일정 등록 중 오류 발생:", error);
      // 사용자에게 에러 메시지를 표시하는 UI 로직이 필요합니다.
      alert("일정 등록에 실패했습니다. 콘솔을 확인해주세요.");
    }
  };

  // [Cancel] 버튼 클릭 시 목록 화면으로 이동
  const handleCancel = () => {
    // DB 입력 없이, 목록 화면으로 이동
    navigate("/admin/calendar");
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">🗓 새 일정 등록</h1>
      {/* CalendarForm에 DB 저장 로직 함수를 onSubmit으로 전달 */}
      <CalendarForm
        // 단순 등록 전용이므로 initialData는 전달하지 않음
        onSubmit={handleAddSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default CalendarNewPage;