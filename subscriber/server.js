const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const app = express();

require('dotenv').config();
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

const subscriber = redis.createClient(6379, '127.0.0.1');

app.get('/', (req, res) => {
    res.status(200).send({ 'message': 'Try another URI' });
})

subscriber.subscribe('imagecollection');
subscriber.on('message', (channel, message) => {
    console.log(`Received message - ${Date.now().toString()}`);
    console.log(message);
});


app.listen(process.env.PORT, () => {
    console.log(`Redis SUBSCRIBER NodeJS application in port ${process.env.PORT}`);
});