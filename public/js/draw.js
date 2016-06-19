var isMouseDown = false;

var strokes = [];

var ws;
var seq = 0;
function touchStart() {
  console.log("start");
}

function mouseDown(event, e2) {
  console.log("mouse down");
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
  console.log(isMouseDown);
  //console.log(event);
}

function mouseUp(event, e2) {
  var canvas = document.getElementById("painting");
  var pos = getPos(canvas, event.clientX, event.clientY);
  console.log(pos);
  console.log(event);
  isMouseDown = false;
  ws.send(JSON.stringify({
    seq: seq,
    action: "draw",
    strokes: strokes,
  }));
  strokes = [];
  seq += 1;
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
  context.strokeStyle = '#000000';
  context.lineWidth = 4;
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
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
}

window.onload = function() {
  console.log("on load");
  var canvas = document.getElementById("painting");
  canvas.addEventListener("mousedown", mouseDown, false);
  canvas.addEventListener("mouseup", mouseUp, false);
  canvas.addEventListener("mousemove", mouseMove, false);
  var url = "ws://" + window.location.host + "/chanel";
  console.log(url);
  ws = new WebSocket(url);
  console.log(ws);

  var button = document.getElementById("clear");
  button.addEventListener("click", clear, false);
  ws.onopen = function() {
    // do nothing
  };
};


console.log("hello");
