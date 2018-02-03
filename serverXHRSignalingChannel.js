"use strict"

var log = require("./log").log;

//define the needly object
var connections={},partner={},messagesFor={};

//queue to send the require of JSON
function webrtcResponse(response,res){
    res.writeHead(200,{"Conetc-Type":"application/json"});
    res.write(JSON.stringify(response));
    res.end();
}

//send the error JSON response
function webrtcError(err,res){
    log("reply with webrtc Error: "+err);
    webrtcResponse({"err":err},res);

}

/*
name : connect(info){}
description : handle XML Http require to connect by key
*/
function connect(info){
    //define the needly object and function
    var res= info.res,
        query=info.query,
        thisconnection,
        newID=function(){
            return Math.floor(Math.random()*1000000000);
        },
        connectFirstParty = function(){ //the status is new or connect
            if(connections.status=="connected"){  // delete some property of object
                delete partner[thisconnection.ids[0]];
                delete partner[thisconnection.ids[1]];
                delete messagesFor[thisconnection.ids[0]];
                delete messagesFor[thisconnection.ids[1]];
            }
            connections[query.key]={};
            thisconnection=connections[query.key];
            thisconnection.status="waiting";
            thisconnection.ids=[newID()];
            webrtcResponse({"id":thisconnection.ids[0],
                            "status":thisconnection.status},res);
        },
        connectSecondParty=function(){
            thisconnection.ids[1]=newID();
            partner[thisconnection.ids[0]]=thisconnection.ids[1];
            partner[thisconnection.ids[1]]=thisconnection.ids[0];
            messagesFor[thisconnection.ids[0]]=[];
            messagesFor[thisconnection.ids[1]]=[];
            thisconnection.status = "connected";
            webrtcResponse({"id":thisconnection.ids[1],
                            "status":thisconnection.status},res);
        };
    log("request 'connect' have called");
    if(query && query.key){
        var thisconnection = connections[query.key] || 
            {"status":"new"};
        if(thisconnection.status=="waiting"){
            connectSecondParty();
            //log("secondparty");
        }else{  //the status = new or connect
            connectFirstParty();
            //log("fristParty");
            return;
            //log("the status is "+thisconnection.status);
        }
        //log("get connect key: "+query.key);
    }else{
        webrtcError("No recognizable query key",res);
    }
}
exports.connect=connect;

/*
name : sendMessage()
decription : sendMessage 
*/
function sendMessage(info){
    log("postData received is ***"+info.postData +"***");
    var postData=JSON.parse(info.postData),
        res=info.res;
    
    if(typeof(postData)==="undefined"){
        webrtcError("No posted data in JSON format!",res);
        return;
    }
    if(typeof(postData.message)==="undefined"){
        webrtcError("No message received",res);
        return;
    }
    if(typeof(postData.id)==="undefined"){
        webrtcError("No id received with message",res);
        return;
    }
    if(typeof(partner[postData.id])==="undefined"){
        webrtcError("Invalid id "+ postData.id,res);
        return;
    }
    if(typeof(messagesFor[partner[postData.id]])==="undefined"){
        webrtcError("Invalid id "+postData.id,res);
        return;
    }
    messagesFor[partner[postData.id]].push(postData.message);
    log("saving message ***"+postData.message+"*** for delivery to id "+partner[postData.id]);
    webrtcResponse("Saving Message ***"+postData.message + 
                    "*** for delivery to id "+ partner[postData.id],res);
}
exports.send=sendMessage;

//return queue obtain message from info.postData.id
function getMessages(info){
    var postData = JSON.parse(info.postData),
        res = info.res;
    
    if(typeof(postData)==="undefined"){
        webrtcError("No posted data in JSON format!",res);
        return;
    }
    if(typeof(postData.id)==="undefined"){
        webrtcError("No id received on get",res);
        return;
    }
    if(typeof(messagesFor[postData.id])==="undefined"){
        webrtcError("Invalid Id "+postData.id,res);
        return;
    }
    log("sending messages ***"+
        JSON.stringify(messagesFor[postData.id])+"*** to id "+
            postData.id);
    webrtcResponse({'msgs':messagesFor[postData.id]},res);

    messagesFor[postData.id]=[];
}

exports.get = getMessages;