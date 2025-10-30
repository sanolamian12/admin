// ✅ 최신 Firebase Functions v2 방식 (2024~)
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { setGlobalOptions } = require("firebase-functions/v2/options");
//const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const sharp = require("sharp");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

// ✅ 시드니 리전 지정 (스토리지와 일치시킴)
setGlobalOptions({ region: "australia-southeast1" });

admin.initializeApp({
  storageBucket: "stlc-church-app.appspot.com", // ✅ 올바른 버킷 이름
});
const storage = new Storage();

exports.generatePhotoThumbnail = onObjectFinalized(async (event) => {
  const object = event.data;
  const bucketName = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

//exports.generatePhotoThumbnail = functions.storage
//  .object()
//  .onFinalize(async (object) => {
//    const bucketName = object.bucket;
//    const filePath = object.name; // 예: "photo/43ukBjHibk2jNdm9USQN/images/002.jpg"
//    const contentType = object.contentType;
//    const fileName = path.basename(filePath);
//    const dirName = path.dirname(filePath);

    // ✅ 이미지 외 파일은 무시
    if (!contentType || !contentType.startsWith("image/")) {
      console.log("🚫 Not an image, skipping...");
      return null;
    }

    // ✅ 이미 썸네일 파일이면 무시
    if (fileName.startsWith("thumb_")) {
      console.log("🚫 Already a thumbnail, skipping...");
      return null;
    }

    const bucket = storage.bucket(bucketName);
    const tempLocalFile = path.join(os.tmpdir(), fileName);
    const tempLocalDir = path.join(os.tmpdir(), "thumbs");
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(dirName, "../thumbs", thumbFileName); // 예: "photo/{photoId}/thumbs/thumb_002.jpg"

    await fs.ensureDir(tempLocalDir);
    await bucket.file(filePath).download({ destination: tempLocalFile });

    // ✅ Sharp로 썸네일 리사이즈
    const thumbBuffer = await sharp(tempLocalFile)
      .resize({ width: 300 })
      .toBuffer();

    const tempLocalThumb = path.join(tempLocalDir, thumbFileName);
    await fs.writeFile(tempLocalThumb, thumbBuffer);

    // ✅ Storage에 썸네일 업로드
    await bucket.upload(tempLocalThumb, {
      destination: thumbFilePath,
      metadata: { contentType },
    });

    console.log("✅ Thumbnail created:", thumbFilePath);

    // ✅ 썸네일 URL 생성 (public 접근 방식)
    const thumbFile = bucket.file(thumbFilePath);
    const [thumbURL] = await thumbFile.getSignedUrl({
      action: "read",
      expires: "03-01-2500",
    });

    console.log("📸 Thumbnail URL:", thumbURL);

    // ✅ Firestore 업데이트 로직
    const segments = filePath.split("/");
    // filePath: "photo/{photoId}/images/{filename}"
    const photoId = segments[1];
    const folderName = segments[2]; // "images" 또는 "cover"

    if (folderName === "images") {
      // 상세 이미지의 썸네일 업데이트 → photo_detail 컬렉션
      const pictureId = path.parse(fileName).name; // "002"
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
      // 대표 썸네일 → photo 컬렉션의 thumb_url 업데이트
      console.log(`🔹 Updating photo main document for ${photoId}`);
      await admin.firestore().collection("photo").doc(photoId).update({
        thumb_url: thumbURL,
      });
    }

    // ✅ 임시파일 정리
    await fs.remove(tempLocalDir);
    return console.log("🧹 Cleanup complete.");
});
