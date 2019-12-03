var http = require('http');
var url = require('url');
var stringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');
var con = require('./dbMySql');
var path = require('path');

//Instantiating HTTP server
var server = http.createServer(function(req,res){
    unifiedServer(req,res);
});

//Running HTTP server on environment's port
server.listen(3000);

//Unified server for both HTTP and HTTPS requests
var unifiedServer = function(req,res){
    
    //Get the URL and parse it
    var parsedUrl = url.parse(req.url,true);

    //Get the path
    var path = parsedUrl.pathname;
    path = path.replace(/^\/+|\/+$/g,'');

    //Get the http method
    var method = req.method;

    //Get the query string object
    var queryStringObject = parsedUrl.query;

    //Get the header object
    var headers = req.headers;

    //Get payload stream
    var decoder = new stringDecoder('UTF-8');
    var buffer = '';
    req.on('data',function(data){
        buffer += decoder.write(data);
        //console.log(decoder.write(data)+"\n");
    });

    req.on('end',function(){
        buffer += decoder.end();

        //prepare data object for handler
        var data = {
            path : path,
            method : method,
            queryStringObject : queryStringObject,
            headers : headers,
            payload : buffer,
        };
        //choose handler for requested path
        var chosenHandler;
        if(typeof(router[path]) === "undefined"){
            console.log("if case");
            handlers.notFound(req,res);
            return;
        }
        else{
            chosenHandler = router[path];
            console.log("else case");
        }

        //call the handler
        chosenHandler(data,function(status,payload){
            var statusCode = typeof(status) !== "number" ? 200 : status;

            var payload = typeof(payload) !== "object" ? {} : payload;

            var payloadString = JSON.stringify(payload);

            res.setHeader('content-type','application/json')
            res.writeHead(statusCode);
            res.end(payloadString);
        });
    });
    
}
//handler object 
var handlers = {};

//notFound handler i.e no route found
handlers.notFound = function(request,response){
    //console.log(data);
    var filePath = '.' + request.url;
    if (filePath == './') {
        filePath = './view/webView.html';
    }

    var extname = String(path.extname(filePath)).toLowerCase();
    var mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.svg': 'application/image/svg+xml'
    };

    var contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT') {
                fs.readFile('./404.html', function(error, content) {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end();
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });
};


//handler functions
handlers.hardware = function(data,callback){
    console.log("in hardware route\n");
    console.log('printing payload',data.payload);
    console.log('\n data type of payload',typeof(data.payload));
    var sql = "SELECT * FROM usersinfo WHERE rfidSeriel = '"+data.payload+"'";
    con.query(sql,function(err,result){
        console.log('\nprinting result',result);
        if(err){
            console.log("error while first db call");
            callback(405,{status:10, msg:"error while first db call"});
        }
        else if(result.length === 0){
            console.log('result.length = 0 case');
            sql = "INSERT into usersinfo (rfidSeriel, presence, status) VALUES ('"+data.payload+"',0,0)";
            con.query(sql,function(err1,result1){
                if(err1)
                    callback(405,{status:10, msg:"error occurred while inserting values into database"});
                else
                    callback(200,{status:10, msg:"seriel added successfully"});
            });
        }
        else{
            console.log('result.length > 0 case');
            console.log('printing result\n',JSON.stringify(result),'\n');

            sql = "UPDATE usersinfo SET presence = 1, status = 11 WHERE rfidSeriel = '"+data.payload+"' AND status = 1";
            con.query(sql,function(err1,result1){
                if(err1)
                    callback(405,{status : 10, msg:"error occurred while updating presence column"});
                else
                    callback(200,{status: 10, msg:"presence updated successfully"});
            });
        }
    });
};

//handler functions
handlers.visual = function(data,callback){
    console.log("in visual route");
    console.log(data.method, data.queryStringObject);
    var payload = {};
    var arr = [];
    var sql = "";

    if(data.method === 'POST'){
        sql = "SELECT * FROM usersinfo WHERE status = 0";
        con.query(sql,function(err,result){
            if(err)
                callback(405,{status : 0, info:[{msg:"failed to connect to db, visual case"}] });
            else{
                console.log('in visual, method POST, before result length checking,\n');
                console.log(result);
                if(result.length > 0){
                    payload.status = 1;
                    for(var i = 0; i < result.length; i++)
                        arr.push({seriel : result[0].rfidSeriel}) ;
                    payload.info = arr;
                    callback(200, payload);   
                }
                else{
                    sql = "SELECT * FROM usersinfo WHERE status <> 0"
                    con.query(sql,function(err1,result1){
                        if(err1)
                            callback(405,{status : 0, info : [{msg:"error occurred while getting presence details"}] });
                        else{
                            payload.status = 2;
                            for(var i = 0; i < result1.length; i++){
                                arr.push({name:result1[i].name, seriel : result1[i].rfidSeriel, presence: result1[i].presence});
                            }
                            payload.info = arr;
                            callback(200, payload);
                        }
                    });
                }
            }
        });    
    }
    else{
        console.log('got data from form submission',data.queryStringObject.name, parseInt(data.queryStringObject.seriel));
        console.log('\ntypeof name = ',typeof(data.queryStringObject.name));
        if(data.queryStringObject.name === "donotadd"){
            sql = "DELETE FROM usersinfo WHERE rfidSeriel = '"+data.queryStringObject.seriel+"'";
            con.query(sql,function(err1,result1){
                console.log('\n deleting row result = \n')
                console.log(result1);
                if(err1)
                    callback(405,{msg:"error occurred while deleting row"});
                else
                    callback(200,{msg:"row deleted successfully"});
            });
        }
        else{
            sql = "UPDATE usersinfo SET status = 1, name = '"+data.queryStringObject.name+"' WHERE rfidSeriel = '"+data.queryStringObject.seriel+"'";
            con.query(sql,function(err1,result1){
                console.log('\n updating name and seriel, result = \n')
                console.log(result1);
                if(err1)
                    callback(405,{msg:"error occurred while updating name & status column"});
                else
                    callback(200,{msg:"name updated successfully"});
            });
        }
    }        
};

//router
var router = {
    visual : handlers.visual,
    hardware : handlers.hardware
};
