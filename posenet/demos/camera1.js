/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as posenet from '@tensorflow-models/posenet';
// import dat from 'dat.gui';
import Stats from 'stats.js';

import { drawBoundingBox, drawKeypoints, drawSkeleton, isMobile, toggleLoadingUI, tryResNetButtonName, tryResNetButtonText, updateTryResNetButtonDatGuiCss } from './demo_util1';

const videoWidth = 2000;
const videoHeight = 800;
const stats = new Stats();

/**********************
 * 전역변수쓴당 몇번 일어나는지 카운터
 * ********************/
var c0 = 0;
var c1 = 0;
var prev_stat = false;
var first = true;



/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const defaultQuantBytes = 2;

const defaultMobileNetMultiplier = isMobile() ? 0.50 : 0.75;
const defaultMobileNetStride = 16;
const defaultMobileNetInputResolution = 513;

const defaultResNetMultiplier = 1.0;
const defaultResNetStride = 32;
const defaultResNetInputResolution = 257;

const guiState = {
  algorithm: 'multi-pose',
  input: {
    architecture: 'ResNet50',
    outputStride: defaultResNetStride,
    inputResolution: defaultResNetInputResolution,
    multiplier: defaultResNetMultiplier,
    quantBytes: defaultQuantBytes
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  multiPoseDetection: {
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
  },
  net: null,
};

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  // const gui = new dat.GUI({width: 300});

  // let architectureController = null;
  // guiState[tryResNetButtonName] = function() {
  //   architectureController.setValue('ResNet50')
  // };
  // gui.add(guiState, tryResNetButtonName).name(tryResNetButtonText);
  // updateTryResNetButtonDatGuiCss();

  // // The single-pose algorithm is faster and simpler but requires only one
  // // person to be in the frame or results will be innaccurate. Multi-pose works
  // // for more than 1 person
  // const algorithmController =
  //     gui.add(guiState, 'algorithm', ['single-pose', 'multi-pose']);

  // // The input parameters have the most effect on accuracy and speed of the
  // // network
  // let input = gui.addFolder('Input');
  // // Architecture: there are a few PoseNet models varying in size and
  // // accuracy. 1.01 is the largest, but will be the slowest. 0.50 is the
  // // fastest, but least accurate.
  // architectureController =
  //     input.add(guiState.input, 'architecture', ['MobileNetV1', 'ResNet50']);
  // guiState.architecture = guiState.input.architecture;
  // // Input resolution:  Internally, this parameter affects the height and width
  // // of the layers in the neural network. The higher the value of the input
  // // resolution the better the accuracy but slower the speed.
  // let inputResolutionController = null;
  // function updateGuiInputResolution(
  //     inputResolution,
  //     inputResolutionArray,
  // ) {
  //   if (inputResolutionController) {
  //     inputResolutionController.remove();
  //   }
  //   guiState.inputResolution = inputResolution;
  //   guiState.input.inputResolution = inputResolution;
  //   inputResolutionController =
  //       input.add(guiState.input, 'inputResolution', inputResolutionArray);
  //   inputResolutionController.onChange(function(inputResolution) {
  //     guiState.changeToInputResolution = inputResolution;
  //   });
  // }

  // // Output stride:  Internally, this parameter affects the height and width of
  // // the layers in the neural network. The lower the value of the output stride
  // // the higher the accuracy but slower the speed, the higher the value the
  // // faster the speed but lower the accuracy.
  // let outputStrideController = null;
  // function updateGuiOutputStride(outputStride, outputStrideArray) {
  //   if (outputStrideController) {
  //     outputStrideController.remove();
  //   }
  //   guiState.outputStride = outputStride;
  //   guiState.input.outputStride = outputStride;
  //   outputStrideController =
  //       input.add(guiState.input, 'outputStride', outputStrideArray);
  //   outputStrideController.onChange(function(outputStride) {
  //     guiState.changeToOutputStride = outputStride;
  //   });
  // }

  // // Multiplier: this parameter affects the number of feature map channels in
  // // the MobileNet. The higher the value, the higher the accuracy but slower the
  // // speed, the lower the value the faster the speed but lower the accuracy.
  // let multiplierController = null;
  // function updateGuiMultiplier(multiplier, multiplierArray) {
  //   if (multiplierController) {
  //     multiplierController.remove();
  //   }
  //   guiState.multiplier = multiplier;
  //   guiState.input.multiplier = multiplier;
  //   multiplierController =
  //       input.add(guiState.input, 'multiplier', multiplierArray);
  //   multiplierController.onChange(function(multiplier) {
  //     guiState.changeToMultiplier = multiplier;
  //   });
  // }

  // // QuantBytes: this parameter affects weight quantization in the ResNet50
  // // model. The available options are 1 byte, 2 bytes, and 4 bytes. The higher
  // // the value, the larger the model size and thus the longer the loading time,
  // // the lower the value, the shorter the loading time but lower the accuracy.
  // let quantBytesController = null;
  // function updateGuiQuantBytes(quantBytes, quantBytesArray) {
  //   if (quantBytesController) {
  //     quantBytesController.remove();
  //   }
  //   guiState.quantBytes = +quantBytes;
  //   guiState.input.quantBytes = +quantBytes;
  //   quantBytesController =
  //       input.add(guiState.input, 'quantBytes', quantBytesArray);
  //   quantBytesController.onChange(function(quantBytes) {
  //     guiState.changeToQuantBytes = +quantBytes;
  //   });
  // }

  // function updateGui() {
  //   if (guiState.input.architecture === 'MobileNetV1') {
  //     updateGuiInputResolution(
  //         defaultMobileNetInputResolution, [257, 353, 449, 513, 801]);
  //     updateGuiOutputStride(defaultMobileNetStride, [8, 16]);
  //     updateGuiMultiplier(defaultMobileNetMultiplier, [0.50, 0.75, 1.0])
  //   } else {  // guiState.input.architecture === "ResNet50"
  //     updateGuiInputResolution(
  //         defaultResNetInputResolution, [257, 353, 449, 513, 801]);
  //     updateGuiOutputStride(defaultResNetStride, [32, 16]);
  //     updateGuiMultiplier(defaultResNetMultiplier, [1.0]);
  //   }
  //   updateGuiQuantBytes(defaultQuantBytes, [1, 2, 4]);
  // }

  // updateGui();
  // input.open();
  // Pose confidence: the overall confidence in the estimation of a person's
  // pose (i.e. a person detected in a frame)
  // Min part confidence: the confidence that a particular estimated keypoint
  // position is accurate (i.e. the elbow's position)
  // let single = gui.addFolder('Single Pose Detection');
  // single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
  // single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);

  // let multi = gui.addFolder('Multi Pose Detection');
  // multi.add(guiState.multiPoseDetection, 'maxPoseDetections')
  //     .min(1)
  //     .max(20)
  //     .step(1);
  // multi.add(guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0);
  // multi.add(guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0);
  // // nms Radius: controls the minimum distance between poses that are returned
  // // defaults to 20, which is probably fine for most use cases
  // multi.add(guiState.multiPoseDetection, 'nmsRadius').min(0.0).max(40.0);
  // multi.open();

  // let output = gui.addFolder('Output');
  // output.add(guiState.output, 'showVideo');
  // output.add(guiState.output, 'showSkeleton');
  // output.add(guiState.output, 'showPoints');
  // output.add(guiState.output, 'showBoundingBox');
  // output.open();


  // architectureController.onChange(function(architecture) {
  //   // if architecture is ResNet50, then show ResNet50 options
  //   updateGui();
  //   guiState.changeToArchitecture = architecture;
  // });

  // algorithmController.onChange(function(value) {
  //   switch (guiState.algorithm) {
  //     case 'single-pose':
  //       multi.close();
  //       single.open();
  //       break;
  //     case 'multi-pose':
  //       single.close();
  //       multi.open();
  //       break;
  //   }
  // });
}

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
  stats.showPanel(0);  // 0: fps, 1: ms, 2: mb, 3+: custom
  document.getElementById('main1').appendChild(stats.dom);
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output1');
  const ctx = canvas.getContext('2d');

  // since images are being fed from a webcam, we want to feed in the
  // original image and then just flip the keypoints' x coordinates. If instead
  // we flip the image, then correcting left-right keypoint pairs requires a
  // permutation on all the keypoints.
  const flipPoseHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.changeToArchitecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
      });
      toggleLoadingUI(false);
      guiState.architecture = guiState.changeToArchitecture;
      guiState.changeToArchitecture = null;
    }

    if (guiState.changeToMultiplier) {
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: +guiState.changeToMultiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.multiplier = +guiState.changeToMultiplier;
      guiState.changeToMultiplier = null;
    }

    if (guiState.changeToOutputStride) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: +guiState.changeToOutputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.outputStride = +guiState.changeToOutputStride;
      guiState.changeToOutputStride = null;
    }

    if (guiState.changeToInputResolution) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: +guiState.changeToInputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.quantBytes
      });
      toggleLoadingUI(false);
      guiState.inputResolution = +guiState.changeToInputResolution;
      guiState.changeToInputResolution = null;
    }

    if (guiState.changeToQuantBytes) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();
      toggleLoadingUI(true);
      guiState.net = await posenet.load({
        architecture: guiState.architecture,
        outputStride: guiState.outputStride,
        inputResolution: guiState.inputResolution,
        multiplier: guiState.multiplier,
        quantBytes: guiState.changeToQuantBytes
      });
      toggleLoadingUI(false);
      guiState.quantBytes = guiState.changeToQuantBytes;
      guiState.changeToQuantBytes = null;
    }

    // Begin monitoring code for frames per second
    stats.begin();

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case 'single-pose':
        const pose = await guiState.net.estimatePoses(video, {
          flipHorizontal: flipPoseHorizontal,
          decodingMethod: 'single-person'
        });
        poses = poses.concat(pose);
        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
      case 'multi-pose':
        let all_poses = await guiState.net.estimatePoses(video, {
          flipHorizontal: flipPoseHorizontal,
          decodingMethod: 'multi-person',
          maxDetections: guiState.multiPoseDetection.maxPoseDetections,
          scoreThreshold: guiState.multiPoseDetection.minPartConfidence,
          nmsRadius: guiState.multiPoseDetection.nmsRadius
        });

        poses = poses.concat(all_poses);
        minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.multiPoseDetection.minPartConfidence;
        break;
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    let countPeople = 0;
    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          countPeople++;
          drawKeypoints(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showSkeleton) {
          drawSkeleton(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showBoundingBox) {
          drawBoundingBox(keypoints, ctx);
        }
      }
    });


    /*===================== Kyuwon code ==================*/


    function reatime_for_two() { // 대전 방 진입할 때 실행

      var player; // 1p일지 2p일지 결정 - 나중에 DB접근시 필요
      var opposite;

      // lock 변수가 1인 상태로
      var choose;
      if (first) {
        first = false;
        firebase.database().ref('battle').child('p1').set(0);
        firebase.database().ref('battle').child('p2').set(0);
        choose = true;
      }

      var player;
      var op_player;
      if (choose == true) {
        player = 'p1';
        op_player = 'p2';
      }
      else {
        player = 'p2';
        op_player = 'p1';
      }

      firebase.database().ref('battle').child(op_player).on('value', function (data) {
        $("#op_point").val(data.val());
      });

      // DB업데이트 해주는 코드임 갖다 쓰샘 ㅋㅋ
      function updatePlayerScore(score) {
        firebase.database().ref('battle').child(player).set(score);
      }

      function updateOppositeScore(score) {
        firebase.database().ref('battle').child(opposite).set(score);
      }


      /* 대전을 실행시키기 위한 각종 코드들 여기 삽입 */

      /*================= new ==================*/
      if (poses[0]) {
        var pose_0 = poses[0];
        var pose_0_score = pose_0.score;
        var pose_0_keypoints = pose_0.keypoints;

        //var pose_1 = poses[1];
        //var pose_1_score = pose_1.score;
        //var pose_1_keypoints = pose_1.keypoints;

        function is_sitDown(keypoints) {
          const std_h = videoHeight / 2;
          var shoulder_h_avg = (keypoints[5].position.y + keypoints[6].position.y) / 2;

          if (std_h > shoulder_h_avg) { // 앉았다
            return true;
          }
          else {
            return false;
          }
        }

        var cur_stat = is_sitDown(pose_0_keypoints);
        if (prev_stat == true && cur_stat == false) {
          c0 += 1;
          updatePlayerScore(c0);
          console.log(c0);
        }
        prev_stat = cur_stat;


        function counter_0_reset() {
          c0 = 0;
          updatePlayerScore(0);
          return;

        }

        /*=====================규원 코드 끝==========================*/

      }
    }
    reatime_for_two();


    /* ======================================== */





    // console.log(countPeople);

    // End monitoring code for frames per second
    stats.end();

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}


/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
export async function bindPage() {
  toggleLoadingUI(true);
  const net = await posenet.load({
    architecture: guiState.input.architecture,
    outputStride: guiState.input.outputStride,
    inputResolution: guiState.input.inputResolution,
    multiplier: guiState.input.multiplier,
    quantBytes: guiState.input.quantBytes
  });
  toggleLoadingUI(false);

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
      'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  setupGui([], net);
  // setupFPS();
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();