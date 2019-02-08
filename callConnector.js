var target = 'connector';  // or 'api' if generating code to call custom API

var targetPrefix;
var oracleMobileElement;
if (target == 'connector'){
    targetPrefix = '/mobile/connector/';
    oracleMobileElement = 'connectors';
} else if (target == 'api'){
    targetPrefix = '/mobile/custom/';
    oracleMobileElement = 'custom';
} else {
    throw new Error('Unknown target ' + target);
}

// connector (or api) name is extracted from package.json
function getName() {
    var packageJson = require('./package.json');
    if (!packageJson) {
        throw new Error('package.json file is not found');
    }
    if (!packageJson.oracleMobile){
        throw new Error('package.json file does not define oracleMobile');
    }
    if (!packageJson.oracleMobile.dependencies){
        throw new Error('package.json file does not define oracleMobile.dependencies');
    }
    var targets = packageJson.oracleMobile.dependencies[target + 's'];
    var targetsCount = 0;
    var nameVar;
    for (nameVar in targets){
        targetsCount++; 
    }
    if (targetsCount > 1){
        throw new Error('Cannot get '+target+' name - more than one '+target+' is defined in package.json');
    } else if (targetsCount == 0){
        throw new Error('Cannot get '+target+' name - no '+target+' is defined in package.json');
    }
    // remove prefix
    return nameVar.substring(targetPrefix.length);
}

var name = getName();

var exposedApiPrefix = '/mobile/custom/';
// endpoint is extracted from req.url
function getEndpoint(req) {
    var str = req.url;
    var prefixIndex = str.indexOf(exposedApiPrefix);
    if (prefixIndex >= 0){
        var substr = str.substring(prefixIndex + exposedApiPrefix.length);
        // still need to remove api name followed by slash
        var slashIndex = substr.indexOf('/');
        return substr.substr(slashIndex + 1);
    } else {
        if (str.indexOf('/') == 0){
            return str.substring(1);
        } else {
            return str;
        }
    }
}

function setInType(type, opts) {
    if (!opts){
        opts = {};
    }
    opts.inType = type;
    return opts;
}

function setOutType(req, customizer, opts) {
    // ignore response type unless customizer.response.send is specified
    if (customizer && customizer.response && customizer.response.send){
        // missing customizer.response.type would mean default type - utf8 string.
        if (customizer.response.type){
            if (!opts){
                opts = {};
            }
            opts.outType = customizer.response.type(req);
        }
    } else {
        if (!opts){
            opts = {};
        }
        opts.outType = 'stream';
    }
    return opts;
}

function getArgs(req, customizer) {
    var args;
    var method = req.method.toLowerCase();
    var endpoint = getEndpoint(req);
    var opts;
    if (method == 'post' || method == 'put' || method == 'patch'){
        var input;
        if (req.readable){
            if (customizer && customizer.request && customizer.request.body){
                console.warning('callConnector: customizer.request.body ignored because req has not been parsed.\nIn the api use parser for content type: ' + req.headers['content-type']);
            }
            opts = setInType('stream', opts);
            input = req;
        } else {
            input = req.body;
            if (customizer && customizer.request && customizer.request.body){
                input = customizer.request.body(req);
            }
            if (input && typeof input == 'object' && !Buffer.isBuffer(input)){
                opts = setInType('json', opts);
            }
        }
        opts = setOutType(req, customizer, opts);
        if (customizer && customizer.request && customizer.request.options){
            args = [endpoint, input, opts, customizer.request.options(req)];
        } else if (opts){
            args = [endpoint, input, opts];
        } else {
            args = [endpoint, input];
        }
    } else {
        opts = setOutType(req, customizer, opts);
        if (customizer && customizer.request && customizer.request.options){
            args = [endpoint, opts, customizer.request.options(req)];
        } else if (opts){
            args = [endpoint, opts];
        } else {
            args = [endpoint];
        }
    }
    return args;
}

function logFine(prefix, args, suffix) {
    var arrayToLog = [prefix];
    var first = true;
    for (var i in args){
        if (first){
            first = false;
        } else {
            arrayToLog.push(',');
        }
        if (typeof args[i] == 'string'){
            arrayToLog.push('\''+args[i]+'\'');
        } else if (args[i] && args[i].readable){
            arrayToLog.push('<stream>');
        } else {
            arrayToLog.push(args[i]);
        }
    }
    arrayToLog.push(suffix);
    console.fine.apply(null, arrayToLog);
}

function callConnector(req, res, customizer) {
    var method = req.method.toLowerCase();
    var func = req.oracleMobile[oracleMobileElement][name][method];
    var args = getArgs(req, customizer);
    if (console.is_fine()){
        logFine('callConnector: req.oracleMobile.'+oracleMobileElement+'.'+name+'.'+method+'(', args, ')')
    }
    var result = func.apply(null, args);

    if (customizer && customizer.response && customizer.response.send){
        // result is a promise
        result.then(
            function(result) {
                customizer.response.send(req, result, res);
            },
            function(error) {
                var statusCode = 500;
                if (error.statusCode){
                    statusCode = error.statusCode;
                }
                res.status(statusCode).send(error.error);
            }
        );
    } else {
        // result is a stream
        result
            .on('error', function(error) {
                res.status(500).send(error);
            })
            .pipe(res);
    }
}

module.exports = callConnector;
