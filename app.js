const express = require('express');
const path = require('path');
const request = require('request');
const bodyParser = require('body-parser');
const parser = require('xml2json');
const querystring = require('querystring');
const https = require('https');
const cookieParser = require('cookie-parser');


const port = process.env.PORT || 3050;

const app = express();


app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser())


// serve index.html as the homepage
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
})


// Handle post request /reglookup
app.post("/reglookup", function(req, res){

	console.log(req.body);

	// Get Reg from request
	var reg = req.body.reg

	// send request to motorcheck api using that reg
	var url = "http://beta.motorcheck.ie/vehicle/reg/"+reg+"/identity/vin?_username=hubspot&_api_key=ee2a3d5b341f12a53e953e3ad5550de7dc1f9560";


	request(url, function(error, response, body) {

		// console.log(response)

		if (!error && response.statusCode == 200) {

			console.log(body);
       var result = parser.toJson(body, {
          object: false,
          reversible: false,
          coerce: true,
          sanitize: true,
          trim: true,
          arrayNotation: false
       });
       res.set('Content-Type', 'application/json');
       res.send(result);

       // send info to hubspot
			sendToHubspot(req, result);

    } else if (response.statusCode == 404) {

        	// vehicle not found
        	res.status(404).send('No vehicle found');
        }
     else {
     	res.send(response);
     }


	});

})


function sendToHubspot (req, MC_res) {

	var postData = querystring.stringify({
	    'email': req.body.email,
	    'vehicle_details': MC_res,
	    'hs_context': JSON.stringify({
	        "hutk": req.cookies.hubspotutk,
	        "ipAddress": req.headers['x-forwarded-for'] || req.connection.remoteAddress,
	        "pageUrl": "http://tintit-hubspot.herokuapp.com",
	        "pageName": "Testing Hubspot api"
	    })
	});

	// set the post options, changing out the HUB ID and FORM GUID variables.
	var options = {
		hostname: 'forms.hubspot.com',
		path: 'uploads/form/v2/632486/70f10f66-1f7a-4e9b-9d01-98ba6b375ce4',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		}
	}

	// set up the request
	var request = https.request(options, function(response){
		console.log("Status: " + response.statusCode);
		console.log("Headers: " + JSON.stringify(response.headers));
		response.setEncoding('utf8');
		response.on('data', function(chunk){
			console.log('Body: ' + chunk)
		});
	});

	request.on('error', function(e){
		console.log("Problem with request " + e.message)
	});


	// post the data
	request.write(postData);
	request.end();

}



app.listen(port);