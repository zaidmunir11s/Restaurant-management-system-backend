import AWS from 'aws-sdk';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const s3 = new AWS.S3({
    endpoint: `https://18d63ffe49104017f7bcb222d2aa6ccb.r2.cloudflarestorage.com`,
    accessKeyId: "a1e3f8dd477fdc5e195383b7450a79be",
    secretAccessKey:
      "0b6c332dc40654de4edd9aefa3a1d20687af4ca20cc76627eeb967cc67bbd28d",
    region: "auto",
    signatureVersion: "v4",
    sslEnabled: true,
    s3ForcePathStyle: true,
});

export const processArModel = async (usdzFilePath) => {
    const glbFilePath = path.join(path.dirname(usdzFilePath), "output.glb");

    try {
      await convertUsdzToGlb(usdzFilePath, glbFilePath);

      const glbUrl = await uploadToR2(glbFilePath);

      fs.unlinkSync(usdzFilePath);
      fs.unlinkSync(glbFilePath);
      return glbUrl;
    } catch (error) {
      throw error;
    }
};

export const convertUsdzToGlb = (usdzFilePath, glbFilePath) => {
    return new Promise((resolve, reject) => {
      const command = `dotnet /Users/codify/Downloads/ar-backend/bin/Debug/net9.0/USDZtoGLTFConverter.dll ${usdzFilePath} ${glbFilePath}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(`Conversion failed: ${stderr}`);
        } else {
          resolve(undefined);
        }
      });
    });
};

export const uploadToR2 = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const fileName = `converted-${Date.now()}.glb`;

    await s3
      .putObject({
        Bucket: 'your-bucket-name',
        Key: fileName,
        Body: fileStream,
      })
      .promise();

    return `https://menu-reality.com/${fileName}`;
};
