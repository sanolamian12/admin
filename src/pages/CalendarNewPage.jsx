import React from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import CalendarForm from "../pages/CalendarForm.jsx";

const CalendarNewPage = () => {
  const navigate = useNavigate();
  const calendarRef = collection(db, "calendar");

  // ✅ 관리자 정보 (임시)
  // TODO: 실제 Auth에서 가져오도록 수정 필요
  const userUid = "admin_uid";
  const userName = "관리자";

  // DB에 새 일정 추가
  const handleAddSubmit = async (formData) => {
    try {
      await addDoc(calendarRef, formData);

      console.log("✅ 새 일정 등록 완료");
      navigate("/admin/calendar");
    } catch (error) {
      console.error("❌ 일정 등록 오류:", error);
      alert("일정 등록 실패. 콘솔을 확인해주세요.");
    }
  };

  const handleCancel = () => {
    navigate("/admin/calendar");
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">🗓 새 일정 등록</h1>

      <CalendarForm
        onSubmit={handleAddSubmit}
        onCancel={handleCancel}
        userUid={userUid}
        userName={userName}
      />
    </div>
  );
};

export default CalendarNewPage;
