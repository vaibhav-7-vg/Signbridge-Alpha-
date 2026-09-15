/* ==========================================
   SIGNBRIDGE AI
   COMMUNICATION MODULE
========================================== */


/* GO BACK */

function goBack() {
  window.history.back();
}


/* HOME */

function goHome() {
  window.location.href = "index.html";
}


/* SIGN RECOGNITION */

function openSignRecognition() {
  window.location.href = "sign-recognition.html";
}


/* LIVE CONVERSATION */

function openLiveConversation() {
  window.location.href = "live-conversation.html";
}


/* LEARN */

function openLearn() {
  window.location.href = "learn-isl.html";
}


/* PROFILE */

function openProfile() {
  window.location.href = "profile.html";
}


/* SPEECH TO TEXT */

function speechToText() {

  alert(
    "Speech-to-Text module will be connected here."
  );

}


/* TEXT TO SPEECH */

function textToSpeech() {

  alert(
    "Text-to-Speech module will be connected here."
  );

}


/* INITIALIZATION */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "Communication module initialized."
    );

  }
);
