/* =====================================================
   SIGNBRIDGE AI
   TWO-HAND LANDMARK ENGINE
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

let camera = null;

let hands = null;

let cameraRunning = false;


/*
   Fixed two-hand ML representation.

   LEFT HAND:
   21 landmarks × 3 coordinates
   = 63 values

   RIGHT HAND:
   21 landmarks × 3 coordinates
   = 63 values

   TOTAL:
   126 values
*/

const TOTAL_FEATURES = 126;


/* =====================================================
   INITIALIZATION
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "SignBridge AI: Two-Hand ML Engine loading..."
    );


    videoElement =
      document.getElementById("cameraVideo");


    canvasElement =
      document.getElementById("landmarkCanvas");


    canvasCtx =
      canvasElement.getContext("2d");


    initializeMediaPipe();

  }
);


/* =====================================================
   MEDIAPIPE INITIALIZATION
   ===================================================== */

function initializeMediaPipe() {

  try {

    hands = new Hands({

      locateFile: function (file) {

        return (
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" +
          file
        );

      }

    });


    /*
      IMPORTANT:

      maxNumHands = 2

      This is the core two-hand requirement.
    */

    hands.setOptions({

      maxNumHands: 2,

      modelComplexity: 1,

      minDetectionConfidence: 0.65,

      minTrackingConfidence: 0.65

    });


    hands.onResults(
      processHandResults
    );


    console.log(
      "Two-hand MediaPipe engine initialized."
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
      "ML engine initialization failed"
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


  try {

    /*
      Request front camera.
    */

    const stream =
      await navigator.mediaDevices.getUserMedia({

        video: {

          facingMode: "user",

          width: {
            ideal: 1280
          },

          height: {
            ideal: 720
          }

        },

        audio: false

      });


    videoElement.srcObject =
      stream;


    await videoElement.play();


    cameraRunning = true;


    /*
      Hide placeholder.
    */

    document
      .getElementById(
        "cameraPlaceholder"
      )
      .style.display = "none";


    /*
      Show guide.
    */

    document
      .getElementById(
        "cameraGuide"
      )
      .style.display = "block";


    /*
      Show video.
    */

    videoElement.style.display =
      "block";


    /*
      Start canvas.
    */

    resizeCanvas();


    /*
      Camera status.
    */

    document
      .getElementById(
        "cameraStatus"
      )
      .textContent =
      "Camera Active";


    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "Show your hand(s) clearly. Detecting landmarks...";


    updateEngineStatus(
      "Camera active • Detecting two hands"
    );


    /*
      Start frame processing.
    */

    processCameraFrame();


    /*
      Start scan animation.
    */

    startScanAnimation();


    console.log(
      "Camera started successfully."
    );

  }

  catch (error) {

    console.error(
      "Camera error:",
      error
    );


    document
      .getElementById(
        "cameraStatus"
      )
      .textContent =
      "Camera Error";


    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "Camera permission is required.";


    updateEngineStatus(
      "Camera permission denied or unavailable"
    );


    alert(
      "Please allow camera permission and try again."
    );

  }

}


/* =====================================================
   CAMERA FRAME LOOP
   ===================================================== */

async function processCameraFrame() {

  if (!cameraRunning) {

    return;

  }


  if (
    videoElement.readyState >= 2 &&
    hands
  ) {

    try {

      await hands.send({
        image: videoElement
      });

    }

    catch (error) {

      console.error(
        "Frame processing error:",
        error
      );

    }

  }


  requestAnimationFrame(
    processCameraFrame
  );

}


/* =====================================================
   RESIZE CANVAS
   ===================================================== */

function resizeCanvas() {

  if (!videoElement) {

    return;

  }


  const width =
    videoElement.videoWidth ||
    videoElement.clientWidth;


  const height =
    videoElement.videoHeight ||
    videoElement.clientHeight;


  if (
    width === 0 ||
    height === 0
  ) {

    return;

  }


  canvasElement.width =
    width;


  canvasElement.height =
    height;

}


/* =====================================================
   PROCESS MEDIAPIPE RESULTS
   ===================================================== */

function processHandResults(results) {

  resizeCanvas();


  /*
    Clear previous frame.
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


  /*
    Maximum allowed hands = 2.
  */

  const handCount =
    Math.min(
      detectedHands.length,
      2
    );


  updateHandCount(
    handCount
  );


  /*
    Create fixed two-hand storage.

    Every frame starts with:

    left  = 63 zeros
    right = 63 zeros
  */

  const leftHand =
    new Array(63).fill(0);


  const rightHand =
    new Array(63).fill(0);


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


    const label =
      handedness[i]?.label;


    /*
      MediaPipe's front-camera
      handedness can appear mirrored.

      We normalize it here.
    */

    const normalizedLabel =
      normalizeHandLabel(
        label
      );


    /*
      Draw landmarks.
    */

    drawHandLandmarks(
      landmarks,
      normalizedLabel
    );


    /*
      Convert landmarks into
      XYZ feature vector.
    */

    const featureVector =
      extractLandmarkFeatures(
        landmarks
      );


    /*
      Store according to hand.
    */

    if (
      normalizedLabel === "Left"
    ) {

      for (
        let j = 0;
        j < 63;
        j++
      ) {

        leftHand[j] =
          featureVector[j];

      }

    }


    else if (
      normalizedLabel === "Right"
    ) {

      for (
        let j = 0;
        j < 63;
        j++
      ) {

        rightHand[j] =
          featureVector[j];

      }

    }

  }


  /*
    Create the final
    TWO-HAND feature vector.

    [LEFT 63] + [RIGHT 63]

    = 126 values
  */

  const twoHandFeatures =
    leftHand.concat(
      rightHand
    );


  /*
    Count active values.

    This is useful for testing.
  */

  let activeValues = 0;


  for (
    let i = 0;
    i < twoHandFeatures.length;
    i++
  ) {

    if (
      twoHandFeatures[i] !== 0
    ) {

      activeValues++;

    }

  }


  /*
    Update UI.
  */

  updateFeatureCount(
    activeValues,
    handCount
  );


  /*
    IMPORTANT:

    This variable is the actual
    future ML model input.

    We are NOT predicting a sign yet.
  */

  window.currentTwoHandFeatures =
    twoHandFeatures;


  console.log(
    "Two-hand feature vector:",
    twoHandFeatures
  );

}


/* =====================================================
   NORMALIZE HAND LABEL
   ===================================================== */

function normalizeHandLabel(label) {

  if (
    label === "Left"
  ) {

    return "Left";

  }


  if (
    label === "Right"
  ) {

    return "Right";

  }


  return "Unknown";

}


/* =====================================================
   EXTRACT LANDMARK FEATURES
   ===================================================== */

function extractLandmarkFeatures(
  landmarks
) {

  const features = [];


  /*
    21 landmarks.

    Each landmark contains:

    x
    y
    z

    Therefore:

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
      point.x
    );


    features.push(
      point.y
    );


    features.push(
      point.z
    );

  }


  return features;

}


/* =====================================================
   DRAW HAND LANDMARKS
   ===================================================== */

function drawHandLandmarks(
  landmarks,
  handLabel
) {

  /*
    Green = Left
    Blue  = Right
  */

  let pointColor =
    "#22c55e";


  let lineColor =
    "#86efac";


  if (
    handLabel === "Right"
  ) {

    pointColor =
      "#38bdf8";


    lineColor =
      "#7dd3fc";

  }


  /*
    Draw connections.
  */

  drawConnectors(
    canvasCtx,
    landmarks,
    HAND_CONNECTIONS,
    {
      color: lineColor,
      lineWidth: 3
    }
  );


  /*
    Draw points.
  */

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


/* =====================================================
   UPDATE HAND COUNT
   ===================================================== */

function updateHandCount(
  count
) {

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


  if (
    count === 0
  ) {

    recognized.textContent =
      "No hands";


    confidence.textContent =
      "0/2";


    bar.style.width =
      "0%";

    return;

  }


  if (
    count === 1
  ) {

    recognized.textContent =
      "1 hand detected";


    confidence.textContent =
      "1/2";


    bar.style.width =
      "50%";

    return;

  }


  if (
    count === 2
  ) {

    recognized.textContent =
      "Two hands detected";


    confidence.textContent =
      "2/2";


    bar.style.width =
      "100%";

  }

}


/* =====================================================
   UPDATE FEATURE COUNT
   ===================================================== */

function updateFeatureCount(
  activeValues,
  handCount
) {

  document
    .getElementById(
      "featureCount"
    )
    .textContent =
    activeValues +
    " / " +
    TOTAL_FEATURES;


  /*
    Determine whether
    left/right hands are present.
  */

  const features =
    window.currentTwoHandFeatures ||
    [];


  const leftExists =
    features
      .slice(0, 63)
      .some(
        value => value !== 0
      );


  const rightExists =
    features
      .slice(63, 126)
      .some(
        value => value !== 0
      );


  document
    .getElementById(
      "leftHandStatus"
    )
    .textContent =
    leftExists
      ? "Detected"
      : "Not detected";


  document
    .getElementById(
      "rightHandStatus"
    )
    .textContent =
    rightExists
      ? "Detected"
      : "Not detected";


  if (
    handCount === 2
  ) {

    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "Both hands detected. 126-value ML feature vector ready.";

    updateEngineStatus(
      "Two hands • 42 landmarks • 126 features"
    );

  }

  else if (
    handCount === 1
  ) {

    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "One hand detected. Show the second hand when required.";

    updateEngineStatus(
      "One hand detected • Waiting for second hand"
    );

  }

  else {

    document
      .getElementById(
        "resultMessage"
      )
      .textContent =
      "No hand detected. Place your hands inside the guide.";

    updateEngineStatus(
      "Searching for hands..."
    );

  }

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
   SCAN ANIMATION
   ===================================================== */

function startScanAnimation() {

  const scanLine =
    document.getElementById(
      "scanLine"
    );


  scanLine.style.opacity =
    "1";


  let position = 20;

  let direction = 1;


  setInterval(
    function () {

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

    },
    30
  );

}


/* =====================================================
   STOP CAMERA
   ===================================================== */

function stopCamera() {

  if (
    videoElement &&
    videoElement.srcObject
  ) {

    const tracks =
      videoElement
        .srcObject
        .getTracks();


    tracks.forEach(
      function (track) {

        track.stop();

      }
    );


    videoElement.srcObject =
      null;

  }


  cameraRunning =
    false;


  document
    .getElementById(
      "cameraStatus"
    )
    .textContent =
    "Camera Stopped";


  updateEngineStatus(
    "Camera stopped"
  );

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
