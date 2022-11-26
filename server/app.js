const express = require('express');
const parser = require('body-parser')
const amqplib = require('amqplib/callback_api');
const redis = require('redis');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();

app.use(cors())
app.use(parser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
app.use(parser.json({limit: "50mb"}))


// RabbitMq Starts

let ch = null;
const queue = 'code_queue';
amqplib.connect(process.env.AMQP_URL, function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    ch = channel;

    channel.assertQueue(queue, {
      durable: false
    });
  });
});

const sendMessage = async (data) => {
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
    console.log(` [x] Sent: %s %s file has been sent to %s`, data.folder, data.lang, queue);
};

// RabbitMq Ends

// Radis Starts

const client = redis.createClient({
    url: process.env.REDIS_URL
});

client.on("error", (err) => {
	console.log("Can't Connect to Redis : " + err);
});

// Redis Ends

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
        status: "Success",
        data: data
    }
}

app.get('/' , (req,res)=>{
    res.status(200).send("Hello, The Server is Working!");
});

app.get('/stats', (req, res) => {
    var os = require('os-utils'); //for os details
    let cpu_usage
    let cpu_free
    os.cpuUsage(function (v) {
        cpu_usage = v * 100;
        os.cpuFree(function (v) {
            cpu_free = v * 100;
            data = {
                "OS platform": os.platform(),
                "CPU usage (%)": cpu_usage,
                "CPU free  (%)": cpu_free,
                "CPU count": os.cpuCount(),
                "Free memory (mb)": os.freemem(),
                "Total memory (mb)": os.totalmem(),
                "Free memory (%)": os.freememPercentage() * 100,
                "OS Uptime (hour)": os.sysUptime() / 3600,
                "Avg Load (15min)": os.loadavg(15) * 100
            }
            console.log(data);
            // for printing json beautifully in response 
            res.set({
                'Content-Type': 'application/json; charset=utf-8'
            })
            res.status(200).send(JSON.stringify(data, undefined, ' '));
        })
    })
});

app.post("/submit", async (req, res) => {
    try {
        let data = {
            'src': req.body.src,
            'input': req.body.input,
            'lang': req.body.lang,
            'timeOut': req.body.timeout,
            'folder': randomBytes(10).toString('hex')
        }
        await sendMessage(data);
        res.status(202).send(successResponse(req.protocol + '://' + req.get('host') + "/results/" + data.folder));
    } catch (error) {
        console.log(error);
        res.status(500).send(errorResponse(500, "System error"));
    }

});

app.get("/results/:id", async (req, res) => {

    try {
        let folder = req.params.id;
        client.get(folder, (err, status) => {
            if (status == null) {
                res.status(202).json({status:"Queued"});
            }
            else if (status == 'Processing') {
                res.status(202).json({status:"Processing"});
            }
            else if (status == 'Runtime Error') {
                res.status(202).json({status:"Runtime Error"});
            }
            else {
                res.status(200).send(successResponse(JSON.parse(status)));
            }
        });
    } catch (error) {
        res.status(500).send(errorResponse(500, "System error"));
    }

});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server app listening at port ${PORT}!`)
});
