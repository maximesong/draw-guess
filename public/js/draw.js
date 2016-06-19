var isMouseDown = false;

var strokes = [];

var ws;
var seq = 0;
function touchStart() {
  console.log("start");
}

function touchMove() {
  console.log("move");
}

function touchStop() {
  console.log("stop");
}

function mouseDown(event, e2) {
  console.log("mouse down");
  console.log(strokes);
  console.log(event);
  console.log(e2);
  isMouseDown = true;
  console.log(mouseDown);
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
  //console.log(isMouseDown);
  //console.log(event);
}

function mouseUp(event, e2) {
  var canvas = document.getElementById("painting");
  var pos = getPos(canvas, event.clientX, event.clientY);
  console.log(pos);
  console.log(event);
  isMouseDown = false;
  seq += 1;
  ws.send(JSON.stringify({
    seq: seq,
    action: "draw",
    strokes: strokes,
  }));
  strokes = [];
}

function getPos(canvas, x, y) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: x - rect.left,
    y: y - rect.top,
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
  var url = "ws://" + window.location.host + "/chanel";
  console.log(url);
  ws = new WebSocket(url);
  console.log(ws);

  var button = document.getElementById("clear");
  button.addEventListener("click", clear, false);
  ws.onopen = function() {
    ws.send(JSON.stringify({
      action: "get",
      seq: seq,
    }));
    // do nothing
  };
  ws.onmessage = function(message) {
    var messages = JSON.parse(message.data);
    for (var i in messages) {
      var m = messages[i];
      console.log(m);
      if (m.action == "draw" && m.seq > seq) {
        for (var j in m.strokes) {
          var s = m.strokes[j];
          console.log(s);
          draw(s.from, s.to);
        }
        seq = m.seq;
      }
      if (m.action == "clear" && m.seq > seq) {
        var canvas = document.getElementById("painting");
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        seq = 0;
        strokes = [];
      }
    }
  };
 window.setInterval(function() {
   console.log("get interval");
   ws.send(JSON.stringify({
     action: "get",
     seq: seq,
   }));
 }, 1000);
};


console.log("hello");
