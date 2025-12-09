// src/pages/RequestDetail.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

function RequestDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. 요청 상세 데이터 가져오기
  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId) {
        setError("유효하지 않은 요청 ID입니다.");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'account_request', requestId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // ✅ 데이터 안전성 강화: Timestamp 유효성 검사 및 포맷
          const registeredAtFormatted = data.registeredAt?.toDate ? new Date(data.registeredAt.toDate()).toLocaleString('ko-KR') : '날짜 정보 없음';

          setRequest({
            // 문서 ID는 request.id에 저장됨 (List 페이지에서 사용됨)
            id: docSnap.id,
            ...data,
            registeredAt: registeredAtFormatted,
            // approve 필드가 없으면 기본값 false를 사용
            approve: data.approve ?? false,
            // 추가된 안전성: who, uuid, id, pw 필드가 없을 경우 기본값을 제공
            who: data.who ?? '정보 없음',
            uuid: data.uuid ?? docSnap.id, // 필드 uuid가 없을 경우 문서 ID 사용
            pw: data.pw ?? '정보 없음',
          });
        } else {
          // 문서가 없을 때, 실제 조회 ID를 포함하여 에러 메시지 출력
          setError(`해당 요청 문서 (ID: ${requestId})를 찾을 수 없습니다.`);
        }
      } catch (e) {
        console.error("요청 상세 정보 로드 실패:", e);
        // 데이터 로드 중 오류 발생 시 UUID를 포함하여 에러 메시지 출력
        setError(`데이터 로드 중 오류 발생 (UUID: ${requestId}): ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId]);

  // 2. 승인 처리 핸들러 (approve 필드만 true로 업데이트)
  const handleApprove = async () => {
    // request가 null이 아닌지 확인 후 who 사용 (안전성 강화)
    const requesterName = request?.who ?? '요청자';
    if (!window.confirm(`요청자 "${requesterName}"의 계정 승인 상태를 '승인됨'으로 변경하시겠습니까?`)) {
      return;
    }

    setApprovalLoading(true);
    setError(null);

    try {
      const docRef = doc(db, 'account_request', requestId);
      await updateDoc(docRef, {
        approve: true,
      });

      // 로컬 상태 업데이트
      setRequest(prev => ({ ...prev, approve: true }));

      alert(`✅ 승인 상태 변경 완료: ${requesterName}의 요청이 승인됨으로 표시됩니다.`);

      // 승인 후 목록 페이지로 돌아가기
      navigate('/admin/requests');

    } catch (e) {
      console.error("승인 상태 업데이트 오류:", e);
      setError(`승인 상태 변경 중 오류 발생: ${e.message}`);
    } finally {
      setApprovalLoading(false);
    }
  };


  if (loading) {
    return <div className="p-8 text-center">요청 상세 정보를 로딩 중입니다...</div>;
  }

  if (error) {
    // 오류 메시지에 UUID 정보를 명확히 표시
    return <div className="p-8 text-center text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-xl mb-2">😭 데이터 로드 실패</h3>
      <p>{error}</p>
      <p className="mt-4 text-sm text-gray-500">
        **디버깅 팁:** Firebase Console에서 ID `{requestId}` 문서의 존재 여부와 `registeredAt` 필드 형식을 확인해 보세요.
      </p>
    </div>;
  }

  if (!request) {
    return <div className="p-8 text-center text-gray-500">요청 문서를 찾을 수 없습니다.</div>;
  }

  // UI 렌더링
  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg my-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-3">
        계정 생성 요청 상세
      </h2>

      <div className="space-y-4">
        {/* 요청자 정보 (안전성 강화) */}
        <DetailItem title="요청자 (who)" value={request.who} />

        {/* 🚨 문서의 고유 ID (UUID)를 명확히 표시 */}
        <DetailItem
            title="문서 UUID (고유 식별자)"
            value={request.uuid}
            note="이 값은 Firestore의 문서 ID와 동일하며, 조회 키로 사용됩니다."
        />

        {/* ✅ 원래 요청자가 원하는 ID 표시 (로그인 ID) */}
        <DetailItem
            title="요청 계정 ID"
            value={request.id}
            note="관리자가 이 ID와 PW를 사용하여 수동으로 계정을 생성해야 합니다."
        />

        <DetailItem title="요청 비밀번호 (pw)" value={request.pw} />
        <DetailItem title="요청 일시" value={request.registeredAt} />

        {/* 승인 상태 */}
        <div className="p-4 rounded-lg bg-gray-50 flex justify-between items-center">
          <span className="font-semibold text-lg text-gray-700">현재 승인 상태</span>
          <span className={`text-xl font-bold ${request.approve ? 'text-green-600' : 'text-red-500'}`}>
            {request.approve ? '✅ 승인됨' : '❌ 미승인'}
          </span>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
        >
          목록으로 돌아가기
        </button>

        {/* 승인되지 않았을 때만 승인 버튼 표시 */}
        {!request.approve && (
          <button
            onClick={handleApprove}
            disabled={approvalLoading}
            className={`px-8 py-2 rounded-lg text-white font-bold transition duration-150 ${
              approvalLoading
                ? 'bg-blue-400 cursor-wait'
                : 'bg-blue-500 hover:bg-blue-600 shadow-md'
            }`}
          >
            {approvalLoading ? '처리 중...' : '요청 승인 처리 (DB 상태 변경)'}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

// 상세 항목을 표시하기 위한 보조 컴포넌트
const DetailItem = ({ title, value, note }) => (
  <div className="p-4 border rounded-lg">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
    {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
  </div>
);

export default RequestDetail;