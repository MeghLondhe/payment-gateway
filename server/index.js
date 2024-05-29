const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios");
const bodyParser = require("body-parser");



require("dotenv").config();


const app = express();
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cors({
    origin: 'https://payment-gateway-server-nine.vercel.app', // Allow only this origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify allowed methods
    credentials: true // Include this if your request includes credentials like cookies or HTTP authentication
  }));
app.use(bodyParser.urlencoded({
    extended: false
}));



let salt_key = process.env.SALT_KEY
let merchant_id = process.env.MERCHANT_ID

app.get("/", (req, res) => {
    res.send("server is running");
})


app.post("/order", async (req, res) => {

    try {
        console.log(req.body)

        const merchantTransactionId = req.body.transactionId;
        const data = {
            merchantId: merchant_id,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: req.body.MUID,
            name: req.body.name,
            amount: req.body.amount * 100,
            redirectUrl: `https://payment-gateway-server-nine.vercel.app/order/?id=${merchantTransactionId}`,
            redirectMode: 'POST',
            mobileNumber: req.body.number,
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };
        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');
        const keyIndex = 1;
        const string = payloadMain + '/pg/v1/pay' + salt_key;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;

        const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"
        // const prod_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"

        const options = {
            method: 'POST',
            url: prod_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payloadMain
            }
        };

        axios.request(options).then(function (response) {
                console.log(response.data)

                return res.json(response.data)
            })
            .catch(function (error) {
                console.error(error);
            });

    } catch (error) {
        res.status(500).send({
            message: error.message,
            success: false
        })
    }

})


app.post("/status", async (req, res) => {

    const merchantTransactionId = req.query.id
    const merchantId = merchant_id

    const keyIndex = 1;
    const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + salt_key;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + "###" + keyIndex;

    const options = {
        method: 'GET',
        url: `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': `${merchantId}`
        }
    };

    // CHECK PAYMENT TATUS
    axios.request(options).then(async (response) => {
            if (response.data.success === true) {
                const url = `https://payment-gateway-server-nine.vercel.app/success`
                return res.redirect(url)
            } else {
                const url = `https://payment-gateway-server-nine.vercel.app/failure`
                return res.redirect(url)
            }
        })
        .catch((error) => {
            console.error(error);
        });

})


