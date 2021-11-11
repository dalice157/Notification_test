
import Janus from './janus';

export function SMS_Plugin() {
  var server = null;
  if (window.location.protocol === 'http:') {
    // server = "http://" + window.location.hostname + ":8088/janus";
    server = "wss://janus.conf.meetecho.com/ws"; //Demo server
  } else {
    server = "https://" + window.location.hostname + ":8089/janus";
  }

  var janus = null;
  var textPlugin = null;
  var callPlugin = null;
  var opaqueId = "SMS_Plugin-" + Janus.randomString(12);
  var myroom = 1234; //Demo room
  if (getQueryStringValue("room") !== "") {
    myroom = parseInt(getQueryStringValue("room"));
  }
  var myusername = null;
  var yourusername = null;
  var myid = null;
  var participants = {};
  var transactions = {};
  var simulcastStarted = false;

  Janus.init({
    debug: "all", callback: function () {
      // Make sure the browser supports WebRTC
      if (!Janus.isWebrtcSupported()) {
        bootbox.alert("No WebRTC support... ");
        return;
      }

      // Create session
      janus = new Janus({
        server: server,
        success: function () {
          //attach textroom plugin
          janus.attach({
            plugin: "janus.plugin.textroom",
            opaqueId: opaqueId,
            success: function (pluginHandle) {
              textPlugin = pluginHandle;
              Janus.log("Plugin attached! (" + textPlugin.getPlugin() + ", id=" + textPlugin.getId() + ")");
              // Setup the DataChannel
              var body = { request: "setup" };
              Janus.debug("Sending message:", body);
              textPlugin.send({ message: body });
            },
            error: function (error) {
              console.error("text-> Error attaching plugin...", error);
              bootbox.alert("Error attaching plugin... " + error);
            },
            iceState: function (state) {
              Janus.log("text-> ICE state changed to " + state);
            },
            mediaState: function (medium, on) {
              Janus.log("text-> Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
            },
            webrtcState: function (on) {
              Janus.log("text-> Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
            },
            onmessage: function (msg, jsep) {
              Janus.debug("text-> Got a message ", msg);
              if (msg["error"]) {
                bootbox.alert(msg["error"]);
              }

              if (jsep) {
                textPlugin.createAnswer(
                  {
                    jsep: jsep,
                    media: {
                      audio: false,
                      video: false,
                      data: true
                    },

                    success: function (jsep) {
                      Janus.debug("text-> Got SDP!", jsep);
                      var body = { request: "ack" };
                      textPlugin.send({ message: body, jsep: jsep });
                    },

                    error: function (error) {
                      Janus.error("text-> WebRTC error:", error);
                      bootbox.alert("WebRTC error... " + error.message);
                    }
                  });
              }
            },
            ondataopen: function (data) {
              Janus.log("text-> The DataChannel is available!", data);
              registerUsername("ket");
            },
            ondata: function (data) {
              Janus.debug("text-> We got data from the DataChannel!", data);

              var json = JSON.parse(data);
              var transaction = json["transaction"];
              if (transactions[transaction]) {
                // Someone was waiting for this
                transactions[transaction](json);
                delete transactions[transaction];
                return;
              }
              var what = json["textroom"];
              var data = { what: what };
              if (what === "message") {
                // Incoming message: public or private?
                var msg = json["text"];
                msg = msg.replace(new RegExp('<', 'g'), '&lt');
                msg = msg.replace(new RegExp('>', 'g'), '&gt');
                var from = json["from"];
                var dateString = getDateString(json["date"]);
                var whisper = json["whisper"];

                data.whisper = whisper;
                data.date = dateString;
                data.from = participants[from];
                data.msg = msg;

              } else if (what === "announcement") {
                // Room announcement
                var msg = json["text"];
                msg = msg.replace(new RegExp('<', 'g'), '&lt');
                msg = msg.replace(new RegExp('>', 'g'), '&gt');
                var dateString = getDateString(json["date"]);

                data.date = dateString;
                data.msg = msg;
              } else if (what === "join") {
                // Somebody joined
                var username = json["username"];
                var display = json["display"];
                participants[username] = display ? display : username;

                data.username = username;
                data.display = display;
              } else if (what === "leave") {
                // Somebody left
                var username = json["username"];
                delete participants[username];

                data.username = username;
              } else if (what === "kicked") {
                // Somebody was kicked
                var username = json["username"];
                var when = new Date();
                delete participants[username];
                if (username === myid) {
                  bootbox.alert("You have been kicked from the room", function () {
                    window.location.reload();
                  });
                }

                data.username = username;
              } else if (what === "destroyed") {
                if (json["room"] !== myroom)
                  return;
                // Room was destroyed, goodbye!
                Janus.warn("text-> The room has been destroyed!");
                bootbox.alert("The room has been destroyed", function () {
                  window.location.reload();
                });
              } else if (what === "success") {
                console.log("text-> send success");

              }
              processDataEvent(data);
            },
            oncleanup: function () {
              Janus.log("text-> ::: Got a cleanup notification :::");
            }
          });

          //attach videocall plugin
          janus.attach({
            plugin: "janus.plugin.videocall",
            opaqueId: opaqueId,
            success: function (pluginHandle) {
              callPlugin = pluginHandle;
              Janus.log("Plugin attached! (" + callPlugin.getPlugin() + ", id=" + callPlugin.getId() + ")");
            },
            error: function (error) {
              Janus.error("call->  -- Error attaching plugin...", error);
              bootbox.alert("  -- Error attaching plugin... " + error);
            },
            consentDialog: function (on) {
              Janus.debug("call-> Consent dialog should be " + (on ? "on" : "off") + " now");
            },
            iceState: function (state) {
              Janus.log("call-> ICE state changed to " + state);
            },
            mediaState: function (medium, on) {
              Janus.log("call-> Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
            },
            webrtcState: function (on) {
              Janus.log("call-> Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
            },
            onmessage: function (msg, jsep) {
              Janus.debug("call-> ::: Got a message :::", msg);
              var result = msg["result"];
              if (result) {
                if (result["list"]) {
                  var list = result["list"];
                  Janus.debug("call-> Got a list of registered peers:", list);
                  for (var mp in list) {
                    Janus.debug("call->  >> [" + list[mp] + "]");
                  }
                } else if (result["event"]) {
                  var event = result["event"];
                  if (event === 'registered') {
                    myusername = result["username"];
                    Janus.log("call-> Successfully registered as " + myusername + "!");
                    // Get a list of available peers, just for fun
                    callPlugin.send({ message: { request: "list" } });
                    onRegistered();
                  } else if (event === 'calling') {
                    Janus.log("call-> Waiting for the peer to answer...");
                    // TODO Any ringtone?
                    bootbox.alert("Waiting for the peer to answer...");
                    onCalling();
                  } else if (event === 'incomingcall') {
                    Janus.log("call-> Incoming call from " + result["username"] + "!");
                    yourusername = result["username"];
                    // Notify user
                    bootbox.hideAll();

                    //TODO 處理incomingcall event
                    onIncomingCall(yourusername, jsep);
                  } else if (event === 'accepted') {
                    bootbox.hideAll();
                    var peer = result["username"];
                    if (!peer) {
                      Janus.log("Call started!");
                    } else {
                      Janus.log(peer + " accepted the call!");
                      yourusername = peer;
                    }
                    // Video call can start
                    if (jsep)
                      callPlugin.handleRemoteJsep({ jsep: jsep });
                    onAccepted();
                    // setRecord();
                  } else if (event === 'update') {
                    // An 'update' event may be used to provide renegotiation attempts
                    if (jsep) {
                      if (jsep.type === "answer") {
                        callPlugin.handleRemoteJsep({ jsep: jsep });
                      } else {
                        callPlugin.createAnswer(
                          {
                            jsep: jsep,
                            media: {
                              audio: false,
                              video: false,
                              data: true
                            },

                            success: function (jsep) {
                              Janus.debug("call-> Got SDP!", jsep);
                              var body = { request: "set" };
                              callPlugin.send({ message: body, jsep: jsep });
                            },

                            error: function (error) {
                              Janus.error("call-> WebRTC error:", error);
                              bootbox.alert("WebRTC error... " + error.message);
                            }
                          });
                      }
                    }
                  } else if (event === 'hangup') {
                    Janus.log("call-> Call hung up by " + result["username"] + " (" + result["reason"] + ")!");
                    // Reset status
                    bootbox.hideAll();
                    callPlugin.hangup();
                    onHangup();
                  } else if (event === "simulcast") {
                    // Is simulcast in place?
                    var substream = result["substream"];
                    var temporal = result["temporal"];
                    if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
                      if (!simulcastStarted) {
                        simulcastStarted = true;
                        addSimulcastButtons(result["videocodec"] === "vp8");
                      }
                      // We just received notice that there's been a switch, update the buttons
                      updateSimulcastButtons(substream, temporal);
                    }
                  } else if (event === "set") {
                    Janus.log("call-> setRecord OK!");
                  }
                }
              } else {
                // FIXME Error?
                var error = msg["error"];
                bootbox.alert(error);
                if (error.indexOf("already taken") > 0) {
                  // FIXME Use status codes...
                }
                // TODO Reset status
                callPlugin.hangup();
                onHangup();
              }
            },
            onlocalstream: function (stream) {
              Janus.debug("call-> ::: Got a local stream :::", stream);
            },
            onremotestream: function (stream) {
              Janus.debug("call-> ::: Got a remote stream :::", stream);
            },
            ondataopen: function (data) {
              Janus.log("call-> The DataChannel is available!");
            },
            ondata: function (data) {
              Janus.debug("call-> We got data from the DataChannel!", data);
            },
            oncleanup: function () {
              Janus.log("call-> ::: Got a cleanup notification :::");
              onHangup();
              yourusername = null;
              simulcastStarted = false;
            }
          });
        },

        error: function (error) {
          Janus.error(error);
          bootbox.alert(error, function () {
            window.location.reload();
          });
        },

        destroyed: function () {
          window.location.reload();
        }
      });
    }
  });

  registerUsername = function (username) {

    if (username === "") { return; }

    myid = randomString(12);
    var transaction = randomString(12);
    var register = {
      textroom: "join",
      transaction: transaction,
      room: myroom,
      username: myid,
      display: username
    };

    myusername = username;
    transactions[transaction] = function (response) {
      if (response["textroom"] === "error") {
        // Something went wrong
        if (response["error_code"] === 417) {
          // This is a "no such room" error: give a more meaningful description
          bootbox.alert(
            "No such room : <code>" + myroom + "</code>"
          );
        } else {
          bootbox.alert(response["error"]);
        }
        return;
      }

      //registration
      let register = { request: "register", username: username };
      callPlugin.send({ message: register });

      // Any participants already in?
      console.log("Participants:", response.participants);
      if (response.participants && response.participants.length > 0) {
        for (var i in response.participants) {
          var p = response.participants[i];
          participants[p.username] = p.display ? p.display : p.username;
        }
        //TODO do something
      }
    };

    textPlugin.data({
      text: JSON.stringify(register),
      error: function (reason) {
        bootbox.alert(reason);
        //TODO do something
      }
    });
  };

  setRecord = function () {
    let msg = {
      request: "set",
      auido: false,
      video: false,
      record: true,
      filename: "opt/janus/share/janus/demos/record/rec-" + myusername + "-" + new Date().getTime()
    };
    callPlugin.send({ message: msg });
  };

  //結束Janus
  SMS_Plugin.prototype.stopJanus = function () {
    janus.destroy();
  };

  //發送私人訊息
  SMS_Plugin.prototype.sendPrivateMsg = function (username, msg) {
    console.log("sendPrivateMsg-> " + username);
    var display = participants[username];
    if (!display)
      return;

    if (msg === "") {
      bootbox.alert('Insert a message to send on the DataChannel');
      return;
    }
    var message = {
      textroom: "message",
      transaction: randomString(12),
      room: myroom,
      to: username,
      text: msg
    };
    textPlugin.data({
      text: JSON.stringify(message),
      error: function (reason) {
        bootbox.alert(reason);
      },
      success: function () {
        let data = {
          what: "send",
          display: display,
          text: msg
        };
        processDataEvent(data);
      }
    });
    return;
  };

  //發送公開訊息
  SMS_Plugin.prototype.sendData = function (data) {
    if (data === "") {
      bootbox.alert('Insert a message to send on the DataChannel');
      return;
    }
    var message = {
      textroom: "message",
      transaction: randomString(12),
      room: myroom,
      text: data,
    };

    textPlugin.data({
      text: JSON.stringify(message),
      error: function (reason) {
        bootbox.alert(reason);
      },
      success: function () {
        let data = {
          what: "send",
          text: data
        };
        processDataEvent(data);
      }
    });
  };

  //撥打電話
  SMS_Plugin.prototype.doCall = function (display) {
    // Call someone
    if (/[^a-zA-Z0-9]/.test(display)) {
      bootbox.alert('Input is not alphanumeric');
      return;
    }
    // Call this user
    callPlugin.createOffer(
      {
        media: {
          video: false,
          audio: false,
          data: true
        },

        success: function (jsep) {
          Janus.debug("videocall Got SDP!", jsep);
          let body = { request: "call", username: display };
          callPlugin.send({ message: body, jsep: jsep });
        },

        error: function (error) {
          Janus.error("videocall createOffer WebRTC error...", error);
          bootbox.alert("createOffer WebRTC error... " + error.message);
          //TODO do something
        }
      });
  };

  //掛斷電話
  SMS_Plugin.prototype.doHangup = function () {
    // Hangup a call
    let hangup = { request: "hangup" };
    callPlugin.send({ message: hangup });
    callPlugin.hangup();
    yourusername = null;
  };

  //接收來電
  SMS_Plugin.prototype.answerCall = function (jsep) {
    callPlugin.createAnswer(
      {
        jsep: jsep,
        media: {
          video: false,
          audio: false,
          data: true
        },

        success: function (jsep) {
          Janus.debug("videocall Got SDP!", jsep);
          var body = { request: "accept" };
          callPlugin.send({ message: body, jsep: jsep });
          // setRecord();
        },

        error: function (error) {
          Janus.error("videocall WebRTC error:", error);
          bootbox.alert("WebRTC error... " + error.message);
        }
      });
  };

  //查詢房間列表
  SMS_Plugin.prototype.queryRoomList = function () {
    let msg = { request: "list" };
    textPlugin.send({ message: msg });
  };

  //建立房間
  SMS_Plugin.prototype.createRoom = function () {
    let msg = {
      request: "create",
      description: "SMS ROOM",
      prmanent: true
    };
    textPlugin.send({ message: msg });
  };
}

// Helper to format times
function getDateString(jsonDate) {
  var when = new Date();
  if (jsonDate) {
    when = new Date(Date.parse(jsonDate));
  }
  var dateString =
    ("0" + when.getUTCHours()).slice(-2) + ":" +
    ("0" + when.getUTCMinutes()).slice(-2) + ":" +
    ("0" + when.getUTCSeconds()).slice(-2);
  return dateString;
}

// Just an helper to generate random usernames
function randomString(len, charSet) {
  charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz, randomPoz + 1);
  }
  return randomString;
}

// Helper to parse query string
function getQueryStringValue(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/*textPlugin ondata 接收到的事件處理方法 */

function processDataEvent(data) {
  switch (data.what) {

    //接收到訊息
    case "message":
      //data{whisper,date,from,msg}
      if (data.whisper === true) {
        // Private message
      } else {
        // Public message
      }
      break;

    //房間公告消息
    case "announcement":
      //data{msg,date}
      //TODO do something
      break;

    //有人加入房間
    case "join":
      //data{username,display}
      //TODO do something

      break;

    //有人離開房間
    case "leave":
      //data{username}
      //TODO do something
      break;

    //有人被踢出房間
    case "kicked":
      //data{username}
      //TODO do something
      break;

    //刪除房間
    case "destroyed":
      //TODO do something
      break;

    //發送訊息
    case "send":
      //data{display,text}
      //TODO do something
      break;

    default:
      //TODO do something
      break;
  }
}

/*callPlugin onMessage 接收到的事件處理方法 */

//通訊註冊
function onRegistered() {
  //TODO do something
}

//發起通話
function onCalling() {
  //TODO do something
}

//有電話進來
function onIncomingCall(name, jsep) {
  //TODO do something
  //Use answerCall or doHangup Method
}

//接聽電話
function onAccepted() {
  //TODO do something
}

//掛掉電話
function onHangup() {
  //TODO do something
}