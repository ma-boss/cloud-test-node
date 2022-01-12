const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const PORT = process.env.PORT || 80;
const HOST = "0.0.0.0";

// App
const app = express();

app.use(bodyParser.raw());
app.use(bodyParser.json({}));
app.use(bodyParser.urlencoded({ extended: true }));
const request = require("request");

const COS = require("cos-nodejs-sdk-v5");
const cos = new COS({
  getAuthorization: function (options, callback) {
    // 异步获取临时密钥
    request(
      {
        url: `http://api.weixin.qq.com/_/cos/getauth`,
        data: {
          // 可从 options 取需要的参数
        },
      },
      function (err, response, body) {
        console.log(body);
        try {
          var data = JSON.parse(body);
        } catch (e) {}
        if (!data) return console.error("credentials invalid");
        callback({
          TmpSecretId: data.TmpSecretId, // 临时密钥的 tmpSecretId
          TmpSecretKey: data.TmpSecretKey, // 临时密钥的 tmpSecretKey
          SecurityToken: data.Token, // 临时密钥的 sessionToken
          ExpiredTime: data.ExpiredTime, // 临时密钥失效时间戳，是申请临时密钥时，时间戳加 durationSeconds
        });
      }
    );
  },
});

app.all("/msgpush", async (req, res) => {
  res.send({
    ToUserName: req.body.FromUserName,
    FromUserName: req.body.ToUserName,
    CreateTime: Date.parse(new Date()) / 1000,
    MsgType: "text",
    Content: "Hello!",
  });
});

app.post("/cos/get", (req, res) => {
  const { bucket, region } = req.body;
  if (!bucket || !region) {
    return res.json({
      err: 1,
      msg: "bucket and region is required",
    });
  }
  cos.getBucket(
    {
      Bucket: bucket,
      Region: region,
    },
    (err, data) => {
      console.log(err, data);
      res.json(data);
    }
  );
});


app.get("/test/getcodeunlimited", (req, res) => {
  request(
    `http://api.weixin.qq.com/wxa/getwxacodeunlimit?scene=1000`,
    { encoding: null },
    (_, __, body) => {
      res.setHeader("Content-Type", "image/jpeg");
      res.write(body);
      res.end();
    }
  );
});

app.get("/test/getcode", (req, res) => {
  request(
    `http://api.weixin.qq.com/wxa/getwxacode`,
    {
      method: "POST",
      body: JSON.stringify({
        path: "/pages/index/index2",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      encoding: null,
    },
    (err, response, body) => {
      // pipe to res
      // console.log(body)
      res.setHeader("Content-Type", "image/jpeg");
      res.write(body);
      // save image to /tmp
      fs.writeFileSync("/tmp/qrcode.jpg", body);
      res.end();
    }
  );
});

app.get("/test/readcode", (req, res) => {
  request(
    `http://api.weixin.qq.com/cv/img/qrcode`,
    {
      method: "POST",
      formData: {
        image: fs.createReadStream("/tmp/qrcode.jpg"),
      },
    },
    (err, response, body) => {
      res.json(body);
    }
  );
});

app.get("/test/devinfo", (req, res) => {
  request(
    `http://api.weixin.qq.com/wxa/getwxadevinfo`,
    (err, response, body) => {
      res.json(body);
    }
  );
});

app.get("/test/svrkit", (req, res) => {
  request(
    `http://api.weixin.qq.com/_/internal?mode=svrkit`,
    {
      method: "POST",
      body: JSON.stringify({
        func_name: "EchoTest",
        service_name: "MMBizWxaQbaseDemo",
        data: {
          OpenTime: true,
          StringData: "default_string",
          UintListData: [1, 2, 3],
          MessageData: { Data: "11" },
        },
        magic: 15618,
        cmdid: 1,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
    (err, response, body) => {
      res.json(body);
    }
  );
});

app.get("/test/polaris", (req, res) => {
  request(
    `http://api.weixin.qq.com/_/internal?mode=polaris`,
    {
      method: "POST",
      body: JSON.stringify({
        modid: 65146561,
        cmdid: 65536,
        url: "/wxa-dev-qbase/apihttpagent",
        headers: Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`),
        post_data: JSON.stringify({}),
        method: `HTTP_${req.method.toUpperCase()}`,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
    (err, response, body) => {
      res.json(body);
    }
  );
});

app.get("/test/pay", (req, res) => {
  request(
    `http://api.weixin.qq.com/_/pay/unifiedOrder`,
    {
      method: "POST",
      body: JSON.stringify({
        openid: "oFkBexampleopenidOvsi8i8",
        body: "小秋TIT店-周公子超市",
        out_trade_no: "sds11a1f11232",
        spbill_create_ip: "127.0.0.1",
        sub_mch_id: "1900006511",
        total_fee: 1,
        env_id: "test-f0b102",
        callback_type: 2,
        container: {
          service: "test",
          path: "/paycallback",
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    },
    (err, response, body) => {
      res.json(body);
    }
  );
});

app.get("/", express.static("html"));

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
