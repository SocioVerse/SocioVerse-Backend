const imgbbUploader = require("imgbb-uploader");

const bufferToBase64 = (buffer) =>
  new Promise((resolve) => {
    const base64string = Buffer.from(buffer).toString("base64");
    return setTimeout(() => {
      resolve(base64string);
    }, 1000);
  });


class ImageServices {
  static async getDisplayUrl(file, name = "Default-filename") {
    const buffer = Buffer.from(file.data, 'base64');
    return await imgbbUploader({
      apiKey: process.env.IMAGE_UPLOAD_APIKEY,
      base64string: await bufferToBase64(buffer),
      name,
    })
      .then((res) => {
        console.log(`Handle success: ${res.url}`);
        return res.url;
      })
      .catch((e) => {
        console.error(`Handle error: ${e}`);
        return "Error";
      });
  };
}


module.exports = ImageServices;