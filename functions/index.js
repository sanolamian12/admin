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
  const publicBucketName = "stlc-church-app.firebasestorage.app";

  const publicThumbURL =
    `https://firebasestorage.googleapis.com/v0/b/${publicBucketName}/o/` +
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
