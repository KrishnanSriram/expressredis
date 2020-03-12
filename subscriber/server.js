const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const app = express();
const fs = require('fs');
const ba64 = require("ba64");
const Tesseract = require('tesseract.js');

require('dotenv').config();
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

const subscriber = redis.createClient(6379, '127.0.0.1');
const publisher = redis.createClient(6379, '127.0.0.1');

app.get('/', (req, res) => {
    res.status(200).send({ 'message': 'Try another URI' });
})

subscriber.subscribe('imagecollection');
subscriber.on('message', async (channel, message) => {
    console.log(`Received message - ${Date.now().toString()}`);
    const jsonData = JSON.parse(message);
    console.log(jsonData.filename);
    const filePath = `./images/${jsonData.filename}`;
    await fs.writeFile(filePath, jsonData.image, 'base64', (err) => {
        if(err) {
            console.log('ERROR: Failed to create file');
            console.log(err);
        }
    });
    console.log('File created! Now extracting text content............');
    await Tesseract.recognize(filePath,
        'eng'
    ).then(async ({ data: { text } }) => {
        console.log('Text content extracted. Persisting in Redis........');
        const textContent = {
            text,
            filename: jsonData.filename + '.txt'
        };
        await persistTextContent(textContent);
        console.log('Process completed');
    }).catch(err => {
        console.log('ERROR: Failed to extract text from image', jsonData.filename);
    });

});

const persistTextContent = async (jsonContent) => {
    await publisher.publish("imagetextcollection", JSON.stringify(jsonContent), (err, channelId) => {
        if (err) {
            console.log(err);
        }
        console.log('Persisted content into imagetextcollection with channel Id', channelId);
    });
}

app.get('/extracted/data', async (req, res) => {
    let data = [];
    await publisher.keys('*', (err, keys) => {
        Promise.all(keys.map(key => client.getAsync(key)))
            .then(values => {
                data = values;
                const finalResponse = {
                    count: data.length,
                    data,
                };
                res.status(200).json(finalResponse);
            })
            .catch(err => {
                res.status(500).json(err);
            })
    });
});

app.listen(process.env.PORT, () => {
    console.log(`Redis SUBSCRIBER NodeJS application in port ${process.env.PORT}`);
});
