var isMouseDown = false;

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
  var pos = getPos(canvas, event.clientX, event.clientY);
  var origin = {
    x: pos.x - event.movementX,
    y: pos.y - event.movementY,
  };
  if (isMouseDown) {
    draw(origin, pos);
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

window.onload = function() {
  console.log("on load");
  var canvas = document.getElementById("painting");
  canvas.addEventListener("touchstart", touchStart, false);
  canvas.addEventListener("mouseup", mouseUp, false);
  canvas.addEventListener("mousemove", mouseMove, false);
};

console.log("hello");
