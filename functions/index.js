// ✅ 최신 Firebase Functions v2 방식 (2024~)
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2/options");
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
// 🔹 1. Photo 업로드 시 썸네일 자동 생성
// ============================================================
exports.generatePhotoThumbnail = onObjectFinalized(async (event) => {
  const object = event.data;
  const bucketName = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  if (!contentType || !contentType.startsWith("image/")) {
    console.log("🚫 Not an image, skipping...");
    return null;
  }

  if (fileName.startsWith("thumb_")) {
    console.log("🚫 Already a thumbnail, skipping...");
    return null;
  }

  const bucket = storage.bucket(bucketName);
  const tempLocalFile = path.join(os.tmpdir(), fileName);
  const tempLocalDir = path.join(os.tmpdir(), "thumbs");
  const thumbFileName = `thumb_${fileName}`;
  const thumbFilePath = filePath
    .replace("/images/", "/thumbs/")
    .replace(fileName, thumbFileName);

  await fs.ensureDir(tempLocalDir);
  await bucket.file(filePath).download({ destination: tempLocalFile });

  const thumbBuffer = await sharp(tempLocalFile)
    .resize({ width: 300 })
    .toBuffer();
  const tempLocalThumb = path.join(tempLocalDir, thumbFileName);
  await fs.writeFile(tempLocalThumb, thumbBuffer);

  await bucket.upload(tempLocalThumb, {
    destination: thumbFilePath,
    metadata: { contentType },
  });

  console.log("✅ Thumbnail created:", thumbFilePath);

  const thumbFile = bucket.file(thumbFilePath);
  const [thumbURL] = await thumbFile.getSignedUrl({
    action: "read",
    expires: "03-01-2500",
  });

  console.log("📸 Thumbnail URL:", thumbURL);

  const segments = filePath.split("/");
  const photoId = segments[1];
  const folderName = segments[2];

  // ========================================================
  // ✅ 1️⃣ images 폴더: photo_detail.thumb_url 업데이트
  // ========================================================
  if (folderName === "images") {
    const pictureId = path.parse(fileName).name;
    console.log(`🔹 Updating photo_detail for ${photoId}, picture ${pictureId}`);

    const detailRef = admin
      .firestore()
      .collection("photo")
      .doc(photoId)
      .collection("photo_detail")
      .doc(pictureId); // ✅ 개별 문서 직접 업데이트

    await detailRef.set({ thumb_url: thumbURL }, { merge: true });

    // ✅ 001.jpg 의 썸네일이라면 대표 thumb_url 로 photo 문서 갱신
    if (pictureId === "001") {
      console.log(`🌟 Setting main thumb_url for photo/${photoId}`);
      await admin.firestore().collection("photo").doc(photoId).update({
        thumb_url: thumbURL,
      });
    }
  }

  await fs.remove(tempLocalDir);
  console.log("🧹 Cleanup complete.");
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
const { onSchedule } = require("firebase-functions/v2/scheduler");

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

// 🔔 매 정각 실행
exports.sendDailyVerse = onSchedule(
  {
    schedule: "every 60 minutes",
    region: "australia-southeast1",
  },
  async () => {
    const hhmm = getSydneyHHmm();
    const ymd = getSydneyYyyyMmDd();
    console.log(`⏰ Sydney now: ${hhmm} (${ymd})`);

    // ✅ 변경된 핵심 부분: /settings 기준으로 조회
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

    console.log(`📬 Targets: ${snap.size} devices scheduled at ${hhmm}`);

    const logBatch = admin.firestore().batch();
    const logBaseRef = admin.firestore()
      .collection("push_logs")
      .doc(ymd)
      .collection("logs");

    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const uuid = data.uuid || doc.id;
      const token = data.fcmToken;

      if (!token || typeof token !== "string" || token.trim() === "") {
        console.log(`🚫 Skip (no token) uuid=${uuid}`);
        logBatch.set(
          logBaseRef.doc(uuid),
          {
            uuid,
            status: "skipped_no_token",
            timeSent: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        continue;
      }

      try {
        const message = {
          token,
          notification: {
            title: "오늘의 말씀",
            body: "오늘의 말씀이 도착했습니다.",
          },
          data: {
            route: "today",
          },
        };

        const res = await admin.messaging().send(message);
        console.log(`✅ Push OK uuid=${uuid} msgId=${res}`);

        logBatch.set(
          logBaseRef.doc(uuid),
          {
            uuid,
            status: "success",
            timeSent: admin.firestore.FieldValue.serverTimestamp(),
            fcmToken: token,
          },
          { merge: true }
        );
      } catch (err) {
        console.error(`❌ Push FAIL uuid=${uuid}`, err);

        logBatch.set(
          logBaseRef.doc(uuid),
          {
            uuid,
            status: "failed",
            timeSent: admin.firestore.FieldValue.serverTimestamp(),
            fcmToken: token,
            error: String(err?.code || err?.message || err),
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
    return null;
  }
);

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
