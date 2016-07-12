var isMouseDown = false;

var strokes = [];

var ws;
var latestUUID = "";

function touchStart() {
  console.log("start");
}

function touchMove() {
  console.log("move");
}

function touchStop() {
  console.log("stop");
}

function mouseDown(event) {
  console.log("mouse down");
  console.log(strokes);
  console.log(event);
  isMouseDown = true;
}

function mouseMove(event) {
  console.log("mouse move");
  var canvas = document.getElementById("painting");
  var to = getPos(canvas, event.clientX, event.clientY);
  var from = {
    x: to.x - event.movementX,
    y: to.y - event.movementY,
  };
  if (isMouseDown) {
    draw(from, to);
    strokes.push({
      from: from,
      to: to,
    });
  }
}

function mouseUp(event) {
  var canvas = document.getElementById("painting");
  isMouseDown = false;
  ws.send(JSON.stringify({
    baseUUID: latestUUID,
    action: "draw",
    strokes: strokes,
  }));
  console.log(strokes);
  strokes = [];
}

function getPos(canvas, x, y) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor(x - rect.left),
    y: Math.floor(y - rect.top),
  };
}

function draw(from, to) {
  var canvas = document.getElementById("painting");
  var context = canvas.getContext('2d');
  context.save(); // save the default state
  context.strokeStyle = '#000000';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.restore();
}

function clear() {
  console.log("clear");
  var canvas = document.getElementById("painting");
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  seq = 0;
  strokes = [];
  ws.send(JSON.stringify({
    action: "clear",
  }));
  console.log(strokes);
}

window.onload = function() {
  var pathFields = window.location.pathname.split("/");
  var boardName = pathFields[pathFields.length - 1];
  openBoard(boardName);
  console.log(name);
  console.log("on load");
  var canvas = document.getElementById("painting");
  canvas.width  = 400;
  canvas.height = 300;
  canvas.addEventListener("mousedown", mouseDown, false);
  canvas.addEventListener("mouseup", mouseUp, false);
  canvas.addEventListener("mousemove", mouseMove, false);
  canvas.addEventListener("touchmove", touchMove, false);
  canvas.addEventListener("touchstart", touchStart, false);
  canvas.addEventListener("touchstop", touchStop, false);
  var url = "ws://" + window.location.host + "/chanel/" + boardName;
  console.log(url);
  ws = new WebSocket(url);
  console.log(ws);

  var button = document.getElementById("clear");
  button.addEventListener("click", clear, false);
  ws.onopen = function() {
    ws.send(JSON.stringify({
      action: "fetch",
      baseUUID: latestUUID,
    }));
    // do nothing
  };
  ws.onmessage = function(message) {
    console.log(message.data);
    var m = JSON.parse(message.data);
    console.log(m);
    console.log(m.uuid, m.action);
    if (m.action == "draw") {
      console.log("draw");
      for (var j in m.strokes) {
        var s = m.strokes[j];
        console.log(s);
        draw(s.from, s.to);
      }
      seq = m.seq;
      latestUUID = m.uuid;
    }
    if (m.action == "clear") {
      var canvas = document.getElementById("painting");
      var context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      seq = 0;
      strokes = [];
      latestUUID = "";
    }
  };
 window.setInterval(function() {
   console.log("get interval");
   ws.send(JSON.stringify({
     action: "fetch",
     baseUUID: latestUUID,
   }));
 }, 1000);
};

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function openBoard(boardName) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
      var guest = JSON.parse(xmlHttp.responseText).hash;
      console.log("guest room name:", guest);
      var qrImage = document.getElementById("guess-qrcode");
      qrImage.src = "/qrcode/" + guest;
      var link = document.getElementById("guess-link");
      console.log(link);
      link.href="/guess/" + guest;
      console.log(qrImage);
    }
  };
  xmlHttp.open("POST", "/open/" + boardName, true); // true for asynchronous
  xmlHttp.send(null);
}


console.log("hello");
