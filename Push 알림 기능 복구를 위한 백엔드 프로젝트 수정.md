# Push 알림 기능 복구를 위한 백엔드 프로젝트 수정

이 문서는 푸시 알림 미동작 문제를 진단하고 FCM 기반 푸시를 로컬 알림 방식으로 전환하기 위해 백엔드(`c:\Users\user\admin`) 프로젝트에서 수행한 작업과 그 배경을 정리한 기록입니다. Flutter 앱(`C:\users\user\my_app1`) 쪽 작업은 별도 세션에서 [`LOCAL_NOTIFICATION_MIGRATION.md`](../my_app1/LOCAL_NOTIFICATION_MIGRATION.md)에 따라 진행됩니다.

---

## 1. 문제 증상

매일 정해진 시간에 발송되어야 할 "오늘의 말씀" 푸시 알림이 동작하지 않는 문제 발견. 사용자별 증상:

- **iOS**: 앱 배포 전 dev 빌드에서는 푸시가 도착했으나, 릴리즈 이후로는 전혀 발송되지 않음
- **Android**: 앱 설치 후 1~2회는 푸시가 오다가 그 이후로는 끊김

푸시 자체는 빈 껍데기 알림이고, 사용자가 클릭하면 Flutter 앱 내부에 번들된 `assets/daily_messages.json` 의 카드 중 하나를 `TodayPopupPage`에 띄우는 구조 — 즉 알림 시점에 서버가 사용자별 콘텐츠를 결정해야 할 일은 전혀 없음.

---

## 2. 진단

### 2.1 Android — fcmToken 무효화 후 재저장 경로 부재

[functions/index.js](functions/index.js)의 `executePushToTargets`는 FCM 발송 시 `messaging/registration-token-not-registered` 또는 `messaging/invalid-registration-token` 에러를 만나면 `settings/{uuid}.fcmToken` 필드를 자동 삭제하는 로직이 있음:

```js
if (isInvalidTokenError(err)) {
  await doc.ref.update({ fcmToken: admin.firestore.FieldValue.delete() });
}
```

반면 Flutter 앱(`my_app1/lib/main.dart`)의 토큰 저장 경로는 다음 두 가지뿐인데 모두 한계가 있었음:

1. `initSettingsForDevice()` — `settings/{uuid}` 문서가 **없을 때만** 초기 설정과 함께 토큰 저장. 문서가 이미 존재하면 일찍 리턴.
2. `setupFcmTokenListener()` — `onTokenRefresh` 이벤트에만 동작. 토큰이 이미 회전된 상태로 앱이 재시작되는 경우 발화하지 않음.

`MainPageWrapper._initFirebaseMessaging()`에서 `getToken()`으로 신선한 토큰을 받기는 하지만 print만 하고 Firestore에 저장하지 않음.

**결합 시나리오:** FCM 토큰이 회전/만료 → Cloud Function이 invalid token 에러 → `fcmToken` 필드 삭제 → 사용자가 앱을 다시 켜도 토큰 재저장 안 됨 → 영구 실패. 이게 "한두 번 오다가 끊김" 증상과 정확히 일치.

### 2.2 iOS — APNs 환경 불일치

dev 빌드는 APNs **sandbox**, TestFlight/AppStore 빌드는 APNs **production** 환경에 토큰 등록. Firebase Console > Cloud Messaging의 APNs 인증 설정이 production을 커버하지 못하거나 `aps-environment` entitlement가 development로만 설정된 경우 릴리즈 빌드는 영구히 발송 실패.

### 2.3 근본적 관찰

푸시 본문이 어차피 빈 껍데기이고, 알림 발송 시점에 서버가 사용자별 콘텐츠를 결정할 일이 없으므로 **외부 푸시 채널(FCM/APNs)은 이 요구사항에 과한 도구**. 디바이스 시간 + 번들 콘텐츠 조합이라 로컬 알림으로 처리하는 게 자연스러움.

---

## 3. 검토한 방안

| 방안 | 장점 | 단점 |
|---|---|---|
| A. FCM 토큰 재저장 버그만 수정 | 변경 최소 | iOS APNs 문제는 별도 해결 필요. FCM 의존 그대로 유지. |
| B. 로컬 알림 전환 + FCM 유지 (하이브리드) | daily는 안정화, 향후 댓글 알림 등 외부 이벤트 푸시는 가능 | FCM 인프라 유지 보수 부담 잔존 |
| C. 로컬 알림 전환 + FCM 완전 철거 | 토큰/APNs/스케줄러 의존 모두 제거. 가장 단순. | 향후 외부 이벤트 알림 기능이 필요하면 다시 도입해야 함 |

추후 "내 글에 댓글 달리면 푸시" 같은 외부 이벤트 알림 기능은 **구현하지 않을 가능성이 있어** 사용자는 **방안 C (전체 철거)** 선택.

---

## 4. 결정 사항

- **알림 정확도**: inexact (`AndroidScheduleMode.inexactAllowWhileIdle`). `SCHEDULE_EXACT_ALARM` 권한 추가 요청 안 함.
- **타임존**: 디바이스 로컬 시간. 사용자가 해외 이동 시 디바이스 시간 따라감.
- **알림 본문**: 현재와 동일하게 고정 문자열 유지.
- **테스트 버튼**: 설정 페이지의 "푸시 알림 테스트" 버튼은 유지하되, 동작은 5초 후 로컬 알림 1회 발송으로 교체.
- **`settings/{uuid}.fcmToken`** 필드: 새 코드는 더 이상 읽거나 쓰지 않음. 기존 잔류 데이터는 무해하므로 강제 삭제하지 않음.

---

## 5. 백엔드 프로젝트에서 수행한 작업

### 5.1 [functions/index.js](functions/index.js) 정리

**제거:**
- `sendDailyVerse` (스케줄러, 매시 정각)
- `triggerDailyPushTest` (HTTP 엔드포인트)
- `cleanupOldPushLogs` (매일 03:00)
- `executePushToTargets`, `isInvalidTokenError`, `getSydneyHHmm`, `getSydneyYyyyMmDd` 헬퍼들
- `onSchedule`, `onRequest` import
- 파일 하단의 주석 처리된 옛 `sendDailyVerse` 사본

**유지:**
- `generatePhotoThumbnail` (썸네일 생성)
- `syncWeeklyViews`, `syncPhotoViews`, `syncNoticeViews` (조회수 동기화)

### 5.2 [CLAUDE.md](CLAUDE.md) 갱신

- `settings` 컬렉션 필드 설명에서 `fcmToken` 제거, "디바이스 로컬 시간" 으로 수정
- `push_logs` 컬렉션 항목 제거
- Cloud Functions 섹션에서 푸시 관련 함수 4개 설명 제거 후, 제거 사실과 GCP 잔존 함수 삭제 명령 안내로 교체
- 시드니 시간 가정에 대한 "Things to know when editing" 항목 제거

### 5.3 배포 및 GCP 정리

```powershell
cd c:\Users\user\admin\functions
npm run deploy
```

`firebase deploy` 실행 시 CLI가 "로컬 코드에는 없는데 GCP에 배포되어 있는 함수 3개를 삭제할까?" 라는 프롬프트를 띄움. **`y` 응답**하여 다음 함수들 삭제 완료:

- `cleanupOldPushLogs(australia-southeast1)`
- `triggerDailyPushTest(australia-southeast1)`
- `sendDailyVerse(australia-southeast1)`

남은 4개 함수(`generatePhotoThumbnail`, `syncWeeklyViews`, `syncPhotoViews`, `syncNoticeViews`)는 정상 업데이트 후 `Deploy complete!` 확인.

---

## 6. Flutter 프로젝트에서 진행할 작업 (별도 세션)

이 백엔드 작업과 짝을 이루는 Flutter 측 마이그레이션 계획서:

- 위치: `C:\users\user\my_app1\LOCAL_NOTIFICATION_MIGRATION.md`
- 새 채팅창을 `C:\users\user\my_app1` 에서 열고 다음을 입력하면 그대로 실행됨:
  > 이 프로젝트의 LOCAL_NOTIFICATION_MIGRATION.md 를 읽고 그대로 실행해줘.

내용 요약:
- `firebase_messaging` 패키지 제거, `flutter_local_notifications` + `timezone` 패키지 추가
- `lib/services/local_notification_service.dart` 신규 작성
- `lib/main.dart`, `lib/pages/splash_page.dart`, `lib/pages/settings_page.dart`, `lib/services/settings_service.dart` 의 FCM 호출 제거
- iOS `Runner.entitlements` 의 `aps-environment` 제거, `Info.plist`의 `remote-notification` 백그라운드 모드 제거
- Android `AndroidManifest.xml` 에 `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` 권한 추가
- 디바이스에서 권한 / 시간 설정 / 콜드 스타트 / 알림 클릭 라우팅 검증

---

## 7. (선택) 일회성 Firestore 데이터 정리

코드 동작에는 영향 없지만 깔끔하게 하려면:

- `push_logs/*` 컬렉션 전체 삭제 — Firebase Console > Firestore > `push_logs` 컬렉션 우상단 `⋮` → "Delete collection"
- `settings/*` 의 `fcmToken` 필드 — 잔류해도 무해, 굳이 안 지워도 됨

---

## 8. (선택) Firebase Console 정리

Project Settings > Cloud Messaging > Apple app config 의 APNs 인증 키(.p8) — 더 이상 사용하지 않으므로 보안상 삭제하면 좋음. (백엔드와 Flutter 양쪽 작업이 모두 끝나고 안정화 확인 후 진행.)

---

## 9. 커밋 시점

이 admin 프로젝트의 변경사항(`functions/index.js`, `CLAUDE.md`)은 아직 커밋되지 않은 상태. Flutter 측 마이그레이션이 디바이스에서 정상 동작 확인된 후 한꺼번에 커밋 권장 — Flutter 쪽 문제 발생 시 백엔드 일시 롤백 가능성을 남겨두는 차원.
