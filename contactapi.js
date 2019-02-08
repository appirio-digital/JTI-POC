// no need to add body-parser as a dependency in package.json - it's provided by omce custom code container
var bodyParser = require('body-parser');

// passes client's request to the connector, sends back connector's response
var callConnector = require('./callConnector.js');

/**
 * Mobile Cloud custom code service entry point.
 * @param {external:ExpressApplicationObject}
 * service 
 * @see {@link http://expressjs.com/en/4x/api.html}
 */
module.exports = function(service) {

// uncomment if using customizer to customize binary request with content-type 'application/octet-stream' - it will be parsed into a Buffer and assigned to req.body. Otherwise these requests streamed through (recommended approach if no customization is required).
//service.use(bodyParser.raw({type: 'application/octet-stream', limit: '100mb'}));
// uncomment if using customizer to customize text request with text content-type - it will be parsed into a string and assigned to req.body. Otherwise these requests streamed through (recommended approach if no customization is required).
//service.use(bodyParser.text({type: 'text/*', limit: '1mb'}));

// In OMCe UI, in Diagnostics -> Logs tab, ServerSetting button allows to set backend log level: set your mbe log level to FINE (FINER, FINEST) to see the generated custom code sdk calls.


	service.post('/mobile/custom/ContactAPI/contacts', function(req,res) {
		// uncomment customizer to customize request and/or response
		callConnector(req, res/*,customizer*/);
	});

	service.get('/mobile/custom/ContactAPI/contacts', function(req,res) {
		// uncomment customizer to customize request and/or response
		callConnector(req, res/*,customizer*/);
	});

	service.put('/mobile/custom/ContactAPI/contacts/:contactsId', function(req,res) {
		// uncomment customizer to customize request and/or response
		callConnector(req, res/*,customizer*/);
	});

	service.get('/mobile/custom/ContactAPI/contacts/:contactsId', function(req,res) {
		// uncomment customizer to customize request and/or response
		callConnector(req, res/*,customizer*/);
	});

	service.delete('/mobile/custom/ContactAPI/contacts/:contactsId', function(req,res) {
		// uncomment customizer to customize request and/or response
		callConnector(req, res/*,customizer*/);
	});

	service.patch('/mobile/custom/ContactAPI/contacts/:contactsId', function(req,res) {
		// uncomment customizer to customize request and/or response
		callConnector(req, res/*,customizer*/);
	});

	service.get('/mobile/custom/ContactAPI/contacts/describe', function(req,res) {
		// uncomment customizer to customize request and/or response
		callConnector(req, res/*,customizer*/);
	});

};

// Edit this sample customizer and pass it as a last parameter to callConnector to override request sent to connector and/or connector's response.
// Without customizer callConnector streams request to connector, then connector's response is streamed back to client - recommended approach in case no customization is required.
var customizer = {
    // allows to customize request sent to connector. If omitted then the request streamed to the connector - recommended approach in case no request customization is required.
    request: {
        // used - with post and put only - to customize request body
        // If not specified then request body is streamed directly to the connector - no need to define this function unless you need to override the payload.
        body: function(req) {
            console.log('customizer.request.body: req.body = ', req.body);
            var body = req.body;
            // OVERRIDE request body here - substitute this sample code:
            if (typeof body == 'string'){
                // to enable string parsing uncomment  service.use(bodyParser.text... - otherwise req.body would never be a string
                body += ' customized request';
            } else if (typeof body == 'object'){
                if (Buffer.isBuffer(body)){
                    // to enable binary parsing uncomment  service.use(bodyParser.raw... - otherwise req.body would never be a Buffer
                    body = Buffer.concat([Buffer.alloc(8, '00000000'), body]);
                } else {
                    // json parsing is enabled by default
                    body['customized-request'] = true;
                }
            }
            console.log('customizer.request.body ->', body);
            return body;
        }/*,
        // advanced: uncomment to add options to connector request, see https://github.com/request/request#requestoptions-callback
        options: function(req) {
            var options = {headers: {myHeader: 'myHeaderValue'}};
            console.log('customizer.request.options ->', options);
            return options;
        }*/
    },
    // allows to send customized connector response to the client. If omitted then connector's response is streamed to the client - recommended approach in case no response customization is required.
    response: {
        // ignored unless response.send is specified. Determines type of connectorPromiseResult.result passed to response.send:
        //    undefined, // Response body is converted to a string using the UTF8 encoding.
        //    'json',    // Convert response body to a JSON object. Note that if there are JSON parse errors, then response body remains a string. 
        //    'binary',  // Do not convert the response body to a string.
        //    'encoding' // Convert response body to a string using the specified encoding.
        type: function(req) {
            // assuming that the connector returns json. OVERRIDE if that's not the case.
            var type = 'json';
            console.log('customizer.response.type ->', type);
            return type;
        },
        // alter the connector response and send it to the client.
        send: function(req, connectorPromiseResult, res) {
            if (req.method.toLowerCase() == 'head'){
                // OVERRIDE response headers here - substitute the sample code:
                var headers = {}
                for (var key in connectorPromiseResult.headers){
                    headers[key] = connectorPromiseResult.headers[key];
                    if (key.toLowerCase() == 'content-length'){
                        var length = parseInt(headers[key]);
                        var newLength;
                        var contentType = connectorPromiseResult.headers['content-type'];
                        if (contentType.startsWith('text')){
                            newLength = length + ' customized response'.length;
                        } else if (contentType == 'application/octet-stream'){
                            newLength = length + Buffer.alloc(8, '11111111').length;
                        } else if (contentType == 'application/json'){
                            newLength = length + JSON.stringify({'customized-response': true}).length;
                        }
                        if (newLength){
                            headers[key] = newLength;
                        }
                    }
                }
                res.writeHead(connectorPromiseResult.statusCode, headers);
                // it is necessary to call res.end
                res.end();
            } else {            
                var body = connectorPromiseResult.result;
                // type of body is determined by response.type(req): 'json' -> json object; 'binary' -> Buffer; string otherwise
                console.log('customizer.response.send: body type is ', (typeof body == 'object' ? (Buffer.isBuffer(body) ? 'Buffer' : 'object') : typeof body));
                console.log('customizer.response.send: status =', connectorPromiseResult.statusCode, '; body = ', body);
                res.type(connectorPromiseResult.headers['content-type']);
                // OVERRIDE response body here - substitute the sample code:
                if (typeof body == 'string'){
                    body += ' customized response';
                } else if (typeof body == 'object'){
                    if (Buffer.isBuffer(body)){
                        body = Buffer.concat([body, Buffer.alloc(8, '11111111')]);
                    } else {
                        body['customized-response'] = true;
                    }
                }
                console.log('customizer.response.send: res.send(', body, ')');
                res.status(connectorPromiseResult.statusCode).send(body);
            }
        }
    }
};
