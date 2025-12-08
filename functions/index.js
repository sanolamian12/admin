// ✅ 최신 Firebase Functions v2 방식 (2024~)
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { onSchedule } = require("firebase-functions/v2/scheduler"); // 스케줄러 추가
const { onRequest } = require("firebase-functions/v2/https"); // HTTP 요청 처리 추가
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const sharp = require("sharp");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

// ✅ 시드니 리전 지정 (스토리지 및 Firestore와 일치)
setGlobalOptions({ region: "australia-southeast1" });

// ✅ Firebase Admin 초기화
admin.initializeApp({
  storageBucket: "stlc-church-app.appspot.com",
});
const storage = new Storage();

// ============================================================
// 🔹 Photo 업로드 시 썸네일 생성 + PUBLIC URL 저장
// ============================================================
exports.generatePhotoThumbnail = onObjectFinalized(async (event) => {
  const object = event.data;
  const bucketName = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  // 이미지가 아닐 경우 무시
  if (!contentType || !contentType.startsWith("image/")) return null;
  if (fileName.startsWith("thumb_")) return null;

  const bucket = storage.bucket(bucketName);

  // TEMP 저장
  const tempLocalFile = path.join(os.tmpdir(), fileName);
  const tempLocalDir = path.join(os.tmpdir(), "thumbs");
  const thumbFileName = `thumb_${fileName}`;
  const thumbFilePath = filePath
    .replace("/images/", "/thumbs/")
    .replace(fileName, thumbFileName);

  await fs.ensureDir(tempLocalDir);
  await bucket.file(filePath).download({ destination: tempLocalFile });

  // 썸네일 생성
  const thumbBuffer = await sharp(tempLocalFile).resize({ width: 300 }).toBuffer();
  const tempLocalThumb = path.join(tempLocalDir, thumbFileName);
  await fs.writeFile(tempLocalThumb, thumbBuffer);

  // 썸네일 업로드
  await bucket.upload(tempLocalThumb, {
    destination: thumbFilePath,
    metadata: { contentType },
  });

  console.log("🔥 Thumbnail created:", thumbFilePath);

  // ============================================================
  // 🔥 1) PUBLIC URL 생성 (Signed URL 제거)
  // Firebase 공식 URL: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media
  // ============================================================
  const publicBucketName  = "stlc-church-app.firebasestorage.app";

  const publicThumbURL =
    `https://firebasestorage.googleapis.com/v0/b/${publicBucketName }/o/` +
    encodeURIComponent(thumbFilePath) +
    `?alt=media`;

  console.log("✅ Public thumb URL:", publicThumbURL);

  // ============================================================
  // 🔥 2) Firestore 업데이트 (thumb_url 그대로 유지)
  // ============================================================
  const segments = filePath.split("/");
  const photoId = segments[1];
  const folderName = segments[2];

  // images → thumbnails → photo_detail 업데이트
  if (folderName === "images") {
    const pictureId = path.parse(fileName).name;

    // photo_detail/{index}
    const detailRef = admin
      .firestore()
      .collection("photo")
      .doc(photoId)
      .collection("photo_detail")
      .doc(pictureId);

    await detailRef.set({ thumb_url: publicThumbURL }, { merge: true });

    // 대표 사진(001) → photo document 업데이트
    if (pictureId === "001") {
      await admin.firestore().collection("photo").doc(photoId).update({
        thumb_url: publicThumbURL,
      });
    }
  }

  await fs.remove(tempLocalDir);
  return null;
});

// ============================================================
// 🔹 2. Weekly / Photo / Notice 조회수 자동 반영
// ============================================================

// 🧠 공통 함수: views +1 트랜잭션 처리
async function incrementViews(collectionName, contentId) {
  const ref = admin.firestore().collection(collectionName).doc(contentId);
  await admin.firestore().runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) {
      console.log(`⚠️ ${collectionName}/${contentId} not found`);
      return;
    }
    const currentViews = snap.data()?.views || 0;
    t.update(ref, { views: currentViews + 1 });
  });
  console.log(`✅ Updated views for ${collectionName}/${contentId}`);
}


// ✅ (1) Weekly
exports.syncWeeklyViews = onDocumentCreated(
  {
    document: "weekly_views/{docId}",
    region: "australia-southeast1",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data?.content_id) return;
    await incrementViews("weekly", data.content_id);
  }
);


// ✅ (2) Photo
exports.syncPhotoViews = onDocumentCreated(
  {
    document: "photo_views/{docId}",
    region: "australia-southeast1",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data?.content_id) return;
    await incrementViews("photo", data.content_id);
  }
);


// ✅ (3) Notice
exports.syncNoticeViews = onDocumentCreated(
  {
    document: "notice_views/{docId}",
    region: "australia-southeast1",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data?.content_id) return;
    await incrementViews("notice", data.content_id);
  }
);

// ===============================
// 4) Daily Push (STLC)
// ===============================

// 시드니 HH:mm 포맷 (ex: "09:00")
function getSydneyHHmm() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.hour}:${parts.minute}`;
}

// yyyyMMdd 포맷
function getSydneyYyyyMmDd() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
  return `${parts.year}${parts.month}${parts.day}`;
}

// 무효 토큰 판별
function isInvalidTokenError(err) {
  const code = err?.code || err?.errorInfo?.code || "";
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}

// 🧠 [NEW] 핵심 로직을 분리한 공통 푸시 실행 함수
// targets: Firestore DocumentSnapshot 배열
async function executePushToTargets(targets, isTest = false) {
  const ymd = getSydneyYyyyMmDd();
  const logBatch = admin.firestore().batch();
  const logBaseRef = admin.firestore()
    .collection("push_logs")
    .doc(ymd)
    .collection("logs");

  let successCount = 0;
  let failureCount = 0;

  if (targets.length === 0) {
      return { successCount: 0, failureCount: 0 };
  }

  console.log(`📬 Targets: ${targets.length} devices found. Test mode: ${isTest}`);

  for (const doc of targets) {
    const data = doc.data() || {};
    const uuid = data.uuid || doc.id;
    const token = data.fcmToken;
    const messageTitle = isTest ? "테스트 푸시 알림" : "오늘의 말씀";
    const messageBody = isTest ? "일일 푸시 로직 테스트가 성공했습니다." : "오늘의 말씀이 도착했습니다.";

    if (!token || typeof token !== "string" || token.trim() === "") {
      console.log(`🚫 Skip (no token) uuid=${uuid}`);
      logBatch.set(
        logBaseRef.doc(uuid),
        {
          uuid,
          status: "skipped_no_token",
          timeSent: admin.firestore.FieldValue.serverTimestamp(),
          fcmToken: token,
        },
        { merge: true }
      );
      continue;
    }

    try {
      const message = {
        token,
        notification: {
          title: messageTitle,
          body: messageBody,
        },
        data: {
          route: "today",
          isTest: isTest ? "true" : "false", // 테스트 여부 data 필드에 포함
        },
      };

      const res = await admin.messaging().send(message);
      console.log(`✅ Push OK uuid=${uuid} msgId=${res}`);
      successCount++;

      logBatch.set(
        logBaseRef.doc(uuid),
        {
          uuid,
          status: "success",
          timeSent: admin.firestore.FieldValue.serverTimestamp(),
          fcmToken: token,
          testMode: isTest,
        },
        { merge: true }
      );
    } catch (err) {
      console.error(`❌ Push FAIL uuid=${uuid}`, err);
      failureCount++;

      logBatch.set(
        logBaseRef.doc(uuid),
        {
          uuid,
          status: "failed",
          timeSent: admin.firestore.FieldValue.serverTimestamp(),
          fcmToken: token,
          error: String(err?.code || err?.message || err),
          testMode: isTest,
        },
        { merge: true }
      );

      // ✅ invalid token 삭제
      if (isInvalidTokenError(err)) {
        console.warn(`🧹 Invalid token → clearing fcmToken uuid=${uuid}`);
        await doc.ref.update({ fcmToken: admin.firestore.FieldValue.delete() });
      }
    }
  }

  await logBatch.commit();
  console.log("📝 Log batch committed");
  return { successCount, failureCount };
}

// 🔔 기존의 스케줄 실행 함수: sendDailyVerse
exports.sendDailyVerse = onSchedule(
  {
    schedule: "0 * * * *", // 매 정각
    timeZone: "Australia/Sydney",
    region: "australia-southeast1",
  },
  async () => {
    const hhmm = getSydneyHHmm();
    console.log(`⏰ Sydney now: ${hhmm}`);

    // 스케줄 실행은 pushEnabled == true 이고 pushTime이 현재 시각과 일치하는 모든 사용자를 조회
    const snap = await admin
      .firestore()
      .collection("settings")
      .where("pushEnabled", "==", true)
      .where("pushTime", "==", hhmm)
      .get();

    if (snap.empty) {
      console.log("ℹ️ No recipients at this hour.");
      return null;
    }

    // 공통 함수 호출 (isTest: false)
    await executePushToTargets(snap.docs, false);
    return null;
  }
);

// 🚀 [NEW] 테스트 버튼을 위한 HTTP 트리거 함수
exports.triggerDailyPushTest = onRequest(
  {
    region: "australia-southeast1", // 기존 함수와 동일한 리전 사용
  },
  async (req, res) => {
    // 1. 요청 유효성 검사
    if (req.method !== "POST" || !req.body.uuid) {
      return res.status(400).send({ status: "fail", message: "Invalid request or missing UUID." });
    }

    const { uuid } = req.body; // Flutter 앱에서 전송한 UUID

    try {
        // 2. 특정 UUID만 조회 (테스트 대상)
        const snap = await admin
          .firestore()
          .collection("settings")
          .doc(uuid)
          .get();

        if (!snap.exists || !snap.data().pushEnabled) {
            return res.status(404).send({ status: "fail", message: "UUID not found or push not enabled." });
        }

        // 3. 공통 함수 호출 (isTest: true) - 단일 디바이스에 대해서만 실행
        const targets = [snap];
        const result = await executePushToTargets(targets, true);

        if (result.successCount > 0) {
            return res.status(200).send({ status: "success", message: "Test push sent to the device." });
        } else if (result.failureCount > 0) {
            return res.status(500).send({ status: "fail", message: "Push sending failed. Check logs for details." });
        } else {
            return res.status(404).send({ status: "fail", message: "No valid token found for this device." });
        }

    } catch (error) {
        console.error("❌ HTTP Test Push FAIL:", error);
        return res.status(500).send({ status: "error", message: error.message });
    }
  }
);

// 🔔 매 정각 실행
//exports.sendDailyVerse = onSchedule(
//  {
//    schedule: "0 * * * *", // 매 정각
//    timeZone: "Australia/Sydney",
//    region: "australia-southeast1",
//  },
//  async () => {
//    const hhmm = getSydneyHHmm();
//    const ymd = getSydneyYyyyMmDd();
//    console.log(`⏰ Sydney now: ${hhmm} (${ymd})`);
//
//    // ✅ 변경된 핵심 부분: /settings 기준으로 조회
//    const snap = await admin
//      .firestore()
//      .collection("settings")
//      .where("pushEnabled", "==", true)
//      .where("pushTime", "==", hhmm)
//      .get();
//
//    if (snap.empty) {
//      console.log("ℹ️ No recipients at this hour.");
//      return null;
//    }
//
//    console.log(`📬 Targets: ${snap.size} devices scheduled at ${hhmm}`);
//
//    const logBatch = admin.firestore().batch();
//    const logBaseRef = admin.firestore()
//      .collection("push_logs")
//      .doc(ymd)
//      .collection("logs");
//
//    for (const doc of snap.docs) {
//      const data = doc.data() || {};
//      const uuid = data.uuid || doc.id;
//      const token = data.fcmToken;
//
//      if (!token || typeof token !== "string" || token.trim() === "") {
//        console.log(`🚫 Skip (no token) uuid=${uuid}`);
//        logBatch.set(
//          logBaseRef.doc(uuid),
//          {
//            uuid,
//            status: "skipped_no_token",
//            timeSent: admin.firestore.FieldValue.serverTimestamp(),
//          },
//          { merge: true }
//        );
//        continue;
//      }
//
//      try {
//        const message = {
//          token,
//          notification: {
//            title: "오늘의 말씀",
//            body: "오늘의 말씀이 도착했습니다.",
//          },
//          data: {
//            route: "today",
//          },
//        };
//
//        const res = await admin.messaging().send(message);
//        console.log(`✅ Push OK uuid=${uuid} msgId=${res}`);
//
//        logBatch.set(
//          logBaseRef.doc(uuid),
//          {
//            uuid,
//            status: "success",
//            timeSent: admin.firestore.FieldValue.serverTimestamp(),
//            fcmToken: token,
//          },
//          { merge: true }
//        );
//      } catch (err) {
//        console.error(`❌ Push FAIL uuid=${uuid}`, err);
//
//        logBatch.set(
//          logBaseRef.doc(uuid),
//          {
//            uuid,
//            status: "failed",
//            timeSent: admin.firestore.FieldValue.serverTimestamp(),
//            fcmToken: token,
//            error: String(err?.code || err?.message || err),
//          },
//          { merge: true }
//        );
//
//        // ✅ invalid token 삭제
//        if (isInvalidTokenError(err)) {
//          console.warn(`🧹 Invalid token → clearing fcmToken uuid=${uuid}`);
//          await doc.ref.update({ fcmToken: admin.firestore.FieldValue.delete() });
//        }
//      }
//    }
//
//    await logBatch.commit();
//    console.log("📝 Log batch committed");
//    return null;
//  }
//);

// 🧹 7일 지난 로그 자동 삭제
exports.cleanupOldPushLogs = onSchedule(
  {
    schedule: "0 3 * * *",
    region: "australia-southeast1",
  },
  async () => {
    const todayYmd = getSydneyYyyyMmDd();
    const y = Number(todayYmd.slice(0, 4));
    const m = Number(todayYmd.slice(4, 6));
    const d = Number(todayYmd.slice(6, 8));

    const base = new Date(Date.UTC(y, m - 1, d));
    const cutoff = new Date(base);
    cutoff.setUTCDate(cutoff.getUTCDate() - 7);

    const toYmdUTC = (dt) => {
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(dt.getUTCDate()).padStart(2, "0");
      return `${yyyy}${mm}${dd}`;
    };

    const cutoffYmd = toYmdUTC(cutoff);
    console.log(`🧹 Cleanup logs older than ${cutoffYmd}`);

    const logsCol = admin.firestore().collection("push_logs");
    const all = await logsCol.get();
    if (all.empty) {
      console.log("ℹ️ No log docs.");
      return null;
    }

    const batch = admin.firestore().batch();
    let deletions = 0;

    all.forEach((doc) => {
      const id = doc.id;
      if (id < cutoffYmd) {
        console.log(`🗑️ Deleting log doc: ${id}`);
        batch.delete(doc.ref);
        deletions++;
      }
    });

    if (deletions > 0) {
      await batch.commit();
      console.log(`✅ Deleted ${deletions} old log docs`);
    } else {
      console.log("ℹ️ No old logs to delete");
    }
    return null;
  }
);
