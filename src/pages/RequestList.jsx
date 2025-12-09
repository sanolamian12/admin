// src/pages/RequestList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter // 페이지네이션에 필요
} from 'firebase/firestore';

const PAGE_SIZE = 50; // 한 페이지에 표시할 항목 수

// Tailwind CSS 기반의 승인 상태 아이콘 컴포넌트
const ApprovalIcon = ({ isApproved }) => {
// ... (ApprovalIcon 컴포넌트 내용은 변경 없음)
  if (isApproved) {
    // 승인됨: 체크 표시 아이콘
    return (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    );
  } else {
    // 미승인: 빈 박스 아이콘
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-3-3v6m-9-6a9 9 0 1118 0 9 9 0 01-18 0z"></path>
      </svg>
    );
  }
};

function RequestList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  // 다음 페이지 로드를 위한 마지막 문서 스냅샷
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true); // 더 불러올 데이터가 있는지 여부

  const fetchRequests = async (isInitialLoad = true) => {
    setLoading(true);

    let baseQuery = query(
      collection(db, 'account_request'),
      // ✅ 최신 데이터가 상단에 오도록 'registeredAt' 기준 내림차순 정렬
      orderBy('registeredAt', 'desc'),
      limit(PAGE_SIZE)
    );

    // 초기 로드가 아니며, 이전에 로드된 마지막 문서가 있을 경우 (페이지네이션)
    if (!isInitialLoad && lastVisible) {
      baseQuery = query(
        collection(db, 'account_request'),
        orderBy('registeredAt', 'desc'),
        startAfter(lastVisible), // 이전 페이지의 마지막 문서 다음부터 시작
        limit(PAGE_SIZE)
      );
    }

    try {
      const documentSnapshots = await getDocs(baseQuery);

      const newRequests = documentSnapshots.docs.map(doc => ({
        // 🚨 핵심 수정: 문서 ID(UUID)를 'docId'라는 명확한 필드에 저장합니다.
        //    기존 'id' 필드는 Flutter에서 '테스트 요청'과 같은 사용자가 입력한 계정 ID를 저장하고 있습니다.
        docId: doc.id,
        ...doc.data(),
        // Firestore Timestamp를 JavaScript Date 객체로 변환 후 문자열 포맷
        registeredAt: doc.data().registeredAt ? new Date(doc.data().registeredAt.toDate()).toLocaleDateString('ko-KR') : '날짜 없음',
      }));

      // 상태 업데이트: 초기 로드 시 덮어쓰기, 추가 로드 시 이어붙이기
      setRequests(prev => isInitialLoad ? newRequests : [...prev, ...newRequests]);

      // 다음 데이터 유무 및 커서 업데이트
      if (documentSnapshots.docs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
        // 다음 쿼리의 시작점이 될 현재 페이지의 마지막 문서 저장
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      }

    } catch (e) {
      console.error("❌ 계정 요청 문서 가져오기 실패: ", e);
      // 사용자에게 에러 메시지 표시 로직 추가 가능
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 컴포넌트 마운트 시 초기 데이터 로드
    fetchRequests(true);
  }, []);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchRequests(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-3">
        계정 생성 요청 관리
      </h2>

      {/* 리스트 헤더 */}
      <div className="grid grid-cols-10 font-semibold text-gray-600 border-b pb-3 mb-3 bg-gray-50 rounded-t-lg">
        <div className="col-span-5 pl-4">요청자 (who) / 계정 ID (id)</div> {/* 헤더에 계정 ID 포함 */}
        <div className="col-span-3 text-center">요청 날짜</div>
        <div className="col-span-2 text-center">승인 여부</div>
      </div>

      {loading && requests.length === 0 && <p className="text-center py-12 text-blue-500">요청 데이터를 로딩 중입니다...</p>}

      {requests.length > 0 ? (
        <div className="space-y-2">
          {requests.map((request) => (
            <Link
              // ✅ 키는 고유한 docId를 사용합니다.
              key={request.docId}
              // 🚨 핵심 수정: 상세 페이지로 이동할 때 'docId' (UUID)를 사용하도록 변경합니다.
              to={`/admin/requests/${request.docId}`}
              className="grid grid-cols-10 items-center bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:bg-blue-50 transition duration-150 ease-in-out border border-gray-100"
            >
              {/* 제목 (who) 및 계정 ID (id) */}
              <div className="col-span-5 font-medium text-gray-900 truncate pl-4">
                <span className="font-bold">{request.who}</span>
                <span className="text-sm text-gray-500 ml-2">({request.id})</span> {/* 요청 계정 ID 표시 */}
              </div>
              {/* 요청 날짜 */}
              <div className="col-span-3 text-center text-sm text-gray-500">
                {request.registeredAt}
              </div>
              {/* 승인 여부 (approve) */}
              <div className="col-span-2 flex justify-center">
                {/* request.approve 값에 따라 아이콘 표시 */}
                <ApprovalIcon isApproved={request.approve} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !loading && <p className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">현재 요청된 계정 생성 요청이 없습니다. 🎉</p>
      )}

      {/* 더 보기 버튼 (페이지네이션) */}
      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className={`px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition duration-300 transform hover:scale-[1.01] ${
              loading
                ? 'bg-blue-300 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? '데이터 로드 중...' : `${PAGE_SIZE}개 요청 더 보기`}
          </button>
        </div>
      )}
    </div>
  );
}

export default RequestList;