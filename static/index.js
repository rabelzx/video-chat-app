var socket = io.connect("http://" + document.domain + ":" + location.port);
var clientId;

socket.on("connect", function () {
  // No need to set clientId here; the server will send the correct ID
});

socket.on("users", function (data) {
  var ul = document.getElementById("users");
  ul.innerHTML = "";
  data.clients.forEach(function (client) {
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(`${client.id} entrou no chat`));
    ul.appendChild(li);
  });
});

//lógica do chat de texto
socket.on("");
socket.on("message", function (data) {
  var ul = document.getElementById("messages");
  var li = document.createElement("li");
  li.appendChild(document.createTextNode(`${data.username}: ${data.message}`));
  ul.appendChild(li);
});

function sendMessage() {
  var messageInput = document.getElementById("message_input");
  var message = messageInput.value;
  if (message.trim() !== "") {
    socket.emit("message", { message: message });
    messageInput.value = "";
  }
}

function changeRoom(channel) {
  var listItems = document.querySelectorAll(".left .text-rooms li");
  listItems.forEach(function (item) {
    item.classList.remove("selected");
  });

  var selectedListItem = document.querySelector(
    `.left .text-rooms li[value="${channel}"]`
  );
  selectedListItem.classList.add("selected");

  var centerVideoElement = document.querySelector('.center-message');
  centerVideoElement.classList.toggle('active', true); 

  var centerVideoElement = document.querySelector('.center-video');
  centerVideoElement.classList.toggle('active', false); 
  
  socket.emit("join_room", { room: channel });
}

//lógica do chat de vídeo
function joinTheme(channel) {
  var listItems = document.querySelectorAll(".left .video-rooms li");
  listItems.forEach(function (item) {
    item.classList.remove("selected");
  });

  var selectedListItem = document.querySelector(
    `.left .video-rooms li[value="${channel}"]`
  );
  selectedListItem.classList.add("selected");

  var centerVideoElement = document.querySelector('.center-message');
  centerVideoElement.classList.toggle('active', false); 

  var centerVideoElement = document.querySelector('.center-video');
  centerVideoElement.classList.toggle('active', true); 

  socket.emit("join", { theme: channel });
}

socket.on("theme_joined", (theme) => {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      const localVideo = document.getElementById("localVideo");
      localVideo.srcObject = stream;

      const peerConnection = new RTCPeerConnection();

      stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

      peerConnection
        .createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() =>
          socket.emit("offer", {
            theme: theme,
            offer: peerConnection.localDescription,
          })
        )
        .catch((error) => console.error(error));

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice_candidate", {
            theme: theme,
            candidate: event.candidate,
          });
        }
      };

      socket.on("offer_received", (data) => {
        const remoteVideo = document.getElementById("remoteVideo");
        peerConnection
          .setRemoteDescription(data.offer)
          .then(() => peerConnection.createAnswer())
          .then((answer) => peerConnection.setLocalDescription(answer))
          .then(() =>
            socket.emit("answer", {
              theme: theme,
              answer: peerConnection.localDescription,
            })
          )
          .catch((error) => console.error(error));
      });

      socket.on("answer_received", (data) => {
        peerConnection
          .setRemoteDescription(data.answer)
          .catch((error) => console.error(error));
      });

      socket.on("ice_candidate_received", (data) => {
        peerConnection
          .addIceCandidate(data.candidate)
          .catch((error) => console.error(error));
      });

      peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById("remoteVideo");
        remoteVideo.srcObject = event.streams[0];
      };
    })
    .catch((error) => console.error(error));
});