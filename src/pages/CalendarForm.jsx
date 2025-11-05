import React, { useState } from "react";
import { serverTimestamp } from "firebase/firestore";

const CalendarForm = ({ onSubmit, onCancel, userUid, userName }) => {
  const [eventDay, setEventDay] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = {
      eventDay,
      content,
      userUid,
      userName,
      isActive: true,              // ✅ 신규 등록은 항상 true
      registeredAt: serverTimestamp(), // ✅ Firestore 서버시간
    };

    onSubmit(formData);

    setEventDay("");
    setContent("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-gray-100 rounded-lg border border-gray-300 mt-4"
    >
      <h3 className="text-lg font-semibold mb-3">🗓 새 일정 등록</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">Event Date</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1"
            value={eventDay}
            onChange={(e) => setEventDay(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block mb-1 font-medium">Content (20자 이내 권장)</label>
        <input
          type="text"
          className="w-full border rounded px-2 py-1"
          placeholder="예: 주일예배, 청년부 모임 등"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={20}
          required
        />
      </div>

      {/* ✅ 작성자 정보는 사용자에게 보여주되 수정 불가 */}
      <div className="mt-3 text-sm text-gray-600">
        등록자: <b>{userName}</b>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default CalendarForm;
