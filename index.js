'user strict'

var server = require("./server");
var log = require("./log").log;
var requestHandlers = require("./serverXHRSignalingChannel");
var port = process.argv[2] || 8640;

//when the require url is domain/ will require index.html
var indexFile="nano.html";


//return 404 error page;
function fourohfour(info){
    var res = info.res;
    log("Request handler fourohfour was called.");
    res.writeHead(404,{"Content-Type":"text/plain"});
    res.write("404 Page Not Found");
    res.end();
}


//define the handle object
var handle={};
handle["/"]=fourohfour;
handle["/connect"]=requestHandlers.connect;
handle["/get"]=requestHandlers.get;
handle["/send"]=requestHandlers.send;

//start server.js 
server.serveFileDir(".");
server.start(handle,port,indexFile);