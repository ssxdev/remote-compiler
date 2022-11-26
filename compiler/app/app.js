const amqplib = require('amqplib/callback_api');
const redis = require('redis');
const fs = require('fs');
const rimraf = require('rimraf');
const { exec } = require('child_process');

const extensions = {
    cpp: "cpp",
    c: "c",
    java: "java",
    python3: "txt",
};

// RabbitMq Consumer Starts

const queue = 'code_queue';
amqplib.connect(process.env.AMQP_URL, function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }

    channel.assertQueue(queue, {
      durable: false
    });
    channel.prefetch(1);
    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);

    channel.consume(queue, function(data) {
        const message = JSON.parse(data.content.toString());
        console.log(" [x] Received " + message.folder + " " + message.lang);
        createFiles(message);
      }, {
          noAck: true
        });

  });
});

// RabbitMq Consumer Ends

// Redis Starts

const client = redis.createClient({
	url: process.env.REDIS_URL
});

client.on('error', (err) => {
	console.log("Can't Connect to Redis " + err);
});

// Redis Ends

const runCode = async (apiBody) => {
    try {
        client.set(apiBody.folder.toString(), 'Processing');
        const command = `python3 run.py ../temp/${apiBody.folder}/source.${extensions[apiBody.lang]} ${apiBody.lang} ${apiBody.timeOut}`;
        
        const output = await execute(command);
        const data = await fs.promises.readFile(`../temp/${apiBody.folder}/output.txt`, "utf-8");
        let stats = fs.statSync(`../temp/${apiBody.folder}/source.${extensions[apiBody.lang]}`);
        let fileSizeInBytes = stats.size;
        let fileSizeInMegabytes = fileSizeInBytes / (1024*1024);
        let result = {
            output: data,
            stderr: output.stderr,
            status: output.stdout,
            language: apiBody.lang,
            fileSizeInBytes: fileSizeInBytes,
            fileSizeInMegabytes: fileSizeInMegabytes,
            startedAt: output.startedAt.toUTCString(),
            completedAt: output.completedAt.toUTCString(),
            timeTakenInMillisecond: output.completedAt - output.startedAt,
            timeTakenInSeconds: (output.completedAt - output.startedAt)/1000,
            submission_id: apiBody.folder,
        };
        console.log(result);
        
        client.setex(apiBody.folder.toString(), 3600, JSON.stringify(result));
        deleteFolder(`../temp/${apiBody.folder}`);
        console.log(` [x] Code Compile Complete ${apiBody.folder} ${apiBody.lang} in ${output.completedAt - output.startedAt}ms`);
               
    } catch (error) {
        console.log("Error while running Code ", error);
        client.set(apiBody.folder.toString(), 'Runtime Error');
        deleteFolder(`../temp/${apiBody.folder}`);
    }
}

const createFiles = async (apiBody) => {
    try {
        await fs.promises.mkdir(`../temp/${apiBody.folder}`);
        await fs.promises.writeFile(`../temp/${apiBody.folder}/input.txt`, apiBody.input);
        await fs.promises.writeFile(`../temp/${apiBody.folder}/source.${extensions[apiBody.lang]}`, apiBody.src);
        await fs.promises.writeFile(`../temp/${apiBody.folder}/output.txt`, "");
        console.log(` [x] Created ${apiBody.folder} ${apiBody.lang} Files`);
        runCode(apiBody);
    } catch (error) {
        console.log(` [~] Creating ${apiBody.folder} ${apiBody.lang} File ${error}`);
    }
};

const deleteFolder = (path) => {
    return new Promise((resolve, reject) => {
        rimraf(path, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(`Deleted folder ${path}`);
            }
        });
    })
}

const execute = (command) => {

    return new Promise((resolve, reject) => {
        let startedAt = new Date();
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                let completedAt = new Date();
                let status = {stdout:stdout,stderr:stderr,startedAt:startedAt,completedAt:completedAt};
                resolve(status);
            }
        })
    })

}
