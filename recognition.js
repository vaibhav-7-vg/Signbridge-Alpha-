/* =====================================================
   SIGNBRIDGE AI
   TWO-HAND LANDMARK ENGINE
   CORRECT MIRRORED-CAMERA HAND PROCESSING
   ===================================================== */


/* =====================================================
   NAVIGATION
   ===================================================== */

function goBack() {
  window.history.back();
}


function goHome() {
  window.location.href = "index.html";
}


function openCommunication() {
  window.location.href = "communicate.html";
}


function openProfile() {
  window.location.href = "profile.html";
}


/* =====================================================
   GLOBAL VARIABLES
   ===================================================== */

let videoElement = null;
let canvasElement = null;
let canvasCtx = null;

let cameraStream = null;

let hands = null;

let cameraRunning = false;

let processingFrame = false;

let scanAnimationStarted = false;


/*
   TWO-HAND ML INPUT

   Left hand:
   21 landmarks × XYZ
   = 63 values

   Right hand:
   21 landmarks × XYZ
   = 63 values

   Total:
   126 values
*/

const FEATURES_PER_HAND = 63;
const TOTAL_FEATURES = 126;


/*
   Off-screen canvas.

   We use this to create the mirrored
   selfie frame sent to MediaPipe.

   This is important for correct
   handedness classification.
*/

const inputCanvas =
  document.createElement("canvas");

const inputCtx =
  inputCanvas.getContext("2d");


/* =====================================================
   PAGE INITIALIZATION
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    videoElement =
      document.getElementById(
        "cameraVideo"
      );

    canvasElement =
      document.getElementById(
        "landmarkCanvas"
      );

    canvasCtx =
      canvasElement.getContext("2d");


    /*
      Initial UI state.

      Camera MUST remain OFF.
    */

    setInitialState();


    /*
      Initialize MediaPipe,
      but DO NOT start camera.
    */

    initializeMediaPipe();

  }
);


/* =====================================================
   INITIAL UI STATE
   ===================================================== */

function setInitialState() {

  const status =
    document.getElementById(
      "cameraStatus"
    );

  const recognized =
    document.getElementById(
      "recognizedText"
    );

  const confidence =
    document.getElementById(
      "confidenceValue"
    );

  const bar =
    document.getElementById(
      "confidenceBar"
    );

  const message =
    document.getElementById(
      "resultMessage"
    );

  const engine =
    document.getElementById(
      "engineStatus"
    );


  if (status) {
    status.textContent =
      "Camera Off";
  }


  if (recognized) {
    recognized.textContent =
      "Waiting...";
  }


  if (confidence) {
    confidence.textContent =
      "0/2";
  }


  if (bar) {
    bar.style.width =
      "0%";
  }


  if (message) {
    message.textContent =
      'Press "Start Camera" to begin hand detection.';
  }


  if (engine) {
    engine.textContent =
      "Camera not started";
  }


  document
    .getElementById(
      "leftHandStatus"
    )
    .textContent =
    "Not detected";


  document
    .getElementById(
      "rightHandStatus"
    )
    .textContent =
    "Not detected";


  document
    .getElementById(
      "featureCount"
    )
    .textContent =
    "0 / 126";


  /*
    Make sure video/canvas are hidden
    until the user starts the camera.
  */

  if (videoElement) {
    videoElement.style.display =
      "none";
  }


  if (canvasElement) {
    canvasElement.style.display =
      "none";
  }


  const guide =
    document.getElementById(
      "cameraGuide"
    );

  if (guide) {
    guide.style.display =
      "none";
  }


  const scan =
    document.getElementById(
      "scanLine"
    );

  if (scan) {
    scan.style.opacity =
      "0";
  }

}


/* =====================================================
   MEDIAPIPE INITIALIZATION
   ===================================================== */

function initializeMediaPipe() {

  if (
    typeof Hands ===
    "undefined"
  ) {

    console.error(
      "MediaPipe Hands library not loaded."
    );

    updateEngineStatus(
      "MediaPipe failed to load"
    );

    return;

  }


  try {

    hands =
      new Hands({

        locateFile:
          function (file) {

            return (
              "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" +
              file
            );

          }

      });


    /*
      CORE REQUIREMENT:

      Allow TWO hands.
    */

    hands.setOptions({

      maxNumHands: 2,

      modelComplexity: 1,

      minDetectionConfidence: 0.70,

      minTrackingConfidence: 0.70

    });


    hands.onResults(
      processHandResults
    );


    console.log(
      "SignBridge AI: Two-hand MediaPipe initialized."
    );


    updateEngineStatus(
      "Two-hand detector ready"
    );

  }

  catch (error) {

    console.error(
      "MediaPipe initialization error:",
      error
    );

    updateEngineStatus(
      "MediaPipe initialization failed"
    );

  }

}


/* =====================================================
   START CAMERA
   ===================================================== */

async function startCamera() {

  if (cameraRunning) {
    return;
  }


  if (!hands) {

    alert(
      "The ML hand detector is still loading. Please wait a moment and try again."
    );

    return;

  }


  try {

    cameraStream =
      await navigator.mediaDevices.getUserMedia({

        video: {

          facingMode: {
            ideal: "user"
          },

          width: {
            ideal: 1280
          },

          height: {
            ideal: 720
          },

          frameRate: {
            ideal: 30,
            max: 30
          }

        },

        audio: false

      });


    videoElement.srcObject =
      cameraStream;


    await videoElement.play();


    cameraRunning = true;


    /*
      Show camera.
    */

    videoElement.style.display =
      "block";


    canvasElement.style.display =
      "block";


    /*
      Hide start screen.
    */

    document
      .getElementById(
        "cameraPlaceholder"
      )
      .style.display =
      "none";


    /*
      Show hand guide.
    */

    document
      .getElementById(
        "cameraGuide"
      )
      .style.display =
      "block";


    /*
      Camera status.
    */

    document
      .getElementById(
        "cameraStatus"
      )
      .textContent =
      "Camera Active";


    /*
      Status dot.
    */

    document
      .getElementById(
        "statusDot"
      )
      .style.background =
      "#22c55e";


    /*
      Engine.
    */

    updateEngineStatus(
      "Camera active • Two-hand detection running"
    );


    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "Show your left or right hand inside the guide.";


    resizeCanvases();


    startScanAnimation();


    /*
      Start processing.
    */

    requestAnimationFrame(
      processCameraFrame
    );


    console.log(
      "SignBridge AI: Camera started."
    );

  }

  catch (error) {

    console.error(
      "Camera error:",
      error
    );


    cameraRunning = false;


    document
      .getElementById(
        "cameraStatus"
      )
      .textContent =
      "Camera Error";


    document
      .getElementById(
        "statusDot"
      )
      .style.background =
      "#ef4444";


    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "Camera permission is required.";


    updateEngineStatus(
      "Camera unavailable"
    );


    alert(
      "Please allow camera permission and try again."
    );

  }

}


/* =====================================================
   CAMERA FRAME PROCESSING
   ===================================================== */

async function processCameraFrame() {

  if (!cameraRunning) {
    return;
  }


  /*
    Prevent multiple MediaPipe
    requests from running together.
  */

  if (
    !processingFrame &&
    videoElement.readyState >= 2
  ) {

    processingFrame = true;


    try {

      resizeCanvases();


      const width =
        videoElement.videoWidth;


      const height =
        videoElement.videoHeight;


      if (
        width > 0 &&
        height > 0
      ) {

        /*
          Prepare mirrored selfie frame.

          Original:

          LEFT -------- RIGHT

          becomes:

          RIGHT ------- LEFT

          This is the format expected
          by MediaPipe's handedness model.
        */

        inputCanvas.width =
          width;

        inputCanvas.height =
          height;


        inputCtx.save();


        inputCtx.clearRect(
          0,
          0,
          width,
          height
        );


        inputCtx.translate(
          width,
          0
        );


        inputCtx.scale(
          -1,
          1
        );


        inputCtx.drawImage(
          videoElement,
          0,
          0,
          width,
          height
        );


        inputCtx.restore();


        /*
          Send mirrored frame to MediaPipe.
        */

        await hands.send({
          image: inputCanvas
        });

      }

    }

    catch (error) {

      console.error(
        "Hand processing error:",
        error
      );

    }

    finally {

      processingFrame =
        false;

    }

  }


  requestAnimationFrame(
    processCameraFrame
  );

}


/* =====================================================
   CANVAS SIZE
   ===================================================== */

function resizeCanvases() {

  if (
    !videoElement ||
    videoElement.videoWidth === 0
  ) {
    return;
  }


  const width =
    videoElement.videoWidth;


  const height =
    videoElement.videoHeight;


  canvasElement.width =
    width;


  canvasElement.height =
    height;

}


/* =====================================================
   PROCESS HAND RESULTS
   ===================================================== */

function processHandResults(
  results
) {

  if (!cameraRunning) {
    return;
  }


  resizeCanvases();


  /*
    Clear old landmarks.
  */

  canvasCtx.clearRect(
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );


  const detectedHands =
    results.multiHandLandmarks || [];


  const handedness =
    results.multiHandedness || [];


  const handCount =
    Math.min(
      detectedHands.length,
      2
    );


  /*
    Fixed feature arrays.

    These ALWAYS have the same structure.
  */

  const leftHandFeatures =
    new Array(
      FEATURES_PER_HAND
    ).fill(0);


  const rightHandFeatures =
    new Array(
      FEATURES_PER_HAND
    ).fill(0);


  let leftDetected = false;
  let rightDetected = false;


  /*
    Process every detected hand.
  */

  for (
    let i = 0;
    i < handCount;
    i++
  ) {

    const landmarks =
      detectedHands[i];


    /*
      Because we send a mirrored
      selfie frame to MediaPipe,
      its handedness label is now
      directly usable.

      NO manual swap here.
    */

    const label =
      handedness[i]?.label ||
      "Unknown";


    /*
      Draw landmarks.

      MediaPipe coordinates now
      correspond to the mirrored
      camera preview.
    */

    drawHand(
      landmarks,
      label
    );


    /*
      Extract 63 values.
    */

    const features =
      extractLandmarkFeatures(
        landmarks
      );


    /*
      Store according to
      physical hand.
    */

    if (
      label === "Left" &&
      !leftDetected
    ) {

      for (
        let j = 0;
        j < FEATURES_PER_HAND;
        j++
      ) {

        leftHandFeatures[j] =
          features[j];

      }

      leftDetected =
        true;

    }


    else if (
      label === "Right" &&
      !rightDetected
    ) {

      for (
        let j = 0;
        j < FEATURES_PER_HAND;
        j++
      ) {

        rightHandFeatures[j] =
          features[j];

      }

      rightDetected =
        true;

    }

  }


  /*
    FINAL TWO-HAND VECTOR

    [Left 63]
          +
    [Right 63]

    = 126 values
  */

  const twoHandFeatures =
    leftHandFeatures.concat(
      rightHandFeatures
    );


  /*
    Save the vector.

    This is the exact structure
    we'll later feed into our ML model.
  */

  window.currentTwoHandFeatures =
    twoHandFeatures;


  /*
    Also expose individual hands
    for debugging/training later.
  */

  window.currentLeftHandFeatures =
    leftHandFeatures;


  window.currentRightHandFeatures =
    rightHandFeatures;


  /*
    Update interface.
  */

  updateDetectionUI(
    leftDetected,
    rightDetected,
    twoHandFeatures
  );

}


/* =====================================================
   LANDMARK FEATURE EXTRACTION
   ===================================================== */

function extractLandmarkFeatures(
  landmarks
) {

  const features = [];


  /*
    MediaPipe:

    21 landmarks

    Each:
    X
    Y
    Z

    Total:
    21 × 3 = 63
  */

  for (
    let i = 0;
    i < 21;
    i++
  ) {

    const point =
      landmarks[i];


    features.push(
      Number(point.x)
    );


    features.push(
      Number(point.y)
    );


    features.push(
      Number(point.z)
    );

  }


  return features;

}


/* =====================================================
   DRAW HAND
   ===================================================== */

function drawHand(
  landmarks,
  label
) {

  let pointColor =
    "#38bdf8";


  let lineColor =
    "#7dd3fc";


  /*
    LEFT HAND
    Green

    RIGHT HAND
    Blue
  */

  if (
    label === "Left"
  ) {

    pointColor =
      "#22c55e";


    lineColor =
      "#86efac";

  }


  /*
    Draw skeleton.
  */

  if (
    typeof drawConnectors ===
    "function"
  ) {

    drawConnectors(
      canvasCtx,
      landmarks,
      HAND_CONNECTIONS,
      {
        color: lineColor,
        lineWidth: 3
      }
    );

  }


  /*
    Draw landmark points.
  */

  if (
    typeof drawLandmarks ===
    "function"
  ) {

    drawLandmarks(
      canvasCtx,
      landmarks,
      {
        color: pointColor,
        fillColor: pointColor,
        radius: 4,
        lineWidth: 1
      }
    );

  }

}


/* =====================================================
   UPDATE DETECTION UI
   ===================================================== */

function updateDetectionUI(
  leftDetected,
  rightDetected,
  features
) {

  const handCount =
    (leftDetected ? 1 : 0) +
    (rightDetected ? 1 : 0);


  /*
    LEFT STATUS
  */

  document
    .getElementById(
      "leftHandStatus"
    )
    .textContent =
    leftDetected
      ? "Detected"
      : "Not detected";


  /*
    RIGHT STATUS
  */

  document
    .getElementById(
      "rightHandStatus"
    )
    .textContent =
    rightDetected
      ? "Detected"
      : "Not detected";


  /*
    Count non-zero features.
  */

  let activeFeatures = 0;


  for (
    let i = 0;
    i < features.length;
    i++
  ) {

    if (
      features[i] !== 0
    ) {

      activeFeatures++;

    }

  }


  document
    .getElementById(
      "featureCount"
    )
    .textContent =
    activeFeatures +
    " / " +
    TOTAL_FEATURES;


  /*
    HAND COUNT
  */

  const recognized =
    document.getElementById(
      "recognizedText"
    );


  const confidence =
    document.getElementById(
      "confidenceValue"
    );


  const bar =
    document.getElementById(
      "confidenceBar"
    );


  /*
    No hands.
  */

  if (
    handCount === 0
  ) {

    recognized.textContent =
      "No hands";


    confidence.textContent =
      "0/2";


    bar.style.width =
      "0%";


    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "No hand detected. Place your hand(s) inside the guide.";


    updateEngineStatus(
      "Searching for hands..."
    );


    return;

  }


  /*
    One hand.
  */

  if (
    handCount === 1
  ) {

    recognized.textContent =
      "1 hand detected";


    confidence.textContent =
      "1/2";


    bar.style.width =
      "50%";


    if (
      leftDetected &&
      !rightDetected
    ) {

      document
        .getElementById(
          "resultMessage"
        )
        .textContent =
        "LEFT hand detected correctly.";

    }


    else if (
      rightDetected &&
      !leftDetected
    ) {

      document
        .getElementById(
          "resultMessage"
        )
        .textContent =
        "RIGHT hand detected correctly.";

    }


    updateEngineStatus(
      "One hand • 21 landmarks • 63 features"
    );


    return;

  }


  /*
    BOTH HANDS
  */

  if (
    handCount === 2
  ) {

    recognized.textContent =
      "Two hands detected";


    confidence.textContent =
      "2/2";


    bar.style.width =
      "100%";


    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "LEFT + RIGHT detected. 126-value ML input ready.";


    updateEngineStatus(
      "Two hands • 42 landmarks • 126 features"
    );

  }

}


/* =====================================================
   SCAN ANIMATION
   ===================================================== */

function startScanAnimation() {

  if (scanAnimationStarted) {
    return;
  }


  scanAnimationStarted =
    true;


  const scanLine =
    document.getElementById(
      "scanLine"
    );


  scanLine.style.opacity =
    "1";


  let position = 20;

  let direction = 1;


  function animate() {

    if (!cameraRunning) {

      scanLine.style.opacity =
        "0";

      scanAnimationStarted =
        false;

      return;

    }


    position +=
      direction * 0.7;


    if (
      position >= 80
    ) {

      direction = -1;

    }


    if (
      position <= 20
    ) {

      direction = 1;

    }


    scanLine.style.top =
      position + "%";


    requestAnimationFrame(
      animate
    );

  }


  animate();

}


/* =====================================================
   STOP CAMERA
   ===================================================== */

function stopCamera() {

  cameraRunning =
    false;


  processingFrame =
    false;


  if (
    cameraStream
  ) {

    cameraStream
      .getTracks()
      .forEach(
        function (track) {

          track.stop();

        }
      );

    cameraStream =
      null;

  }


  if (videoElement) {

    videoElement.srcObject =
      null;

    videoElement.style.display =
      "none";

  }


  if (canvasElement) {

    canvasCtx.clearRect(
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    canvasElement.style.display =
      "none";

  }


  const placeholder =
    document.getElementById(
      "cameraPlaceholder"
    );


  if (placeholder) {

    placeholder.style.display =
      "flex";

  }


  const guide =
    document.getElementById(
      "cameraGuide"
    );


  if (guide) {

    guide.style.display =
      "none";

  }


  document
    .getElementById(
      "cameraStatus"
    )
    .textContent =
    "Camera Off";


  document
    .getElementById(
      "statusDot"
    )
    .style.background =
    "#94a3b8";


  document
    .getElementById(
      "recognizedText"
    )
    .textContent =
    "Waiting...";


  document
    .getElementById(
      "confidenceValue"
    )
    .textContent =
    "0/2";


  document
    .getElementById(
      "confidenceBar"
    )
    .style.width =
    "0%";


  document
    .getElementById(
      "leftHandStatus"
    )
    .textContent =
    "Not detected";


  document
    .getElementById(
      "rightHandStatus"
    )
    .textContent =
    "Not detected";


  document
    .getElementById(
      "featureCount"
    )
    .textContent =
    "0 / 126";


  updateEngineStatus(
    "Camera not started"
  );

}

/* =====================================================
   ENGINE STATUS
   ===================================================== */

function updateEngineStatus(
  message
) {

  const element =
    document.getElementById(
      "engineStatus"
    );


  if (element) {

    element.textContent =
      message;

  }

}


/* =====================================================
   PAGE CLEANUP
   ===================================================== */

window.addEventListener(
  "beforeunload",
  function () {

    stopCamera();

  }
);

/* ================================================
