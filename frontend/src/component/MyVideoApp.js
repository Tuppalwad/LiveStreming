import React, { useEffect, useRef } from "react";
import io from "socket.io-client";

const MyVideoApp = () => {
  const usersRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const statusRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    const socket = io();

    const getAndUpdateUsers = async () => {
      const response = await fetch("/users", { method: "GET" });
      const jsonResponse = await response.json();

      jsonResponse.forEach((user) => {
        const btn = document.createElement("button");
        const textNode = document.createTextNode(user);

        btn.setAttribute("onClick", () => createCall(user));
        btn.appendChild(textNode);
        usersRef.current.appendChild(btn);
      });
    };

    const createCall = async (to) => {
      statusRef.current.innerText = `Calling ${to}`;

      const localOffer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(
        new RTCSessionDescription(localOffer)
      );

      socket.emit("outgoing:call", { fromOffer: localOffer, to });
    };

    socket.on("user:joined", (id) => {
      const btn = document.createElement("button");
      const textNode = document.createTextNode(id);

      btn.appendChild(textNode);
      btn.setAttribute("onClick", () => createCall(id));
      usersRef.current.appendChild(btn);
    });

    socket.on("incomming:call", async (data) => {
      const { from, offer } = data;

      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answerOffer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(
        new RTCSessionDescription(answerOffer)
      );

      socket.emit("call:accepted", { answer: answerOffer, to: from });
    });

    socket.on("incomming:answer", async (data) => {
      const { offer } = data;
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
    });

    const getUserMedia = async () => {
      try {
        const userMedia = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        localVideoRef.current.srcObject = userMedia;
        localVideoRef.current.play();

        const peer = new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.stunprotocol.org",
            },
          ],
        });

        peerRef.current = peer;

        peer.addTrack(userMedia.getVideoTracks()[0], userMedia);
        peer.addEventListener("track", (event) => {
          remoteVideoRef.current.srcObject = event.streams[0];
        });
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    getUserMedia();

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h3>
        Your Id: <span id="myId"></span>
      </h3>
      <h3>Online Users (click to connect)</h3>
      <div ref={usersRef}></div>
      <video id="local-video" ref={localVideoRef}></video>
      <video id="remote-video" ref={remoteVideoRef}></video>
      <p id="status" ref={statusRef}></p>
    </div>
  );
};

export default MyVideoApp;
