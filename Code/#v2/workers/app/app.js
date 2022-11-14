import fs from "fs";
import rimraf from "rimraf";
import { exec } from "child_process";
import * as amqp from 'amqp-connection-manager';
import redis from 'redis'

const extensions = {
    cpp: "cpp",
    c: "c",
    java: "java",
    python3: "txt",
};

// RabbitMq Consumer Starts

const QUEUE_NAME = 'judge'
const connection = amqp.connect(['amqp://rabbitmq:5672']);

connection.on('connect', function () {
    console.log('Connected!');
});

connection.on('disconnect', function (err) {
    console.log('Disconnected.', err);
});

const onMessage = (data) => {

    let message = JSON.parse(data.content.toString());
    //console.log(message);
    createFiles(message, channelWrapper, data);
}

// Set up a channel listening for messages in the queue.
const channelWrapper = connection.createChannel({
    setup: function (channel) {
        // `channel` here is a regular amqplib `ConfirmChannel`.
        return Promise.all([
            channel.assertQueue(QUEUE_NAME, { durable: true }),
            channel.prefetch(1),
            channel.consume(QUEUE_NAME, onMessage)
        ]);
    }
});

channelWrapper.waitForConnect()
    .then(function () {
        console.log("Listening for messages");
    });

// RabbitMq Consumer Ends

// Redis Starts

const client = redis.createClient({
	host: 'redis-server',
	port: 6379
})

client.on('error', (err) => {
	console.log("Error " + err)
});

// Redis Ends

const runCode = async (apiBody, ch, msg) => {
    try {
        client.set(apiBody.folder.toString(), 'Processing');
        const command = `python3 run.py ../temp/${apiBody.folder}/source.${extensions[apiBody.lang]} ${apiBody.lang} ${apiBody.timeOut}`;
        await fs.promises.writeFile(`/temp/${apiBody.folder}/output.txt`, "");
        console.log("Output.txt created !")

        const output = await execute(command);
        const data = await fs.promises.readFile(`/temp/${apiBody.folder}/output.txt`, "utf-8");
        let result = {
            output: data,
            stderr: output.stderr,
            status: output.stdout,
            submission_id: apiBody.folder,
        };

        console.log(result);
        deleteFolder(`../temp/${apiBody.folder}`);
        client.setex(apiBody.folder.toString(), 3600, JSON.stringify(result));
        ch.ack(msg);
    } catch (error) {
        console.log("Error")
    }

}

const createFiles = async (apiBody, ch, msg) => {
    try {
        await fs.promises.mkdir(`/temp/${apiBody.folder}`);
        await fs.promises.writeFile(`/temp/${apiBody.folder}/input.txt`, apiBody.input);
        await fs.promises.writeFile(`/temp/${apiBody.folder}/source.${extensions[apiBody.lang]}`, apiBody.src);
        runCode(apiBody, ch, msg);
    } catch (error) {
        console.log(error)
    }
};

const deleteFolder = (path) => {

    return new Promise((resolve, reject) => {
        rimraf(path, (err) => {
            if (err) {
                reject(err);
            }
            else {
                console.log(`Deleted folder ${path}`)
                resolve(`Deleted folder ${path}`);
            }
        });
    })

}

 const execute = (command) => {

    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                let status = {stdout:stdout,stderr:stderr};
                resolve(status);
            }
        })
    })

}
