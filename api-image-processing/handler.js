const multer = require('multer');
const Jimp = require('jimp');

const AWS = require('aws-sdk');
const express = require('express');
const app = express()
const port = 3030

const BUCKET_NAME = '';
const IAM_USER_KEY = '';
const IAM_USER_SECRET = '';
const REGION = "";
const s3FileURL = "https://s3-<REGION>.amazonaws.com/<BUCKET_NAME>/";

let s3bucket = new AWS.S3({
  accessKeyId: IAM_USER_KEY,
  secretAccessKey: IAM_USER_SECRET,
  region: REGION
});


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {

  //res.sendFile(__dirname + '/index.html');
  res.send("<form action=\"/image\" enctype=\"multipart/form-data\" method=\"post\">\n" +
      "  <label for=\"image\">Upload an image:</label><br>\n" +
      "  <input type=\"file\" id=\"image\" name=\"image\" ><br><br>\n" +
      "  <input type=\"submit\" value=\"Save\">\n" +
      "</form> "
  )
})
async function resizeImageByHeight(buffer, height) {
  await Jimp.read(Buffer.from(buffer, 'base64'))
      .then(async image => {

        image.resize(Jimp.AUTO, height);
        return image.getBufferAsync(Jimp.AUTO);
      })
      .catch(err => {
        console.error(err);
      });
}

async function uploadImage(image, imageName, contentType){
  //Where you want to store your file
  const params = {
    Bucket: BUCKET_NAME,
    Key: imageName,
    Body: image,
    ContentType: contentType,
    ACL: 'public-read'
  };
  //console.log("params => " + JSON.stringify(params))

  return s3bucket.upload(params, async (err, data) => {
    try {
      if (err) {
        console.log(err);
        return { msg: 'Server Error1', error: err };
      } else {
        // Add all info to database after store picture to S3
        //const photos = await database.addPhoto(db, info);

        return {
          description: imageName,
          fileLink: s3FileURL + imageName,
          s3_key: params.Key
        };
      }
    } catch (err) {
      return { msg: 'Server Error2', error: err }
    }
  });
}
app.post('/image', upload.single('image'), async (req, res) => {
  let info = req.body;

  try {
    const image = req.file;
    let timestamp = new Date().getTime();

    const image_720 = await Jimp.read(Buffer.from(image.buffer, 'base64'))
        .then(async image => {

          image.resize(Jimp.AUTO, 720);
          return image.getBufferAsync(Jimp.AUTO);
        })
        .catch(err => {
          console.error(err);
        });
    const image_360 = await Jimp.read(Buffer.from(image.buffer, 'base64'))
        .then(async image => {

          image.resize(Jimp.AUTO, 360);
          return image.getBufferAsync(Jimp.AUTO);
        })
        .catch(err => {
          console.error(err);
        });

    let image720Name = "h720px_" + timestamp + "_" + image.originalname;
    let image360Name = "h360px_" + timestamp + "_" + image.originalname;

    await (await uploadImage(image_720, image720Name, image.mimetype)).promise();
    await (await uploadImage(image_360, image360Name, image.mimetype)).promise();

    res
        .status(201)
        .send(
            "<p>Uploaded image with height <b>360px</b></p>"+
                  "<img src='"+s3FileURL + image360Name+"' alt='"+image360Name+"'/>"+
                  "<hr/>" + "<p>Uploaded image with height <b>720px</b></p>"+
                  "<img src='"+s3FileURL + image720Name+"' alt='"+image720Name+"'/>"
        );


  } catch (err) {
    res.status(500).json({ msg: 'Server Error3', error: err });
  }


})




app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})