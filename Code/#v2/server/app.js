import express from 'express';
import cors from 'cors';
import parser from 'body-parser';
import { randomBytes } from 'crypto';
import * as amqp from 'amqp-connection-manager';
import redis from "redis";

const app=express();

app.use(cors())
app.use(parser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
app.use(parser.json({limit: "50mb"}))


// RabbitMq Starts

const QUEUE_NAME = 'judge'

const connection = amqp.connect(['amqp://rabbitmq:5672']);

connection.on('connect', function() {
    console.log('Connected!');
});

connection.on('disconnect', function(err) {
    console.log('Disconnected.', err);
});

const channelWrapper = connection.createChannel({
    json: true,
    setup: function(channel) {
        // `channel` here is a regular amqplib `ConfirmChannel`.
        return channel.assertQueue(QUEUE_NAME, {durable: true});
    }
});

const sendMessage = async (data) => {
    channelWrapper.sendToQueue(QUEUE_NAME, data)
    .then(function() {
        console.log("Message sent");
    })
    .catch(function(err) {
        console.log("Message was rejected:", err.stack);
        channelWrapper.close();
        connection.close();
    });
};

// RabbitMq Ends

// Radis Starts

const client = redis.createClient({
	host: "redis-server",
	port: 6379,
});

client.on("error", (err) => {
	console.log("Error " + err);
});


const errorResponse = (code, message) => {
    return {
        status: "error",
        data: null,
        error: {
            code: code,
            message: message
        }
    }
}

const successResponse = (data) => {
    return {
        status: "ok",
        data: data
    }
}

const getFromRedis = (key) => {
    return new Promise((resolve, reject) => {
        client.get(key, (err, data) => {

            if (err) {
                reject(err);
            } else {
                resolve(data);
            }

        });
    })
}

// Redis Ends

app.post("/submit", async (req, res) => {
    try {
        let data = {
            'src': req.body.src,
            'input': req.body.stdin,
            'lang': req.body.lang,
            'timeOut': req.body.timeout,
            'folder': randomBytes(10).toString('hex')
        }
        await sendMessage(data);
        res.status(202).send(successResponse(`http://localhost:7000/results/${data.folder}`));
    } catch (error) {
        console.log(error);
        res.status(500).send(errorResponse(500, "System error"));
    }

});

app.get("/results/:id", async (req, res) => {

    try {
        let key = req.params.id;
        let status = await getFromRedis(key);

        if (status == null) {
            res.status(202).send({ "status": "Queued" });
        }
        else if (status == 'Processing') {
            res.status(202).send({ "status": "Processing" });
        }
        else {
            status = JSON.parse(status);
            res.status(200).send(successResponse(status));
        }
    } catch (error) {
        res.status(500).send(errorResponse(500, "System error"));
    }

});


const port = process.env.PORT || 7000;
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
