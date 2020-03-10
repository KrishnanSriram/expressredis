const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const app = express();
const multer = require('multer');
const fs = require('fs');

require('dotenv').config();
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

const publisher = redis.createClient(6379, '127.0.0.1');

// SET STORAGE
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        //file.fieldname + '-' + Date.now()
      cb(null, file.originalname)
    }
  })
   
const upload = multer({ storage: storage })

app.get('/', (req, res) => {
    res.status(200).send({ 'message': 'Try another URI' });
})

app.post('/', async (req, res) => {
    const data = req.body;
    console.log(req.body);
    await publisher.publish("imagecollection", JSON.stringify(data), (err, channelId) => {
        if (err) {
            console.log(err);
        }
        console.log(`Channel ID from Redis - ${channelId}`);
        res.status(200).send({message: 'Item added to Reddis server, check with subscribed endpoint'});
    });
});

app.post('/image', upload.single('image'), async (req, res, next) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }
    const data = fs.readFileSync(req.file.path);
    const encodedImage = data.toString('base64');
    const finalData = {
        image: encodedImage,
        filename: req.file.originalname,
    };
    await publisher.publish("imagecollection", JSON.stringify(finalData), (err, channelId) => {
        if (err) {
            console.log(err);
            res.status(500).send({ message: 'Unfortunately, we were not able to upload file!' });
        }
        console.log(`Channel ID from Redis - ${channelId}`);
        res.status(200).send({ message: 'Item added to Reddis server, check with subscribed endpoint' });
    });
    // res.status(201).send({ message: 'Your file is uploaded for processing!' });
    
});

app.listen(process.env.PORT, () => {
    console.log(`Redis PUBLISHER NodeJS application in port ${process.env.PORT}`);
});