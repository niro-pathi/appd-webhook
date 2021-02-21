const express = require('express');
// Example to Handle Get Requests using request Node.js module
// include request module
const https = require("https");

const stringifyObject = require('stringify-object');

//get environment variables
const { WEBEX_SERVER, WEBEX_ACCESS_KEY, PORT, APPINSIGHTS_INSTRUMENTATIONKEY} = require("./config");

let appInsights = require("applicationinsights");
appInsights.setup(APPINSIGHTS_INSTRUMENTATIONKEY).start();

// create express application instance
const app = express()

app.use(express.json());

const healthcheck = {
  status: "Webhook Server is running"
};

const postresponse = {
    status: "Request accepted."
};

// define middleware function
function logger(req, res, next) {
    console.log(new Date(), req.url)
    next()
 }
  
 // calls logger:middleware for each request-response cycle
 app.use(logger);

// express route
app.get('/', function (req, res) {
    res.send('Server is listening')
 })

//health check 
app.get('/healthcheck/', function (req, res) {
    return res.json(healthcheck);  
});

//POST webhook
app.post('/webhook/',function (req,res, next){

    const actionid = (JSON.stringify(req.body.data.id).replace(/"/g,''));

    let room_id, bot_id, bot_name, intent;
    
    // get action data
    const getaction = {
        hostname: WEBEX_SERVER,
        path: `/v1/attachment/actions/${actionid}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WEBEX_ACCESS_KEY}`
        }
    }

    const request = https.request(getaction, response => {
        let chunks_of_data = [];
        console.log(`statusCode: ${response.statusCode}`);
      
        response.on('data', d => {
            chunks_of_data.push(d);
        });

        response.on('end', () => {
            let response_body = Buffer.concat(chunks_of_data);

            bot_id = JSON.parse(response_body).inputs.BotId;
            room_id = JSON.parse(response_body).roomId;
            bot_name = JSON.parse(response_body).inputs.BotName;
            intent = JSON.parse(response_body).inputs.Intent;

            console.log(`Intent ${intent} is sent to ${bot_name}|${bot_id} in room ${room_id}.`);

            //post intent back
            const intentdata = JSON.stringify({
               roomId: room_id,
               markdown: `Hi <@personEmail: ${bot_id}|${bot_name}>,${intent}`
            });

            const botmessage = {
                hostname: WEBEX_SERVER,
                path: '/v1/messages',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${WEBEX_ACCESS_KEY}`
                }
            }

            botrequest = https.request(botmessage, response => {
                console.log(`statusCode: ${res.statusCode}`)
              
                response.on('data', d => {
                  process.stdout.write(d)
                });
            });
              
            botrequest.on('error', error => {
                console.error(error)
            });
              
            botrequest.write(intentdata);
            botrequest.end();
            
        });

    });
      
    request.on('error', error => {
        console.error(error)
    });
      
    request.end();
    

    return res.json(actionid); 

    next();
});
  
// start the server
const server = app.listen(PORT, function(){
    console.log('Listening on port 8000...')
});