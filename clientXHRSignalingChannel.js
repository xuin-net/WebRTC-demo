"use strict"

var createSignalingChannel = function(key, handlers){

    var id , status,doNothing = function(){},
    handlers = handlers || {},
    initHandler = function(h){
        return((typeof h ==='function') && h) || doNothing;
    },
    waitingHandler = initHandler(handlers.onWaiting),
    connectedHandler = initHandler(handlers.onConnected),
    messageHandler = initHandler(handlers.onMessage);
    
    function connect(failureCB){
        //console.log("signaling channel's connetc");
        var failureCB = (typeof failureCB === 'function') ||function (){};

        //handle connect request,the connect status may error or connect and wait
        function handler(){
            if(this.readyState == this.DONE){
                if(this.status == 200 && this.response !=null){
                    var res = JSON.parse(this.response);
                    if(res.err){
                        failureCB("error: " + res.err);
                        return;
                    }

                    //if there isn't error than will save status and the ID
                    //which attach from server 
                    //call poll() to query asynchronous
                    id = res.id;
                    status = res.status;
                    //messageHandler(res);
                    poll();

                    //call user's handle function to handle waiting and connect status
                    if(status === "waiting"){
                        waitingHandler();
                        //console.log("waiting");
                    }else {
                        connectedHandler();
                        //console.log("connect");
                    }
                    return;
                }else{
                    failureCB("Http error: "+this.status);
                    return;
                }
            }
        }//end the function handler

        //open XHR to send the connect request
        var client = new XMLHttpRequest();
        client.onreadystatechange=handler;
        client.open("GET","/connect?key="+key);
        client.send();
    }//end connect function


    //poll to get parner's message
    function poll(){
        var msgs;
        //define a wait Time function
        var pollWaitDelay = (function(){
            var delay=10,counter=1;

            function reset(){
                delay=10;
                counter=1;
            }
            function increase(){
                counter +=1;
                if(counter >20){
                    delay=1000;
                }else if(counter>10){
                    delay=100;
                }
            }//end increase function
            function value(){
                return delay;
            }
            return {reset:reset, increase:increase,value:value};
        }());

        (function getLoop(){
            get(function (response){
                var i ,msgs = (response && response.msgs) || [];
   
                if(response.msgs && (status!=="connected")){
                    status="connected";
                    connectedHandler();
                }
                if(msgs.length>0){
                    pollWaitDelay.reset();
                    //console.log("reset");
                    for(i=0;i<msgs.length;i+=1){
                        handleMessage(msgs[i]);
                    }
                }else{
                    pollWaitDelay.increase();
                }

                setTimeout(getLoop,pollWaitDelay.value());
            });
        }());
    }//end poll();
    //getLoop will call this function
    function get(getResponseHandler){

        //callback function
        function handler(){
            if(this.readyState == this.DONE){
                if(this.status == 200 && this.response !=null){
                    var res = JSON.parse(this.response);
                    //console.log(res.msgs);
                    if(res.err){
                        getResponseHandler(res.err);
                        return;
                    }
                    getResponseHandler(res);
                    return res;
                }else{
                    getResponseHandler("HTTP error: "+this.status);
                    return;
                }
            }
        }

        //open XHR to request message from myID
        var client = new XMLHttpRequest();
        client.onreadystatechange = handler;
        client.open("POST","/get");
        client.send(JSON.stringify({'id':id}));
    }//end get()

    //handle coming message asynchronous
    function handleMessage(msg){
        setTimeout(function(){messageHandler(msg);},0);
    } 

    //send message to peer brower by signaling channel
    function send(msg,responseHandler){
        var responseHandler = responseHandler || function(){};

        //callback function for post request
        function handler(){
            if(this.readyState==this.DONE){
                if(this.status==200 && this.response !=null){
                    var res = JSON.parse(this.response);
                    if(res.err){
                        responseHandler("error: "+res.err);
                        return;
                    }
                    responseHandler(res);
                }else{
                    responseHandler("HTTP error: "+this.status);
                    return;
                }
            }
        }
        var client = new XMLHttpRequest();
        client.onreadystatechange=handler;
        client.open("POST","/send");
        var sendData={"id":id,"message":msg};
        client.send(JSON.stringify(sendData));
    }//end send function

    return{
        connect : connect,
        send : send
    }
};//end define 