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
  const thumbFilePath = path.join(dirName, "../thumbs", thumbFileName);

  await fs.ensureDir(tempLocalDir);
  await bucket.file(filePath).download({ destination: tempLocalFile });

  const thumbBuffer = await sharp(tempLocalFile).resize({ width: 300 }).toBuffer();
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

  if (folderName === "images") {
    const pictureId = path.parse(fileName).name;
    console.log(`🔹 Updating photo_detail for ${photoId}, picture ${pictureId}`);

    const querySnapshot = await admin
      .firestore()
      .collection("photo_detail")
      .where("content_id", "==", photoId)
      .where("picture_id", "==", pictureId)
      .get();

    querySnapshot.forEach((docSnap) => {
      docSnap.ref.update({ thumb_url: thumbURL });
    });
  } else if (folderName === "cover") {
    console.log(`🔹 Updating photo main document for ${photoId}`);
    await admin.firestore().collection("photo").doc(photoId).update({
      thumb_url: thumbURL,
    });
  }

  await fs.remove(tempLocalDir);
  return console.log("🧹 Cleanup complete.");
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
