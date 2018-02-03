"user strict"

var http = require("http");
var https = require("https");
var url = require("url");
var fs = require("fs");

var log = require("./log").log;
var serveFileDir="";

var options = {
    key: fs.readFileSync('./privatekey.pem'),
    cert: fs.readFileSync('./certificate.pem')
};
//set the static File Directory
function setServeFileDir(p){
    serveFilePath=p;
    //log(p);
}
exports.serveFileDir=setServeFileDir;

//create a start function to route the require Directory
function start(handle,port,indexFile){
    function onRequest(req,res){
        var urlData = url.parse(req.url,true),
            pathname = urlData.pathname,
            info={"res":res,
                  "query":urlData.query,
                  "postData":""};
            /*res.writeHead(200,{"Content-Type":"text/plain"});
            res.write(typeof(urlData.pathname));
            res.end();*/
            //get Post data form request
            req.setEncoding("utf8");
            req.addListener("data",function(postDataChunk){
                info.postData+=postDataChunk;
                log("Request POST data chunk '"+ postDataChunk+"'.");
            });
            req.addListener("end",function(){
                route(handle,pathname,info,indexFile);
            });
        log("Request for "+pathname +" received");

    }
    http.createServer(onRequest).listen(port);
    https.createServer(options,onRequest).listen(8617);
    log("Server started on port");
}

exports.start=start

//define a function to route the url Request
function route(handle,pathname,info,indexFile){

    //get the realy path of require file 
    var filepath = createFilePath(pathname,indexFile);
    //log(filepath);
    fs.stat(filepath,function(err,stats){
        if(!err&&stats.isFile){
            //log("this file is exist");
            serveFile(filepath,info);
        }else{  //if url request a function
            //log("the file isn’t a file(a function)");
            handleCustom(handle,pathname,info);
        }
    });
}

//define the createFilePath function to add the serveFilePath and check the path
function createFilePath(pathname,indexFile){
    var components = pathname.substr(1).split("/");//get a string array
    //log(components);
    var filtered = new Array();
    var temp;
    //log(components.length);
    for(var i=0,len = components.length;i<len;++i){
        temp=components[i];
        if(temp=="..")continue;//but there isn't have the ../
        if(temp=="")continue;
        temp=temp.replace(/~/g,'');
        filtered.push(temp);
        //log(temp);
    }
    if(filtered.length>0){
    return(serveFilePath + "/" + filtered.join("/"));
    }else{
        return(serveFilePath+"/"+indexFile);
    }
}


//serveFile function will open the specified file 
//and send the content to clien after read there file
function serveFile(filepath,info){
    var res = info.res,
        query=info.query;

    fs.open(filepath,'r',function(err,fd){
        if(err){        //if open file err
            log(err.message);
            log("open");
            noHandlerErr(filepath,res);
            retrun;
        }
        var readBuffer = new Buffer(115200);
        fs.read(fd,readBuffer,0,115200,0,
            function(err,readBytes){
                if(err){
                    log(err.message);
                    fs.close(fd);
                    noHandlerErr(filepath,res);
                    return;
                }
              if(readBytes>0){
                  res.writeHead(200,{"Content-Type":contentType(filepath)});
                  //res.write(addQuery(readBuffer.toString('utf8',0,readBytes),query));
                  res.write(addQuery(readBuffer.toString('utf8',0,readBytes),query));
              }
              res.end();//end the response
            });
    });
}

/*
name : addQuery
decription : replace the null script to the query params
*/
function addQuery(str,q){
    if(q){
        return str.replace('<script></script>',
                    '<script>var queryparams = '+
                        JSON.stringify(q)+';</script>');       
    }else{
        return str;
    }
}
//determine the type of the file type
function contentType(filepath){
    var index = filepath.lastIndexOf('.');

    if(index>0){
        switch(filepath.substr(index+1)){
            case "html" : return ("text/html");
            case "js"   : return ("application/javascript");
            case "css"  : return ("text/css");
            case "txt"  : return ("text/plain");
           /* case "ico"  : return ("image/x-icon");
            case "png"  : return ("image/x-png");
            case "jpg"  : return ("image/x-jpg");
            case "gif"  : return ("image/gif");*/
            default     : return ("text/html");
        }
    }
    return ("text/html");
}


/*
//name : handleCustom
//descripton : call a Custom function to response
*/
function handleCustom(handle,pathname,info){
    if(typeof(handle[pathname])=='function'){
        handle[pathname](info);//the Custom method
    }else{
        noHandlerErr(pathname,info.res);
    }
}



//function:noHandlerErr()
//description:if not function for requiring
//this function will send 404 page to client
function noHandlerErr(pathname,res){
    log("No request handle found for "+ pathname);
    res.writeHead(404,{"Content-Type":"text/plain"});
    res.write("404 Page Not Found");
    res.end();
}