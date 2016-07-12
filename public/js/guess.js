var isMouseDown = false;

var strokes = [];

var ws;
var latestUUID = "";

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
  var pathFields = window.location.pathname.split("/");
  var guestName = pathFields[pathFields.length - 1];
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", "/boards", true); // true for asynchronous
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
      var hash = JSON.parse(xmlHttp.responseText);
      for (var key in hash) {
        if (hash[key] == guestName) {

          console.log("guest room name:", hash);
          var url = "ws://" + window.location.host + "/chanel/" + key;
          console.log(url);
          ws = new WebSocket(url);
          console.log(ws);

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
            }
            }
          }
  };
  xmlHttp.send(null);
  console.log(name);
  var canvas = document.getElementById("painting");
  canvas.width  = 400;
  canvas.height = 300;
};
