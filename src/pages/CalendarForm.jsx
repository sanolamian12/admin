import React, { useState } from "react";

const CalendarForm = ({ onSubmit, onCancel }) => {
  const [eventDay, setEventDay] = useState("");
  const [content, setContent] = useState("");
  const [user, setUser] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();

    // ✅ 시드니(UTC+11) 기준 시간 생성
    const now = new Date();
    const sydneyTime = new Date(now.getTime() + 11 * 60 * 60 * 1000);

    const formData = {
      eventDay,
      content,
      user,
      isActive,
      registeredAt: sydneyTime, // ✅ 보정된 시간 전달
    };

    onSubmit(formData);

    // 제출 후 폼 초기화
    setEventDay("");
    setContent("");
    setUser("");
    setIsActive(true);
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

        <div>
          <label className="block mb-1 font-medium">User (Uploader)</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1"
            placeholder="작성자 UID 또는 이름"
            value={user}
            onChange={(e) => setUser(e.target.value)}
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

      <div className="flex items-center mt-3">
        <input
          type="checkbox"
          id="active"
          className="mr-2"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <label htmlFor="active" className="font-medium">
          Active (표시 여부)
        </label>
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
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default CalendarForm;
