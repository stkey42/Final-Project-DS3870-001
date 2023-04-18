const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const { json } = require('body-parser');
const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'Mickey2023!',
    database:'finalproject'
})

const HTTP_PORT = 8891;

var app = express();
app.use(cors());
app.use(express.json());

app.listen(HTTP_PORT, () => {
    console.log('Our server is listening on port ' + HTTP_PORT);
})