// import React from "react";
// import { auth, db, storage } from "./firebase";
//
// function AdminApp() {
//   return (
//     <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
//       <h1>Firebase Admin Panel Starter</h1>
//       <p>Firestore / Storage / Auth 연결이 정상입니다.</p>
//       <p>이제 실제 UI 컴포넌트를 여기에 구현할 수 있습니다.</p>
//     </div>
//   );
// }
//
// export default AdminApp;

// import React, { useEffect, useMemo, useState } from "react";
// import { auth, db, storage } from "./firebase";
//
// function AdminApp() {
//   // ... 여기에 useState, useEffect 등으로 구성된 관리자 UI 코드 ...
// }
//
// export default AdminApp;

/* ============================================================
   🔥 Firestore Final Schema (2025 Normalized Model)
   ============================================================

🧩 Table 1 — Users
  collection: users
  fields: uid, name, email, role, photo_url, created_at, last_login, isActive
  desc: 사용자 계정 및 역할 관리 (role: admin/user)

📖 Table 2 — Weekly (예배 게시물)
  Table 2: weekly
    fields: id, title, registeredAt, views
  Table 2.1: weekly_views
    fields: id, content_id, viewer
  Table 2.2: weekly_detail
    fields: id, file_url, ser-vserse, ser-preacher, ser-summary
  relationships:
    weekly.id ↔ weekly_detail.id (1:1)
    weekly.id ↔ weekly_views.content_id (1:N)

🖼️ Table 3 — Photo (앨범형 다중 이미지)
  Table 3: photo
    fields: id, caption, registeredAt, user, thumb_url, isActive, views
  Table 3.1: photo_views
    fields: id, content_id, viewer
  Table 3.2: photo_detail
    fields: id, content_id, picture_id, thumb_url, image_url
  relationships:
    photo.id ↔ photo_detail.content_id (1:N)
    photo.id ↔ photo_views.content_id (1:N)

📢 Table 4 — Notice (공지사항)
  Table 4: notice
    fields: id, title, registeredAt, user, isActive, views
  Table 4.1: notice_views
    fields: id, content_id, viewer
  Table 4.2: notice_detail
    fields: id, file_url, content
  relationships:
    notice.id ↔ notice_detail.id (1:1)
    notice.id ↔ notice_views.content_id (1:N)

🗓️ Table 5 — Calendar (일정)
  Table 5: calendar
    fields: id, user, registeredAt, content, eventDay, isActive
  desc: 개인 일정 관리 (수정 없이 삭제/재입력만 가능)

🔗 관계 요약
  weekly.id ↔ weekly_detail.id (1:1)
  weekly.id ↔ weekly_views.content_id (1:N)
  photo.id ↔ photo_detail.content_id (1:N)
  photo.id ↔ photo_views.content_id (1:N)
  notice.id ↔ notice_detail.id (1:1)
  notice.id ↔ notice_views.content_id (1:N)

🔐 접근 권한 요약
  users: Admin CRUD / User read(self)
  weekly: Admin CRUD / User read, views add
  photo: Admin CRUD / User CRUD(own)
  notice: Admin CRUD / User CRUD(own)
  calendar: Admin CRUD / User CRUD(own)
  storage: Admin Upload/Delete / User Upload(own), Read

⚙️ 동작 요약
  1. 콘텐츠 클릭 시 *_views 컬렉션에 로그 추가
  2. Cloud Function이 content_id별 count를 상위 테이블 views에 반영
  3. isActive=false → 비표시
  4. user 필드 기준으로 본인 데이터만 수정/삭제 허용

============================================================ */