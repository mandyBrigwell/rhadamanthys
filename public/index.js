"use strict";

// Rhadamanthys
// 2022 Mandy Brigwell
// Fonts from Google Fonts, released under open source licenses and usable in any non-commercial or commercial project.

var nameOfPiece = "Rhadamanthys";
var shortNameOfPiece = "Rhadamanthys";

var randomSeedValue = ~~(fxrand() * 12345);
var noiseSeedValue = ~~(fxrand() * 56789);

const randomSign = () => Math.round(Math.random()) * 2 - 1;
const granulate = (value, granularity) =>
  Math.floor(value / (granularity != 0 ? granularity : 1)) *
  (granularity != 0 ? granularity : 1);

// HUD Variables
var instructionText;
var infoTargetAlpha = 0;
var infoAlpha = 0;
var titleTargetAlpha = 0;
var titleAlpha = 360;
var messageAlpha = 360;
var messageString =
  "A generative artwork by Mandy Brigwell\nPress 'I' for information";
var startFrame, endFrame, requiredFrames;
var infoText;

// Graphics buffers, resolution, frames and rendering
var theCanvas,
  renderBuffer,
  saveBuffer,
  gridBuffer,
  circleBuffer,
  graphicsBuffers,
  renderFlags;
var fullRes = 2048;
var firstRenderComplete = false;
var currentlyRendering = false;
var screenSize;
var requiredFrames, renderProgress, renderProgressRemaining;

// These are the graphics layers, in the order they will be rendered
const buffer = {
  background: 0,
  backgroundTexture: 1,
  particles: 2,
  geometry: 3,
  textures: 4,
};

// Testing modes. Controlled with shift-T, shift-S, shift-C, provided TESTINGENABLED is true
var TESTINGENABLED = true;
var TESTMODE = true;
var NOSECTORS = false;
var SAVECANVAS = true;
var SAVESAVEBUFFER = false;
var SHOWTITLE = true;
var RENDERCOUNT = 0;
var RENDERSREQUIRED = 64;

// Geometry overlays
var geometryArray, geometryType;

// Instance values: these affect the whole piece, regardless of what's going on with each layer
// They are generated in the initiate() function before being passed to fxhashfeatures
var instanceBackgroundBrightness,
  instanceBackgroundImageFading,
  instanceBackgroundIsColoured,
  instanceBackgroundTint,
  instanceBackgroundTintSaturation,
  instanceStrokeFadingType,
  instanceIsDiagonal,
  instanceSaturation,
  instanceScale,
  instanceSmallRotation,
  instanceMainRotation,
  instanceIsTilted,
  instanceWrapsAround;
var instanceStrokeFadingTypeDescription = [
  "None",
  "Squared Central",
  "Squared Distal",
  "Linear Central",
  "Linear Distal",
];

// Block values: These affect individual blocks within the instance
var sectorsH,
  sectorsV,
  allowRectanglesToBeSplit,
  allowRectanglesToBeBlank,
  blankRectangleNoiseType,
  allowBlocksToBeReflected,
  allowBlocksToBeCircular,
  allowBlocksToBeRotated,
  allowBlocksToBeScaled,
  allowBlockContentsToBeScaled,
  blockShiftingXAllowed,
  blockShiftingYAllowed,
  rectangleSplitNoiseType,
  blockCircularNoiseType,
  blockContentScalingNoiseType,
  blockScalingNoiseType,
  blockReflectionNoiseType,
  blockRotationNoiseType,
  noiseShiftX,
  noiseShiftY,
  blockRotationRange,
  backgroundTextureStyle,
  backgroundTextureRotationRange;

// Particle variables: These affect the particles that generate the
var particleArray,
  maximumConcurrentParticles = 416,
  noiseScaleValue,
  noiseScaleMultiplier,
  noiseOffsetMultiplier,
  offsetX,
  offsetY,
  maxLife,
  minStroke,
  maxStroke,
  hueStart,
  hueRange,
  particleRenderHueRange,
  convergenceX,
  convergenceY,
  creationOptionForX,
  creationOptionForY,
  granulationFactor,
  dustHueVariance,
  particleDirectionChoice;

// Prepare fonts for preloading
var titleFont;

// Define hash-value-dependent parameters
initiate();

window.$fxhashFeatures = {
  "Stroke granularity":
    granulationFactor < 0.2
      ? "Low"
      : granulationFactor < 0.4
      ? "Normal"
      : granulationFactor < 0.75
      ? "High"
      : "Very high",
  "Stroke fading":
    instanceStrokeFadingTypeDescription[instanceStrokeFadingType],
  "Field rotation": instanceIsDiagonal
    ? "Diagonal"
    : instanceIsTilted
    ? "Slight"
    : "None",
  "Field splitting": allowRectanglesToBeSplit
    ? "Variant " + rectangleSplitNoiseType
    : "None",
  "Field reflection": allowBlocksToBeReflected
    ? "Variant " + blockReflectionNoiseType
    : "None",
  "Circular fields": allowBlocksToBeCircular
    ? "Variant " + blockCircularNoiseType
    : "None",
  "Field rotation": allowBlocksToBeRotated
    ? "Variant " + blockRotationNoiseType
    : "None",
  "Field scaling": allowBlocksToBeScaled
    ? "Variant " + blockScalingNoiseType
    : "None",
  "Field content Scaling": allowBlockContentsToBeScaled
    ? "Variant " + blockContentScalingNoiseType
    : "None",
  "Field shifting": blockShiftingXAllowed
    ? blockShiftingYAllowed
      ? "Both axes"
      : "X-axis"
    : blockShiftingYAllowed
    ? "Y-axis"
    : "None",
};

// The initiate function sets variables for the render, and runs early on so that values can be passed to the window.$fxhashFeatures object.
// Keeping it as a separate function means the whole render can be re-rolled at any time.
// Because it runs before setup(), p5js functions aren't available.
function initiate() {
  noiseScaleValue = 256 + fxrand() * fxrand() * 1024;
  offsetX = fxrand();
  offsetY = fxrand();
  noiseScaleMultiplier =
    fxRandBetween(0.1, 0.5) * fxrand() * fxrand() * fxrand();
  hueStart = fxRandBetween(0, 360);
  hueRange = fxRandBetween(10, 360) * fxrand() * fxrand();
  particleRenderHueRange = ~~(fxRandBetween(0, 90) * fxrand() * fxrand());
  minStroke = fullRes * fxRandBetween(0.001, 0.005);
  maxStroke = fullRes * fxRandBetween(0.005, 0.02);
  convergenceX = fxIntBetween(0, 3);
  convergenceY = fxIntBetween(0, 3);
  creationOptionForX = fxIntBetween(0, 4);
  creationOptionForY = fxIntBetween(0, 5);
  granulationFactor = fxrand() * fxrand() * fxrand();
  if (fxrand < 0.05) {
    granulationFactor += 0.5;
  }
  dustHueVariance = 30 * fxIntBetween(0, 16);
  particleDirectionChoice = fxIntBetween(0, 2);

  if (fxrand() < 0.5) {
    noiseOffsetMultiplier = 0;
  } else if (fxrand() < 0.8) {
    noiseOffsetMultiplier = fxrand() * fxrand();
  } else {
    noiseOffsetMultiplier = 100 * fxrand() * fxrand();
  }

  if (fxrand() < 0.5) {
    maxLife = fxIntBetween(256, 512);
  } else if (fxrand() < 0.5) {
    maxLife = fxIntBetween(128, 256);
  } else {
    maxLife = fxIntBetween(96, 128);
  }
  maxLife += ~~(fxrand() * fxrand() * 512);

  // Instance options affect the whole piece
  instanceBackgroundIsColoured = fxrand() > 0.125;
  instanceBackgroundBrightness = fxrand() * fxrand() * 90;
  instanceBackgroundTint = 360 * fxrand();
  instanceBackgroundTintSaturation = 360 * fxrand() * fxrand() * fxrand();
  instanceStrokeFadingType = fxIntBetween(0, 4);
  instanceIsDiagonal = fxrand() < 0.025;
  instanceIsTilted = fxrand() < 0.25;
  instanceWrapsAround = fxrand() < 0.5;
  instanceSmallRotation = fxrand() * fxrand() * fxrand();
  instanceMainRotation = fxIntBetween(0, 3);

  if (fxrand() < 0.1) {
    instanceScale = 1 + randomSign() * fxrand() * fxrand() * fxrand();
  } else if (instanceIsDiagonal) {
    fxrand() < 0.1 ? (instanceScale = 0.75) : (instanceScale = 1.415);
  } else {
    instanceScale = 1;
  }

  if (fxrand() < 0.9) {
    instanceSaturation = 1 - fxrand() * fxrand() * fxrand() * fxrand();
  } else {
    instanceSaturation = fxrand() < 0.5 ? 0 : 2;
  }
  
  requiredFrames = 480;

  allowRectanglesToBeSplit = fxrand() < 0.75;
  rectangleSplitNoiseType = fxIntBetween(0, 5);

  allowBlocksToBeReflected = fxrand() < 0.5;
  blockReflectionNoiseType = fxIntBetween(0, 5);

  allowBlocksToBeScaled = fxrand() < 0.125;
  blockScalingNoiseType = fxIntBetween(0, 5);

  allowBlockContentsToBeScaled = fxrand() < 0.125;
  blockContentScalingNoiseType = fxIntBetween(0, 5);

  allowBlocksToBeCircular = fxrand() < 0.5;
  blockCircularNoiseType = fxIntBetween(0, 5);

  allowBlocksToBeRotated = fxrand() < 0.5;
  blockRotationNoiseType = fxIntBetween(0, 5);
  if (fxrand() < 0.2) {
    blockRotationRange = fxrand() * fxrand();
  } else {
    blockRotationRange = fxrand() * fxrand() * fxrand();
  }

  allowRectanglesToBeBlank = fxrand() < 0.55;
  blankRectangleNoiseType = fxIntBetween(0, 5);

  blockShiftingXAllowed = fxrand() < 0.5;
  blockShiftingYAllowed = fxrand() < 0.5;
  noiseShiftX = fxRandBetween(1, 32);
  noiseShiftY = fxRandBetween(1, 32);

  backgroundTextureStyle = fxIntBetween(0, 1);
  backgroundTextureRotationRange = fxrand() * fxrand() * fxrand();

  if (fxrand() < 0.9) {
    instanceBackgroundImageFading =
      0.5 + fxRandBetween(-0.25, 0.25) * fxrand() * fxrand();
  } else {
    instanceBackgroundImageFading = 0.85;
    allowRectanglesToBeBlank = false;
  }

  if (fxrand() < 0.1) {
    sectorsH = 1;
    sectorsV = 1;
    allowRectanglesToBeBlank = false;
    allowBlocksToBeRotated = false;
    instanceSmallRotation = 0;
  } else if (fxrand() < 0.025) {
    sectorsH = ~~(fullRes / fxIntBetween(38, 42));
    sectorsV = fxIntBetween(2, 5);
  } else {
    switch (fxIntBetween(0, 8)) {
      case 0:
        sectorsH = fxIntBetween(1, 3);
        sectorsV = fxIntBetween(2, 6);
        break;
      case 1:
        sectorsH = fxIntBetween(1, 6);
        sectorsV = fxIntBetween(1, 6);
        break;
      case 2:
        sectorsH = fxIntBetween(3, 7);
        sectorsV = fxIntBetween(3, 7);
        break;
      case 3:
        sectorsH = fxIntBetween(1, 6);
        sectorsV = fxIntBetween(6, 12);
        break;
      case 4:
        sectorsH = fxIntBetween(1, 2);
        sectorsV = fxIntBetween(4, 16);
        break;
      case 5:
        sectorsH = fxIntBetween(1, 3);
        sectorsV = fxIntBetween(12, 16);
        break;
      case 6:
        sectorsH = fxIntBetween(1, 5);
        sectorsV = sectorsH * 2;
        break;
      case 7:
        sectorsH = fxIntBetween(1, 2);
        sectorsV = fxIntBetween(31, 32);
        allowRectanglesToBeSplit = false;
        break;
      case 8:
        sectorsH = fxIntBetween(1, 8);
        sectorsV = sectorsH;
        break;
    }
  }

  if (sectorsH * sectorsV < 4) {
    allowRectanglesToBeBlank = false;
  }

  if (sectorsH != sectorsV) {
    allowBlocksToBeCircular = false;
  }

  // Geometric overlays
  geometryArray = [];
  geometryType = fxIntBetween(0, 2);
  for (var i = 0; i < 9; i++) {
    if (fxrand() > 0.5) {
      geometryArray.push([
        fxRandBetween(0, 0),
        fxRandBetween(-1, 1),
        randomSign() * (1 - fxrand() * fxrand()),
      ]);
    }
  }

  // Override most of the above for testing
  if (NOSECTORS) {
    sectorsH = 1;
    sectorsV = 1;
    allowRectanglesToBeBlank = false;
    allowBlocksToBeRotated = false;
    allowBlocksToBeReflected = false;
    allowBlocksToBeScaled = false;
    allowRectanglesToBeSplit = false;
    instanceSmallRotation = 0;
    instanceIsDiagonal = false;
    instanceMainRotation = 0;
    instanceIsTilted = false;
    instanceScale = 1;
  }
} // End of initiate function

function preload() {
  titleFont = loadFont("fonts/Splash-Regular.ttf");
}

function setup() {
  pixelDensity(1);
  randomSeed(randomSeedValue);
  noiseSeed(noiseSeedValue);

  screenSize = min(windowWidth, windowHeight);
  theCanvas = createCanvas(screenSize, screenSize);
  colorMode(HSB, 360);
  rectMode(CENTER);
  imageMode(CENTER);

  // Set up
  createGraphicsBuffers();
  createInfo();
  startRender();
}

function createGraphicsBuffers() {
  // Reset arrays
  graphicsBuffers = [];
  renderFlags = [];

  // Render buffer
  renderBuffer = createGraphics(fullRes, fullRes);
  renderBuffer.colorMode(HSB, 360);

  // Save buffer
  saveBuffer = createGraphics(fullRes, fullRes);
  saveBuffer.colorMode(HSB, 360);
  saveBuffer.rectMode(CENTER);
  saveBuffer.imageMode(CENTER);

  // Grid buffer
  // Note that gridBuffer and circleBuffer don't have rectMode or imageMode CENTER so that it's easier to draw a grid
  gridBuffer = createGraphics(fullRes, fullRes);
  gridBuffer.colorMode(HSB, 360);
  circleBuffer = createGraphics(fullRes, fullRes);
  circleBuffer.colorMode(HSB, 360);

  for (var i = 0; i < Object.keys(buffer).length; i++) {
    graphicsBuffers[i] = createGraphics(fullRes, fullRes);
    graphicsBuffers[i].colorMode(HSB, 360);
    graphicsBuffers[i].rectMode(CENTER);
    renderFlags[i] = true;
  }
}

function startRender() {
  // Reset seed
  randomSeed(randomSeedValue);
  noiseSeed(noiseSeedValue);

  // Clear main canvas and render buffer
  theCanvas.clear();
  renderBuffer.clear();

  // Clear all graphics buffers
  for (var eachBuffer of graphicsBuffers) {
    eachBuffer.clear();
  }

  startFrame = frameCount;
  endFrame = startFrame + requiredFrames;
  instructionText = "";
  pushInstructionTexts();

  currentlyRendering = true;
}

function renderLayers(toCanvas, layers) {
  var toCanvasSize = min(toCanvas.width, toCanvas.height);
  for (var eachLayer in layers) {
    var thisLayer = layers[eachLayer];
    toCanvas.image(thisLayer, 0, 0, toCanvasSize, toCanvasSize);
  }
}

function setAllRenderFlags(state) {
  for (var i = 0; i < renderFlags.length; i++) {
    renderFlags[i] = state;
  }
}

function fxRandBetween(from, to) {
  return from + (to - from) * fxrand();
}

function fxIntBetween(from, to) {
  return ~~fxRandBetween(from, to + 1);
}

function displayMessage(message) {
  messageString = message;
  messageAlpha = 360;
}

function draw() {
  // Reset all graphics buffers
  for (var eachBuffer of graphicsBuffers) {
    eachBuffer.resetMatrix();
    eachBuffer.translate(eachBuffer.width * 0.5, eachBuffer.height * 0.5);
    eachBuffer.noFill();
    eachBuffer.noStroke();
    eachBuffer.strokeWeight(8);
  }

  // Manage framecount and rendering process
  var elapsedFrame = frameCount - startFrame;
  renderProgress = min(1, elapsedFrame / requiredFrames);
  renderProgressRemaining = 1 - renderProgress;

  // First frame
  if (elapsedFrame === 1) {
    particleArray = [];
  }

  if (particleArray.length < maximumConcurrentParticles && renderProgress < 1) {
    for (
      var i = 0;
      i <
      min(
        2,
        ~~(
          random(
            map(renderProgress, 0, 1, 16, maximumConcurrentParticles) -
              particleArray.length
          ) * 0.25
        )
      );
      i++
    ) {
      createNewParticle();
    }
  }

  if (particleArray.length > 0) {
    for (var i = 0; i < particleArray.length; i++) {
      particleArray[i].update();
    }
  }

  if (particleArray.length > 0) {
    for (var i = 0; i < particleArray.length; i++) {
      particleArray[i].render();
    }
  }

  if (particleArray.length > 0) {
    for (var i = particleArray.length - 1; i >= 0; i--) {
      if (!particleArray[i].isAlive()) {
        particleArray.splice(i, 1);
      }
    }
  }

  // If we're within the required frames, this loop renders multiple points
  if (elapsedFrame <= requiredFrames) {
    for (var i = 0; i < 64; i++) {
      graphicsBuffers[buffer.backgroundTexture].strokeWeight(
        renderProgressRemaining * 4
      );
      if (instanceBackgroundIsColoured) {
        graphicsBuffers[buffer.backgroundTexture].stroke(
          instanceBackgroundTint,
          instanceBackgroundTintSaturation,
          instanceBackgroundBrightness * 1.25,
          renderProgressRemaining * 30
        );
      } else {
        graphicsBuffers[buffer.backgroundTexture].stroke(
          instanceBackgroundBrightness * 1.25,
          renderProgressRemaining * 30
        );
      }
      switch (backgroundTextureStyle) {
        case 0:
          graphicsBuffers[buffer.backgroundTexture].ellipse(
            random(-0.5, 0.5) * fullRes,
            random(-0.5, 0.5) * fullRes,
            random(-0.25, 0.25) * fullRes
          );
          break;
        case 1:
          var lineRotation = random(
            -backgroundTextureRotationRange,
            backgroundTextureRotationRange
          );
          graphicsBuffers[buffer.backgroundTexture].rotate(lineRotation);
          graphicsBuffers[buffer.backgroundTexture].rect(
            random(-0.5, 0.5) * fullRes,
            random(-0.5, 0.5) * fullRes,
            random(-0.25, 0.25) * fullRes,
            random(-0.25, 0.25) * fullRes
          );
          graphicsBuffers[buffer.backgroundTexture].rotate(-lineRotation);

          break;
      }
    }

    // Geometry
    if (geometryArray.length > 0) {
      for (var j = 0; j < geometryArray.length; j++) {
        var thisGeometry = geometryArray[j];
        graphicsBuffers[buffer.geometry].push();
        graphicsBuffers[buffer.geometry].translate(
          thisGeometry[0] * fullRes,
          0
        );
        graphicsBuffers[buffer.geometry].rotate(thisGeometry[1] * TAU);
        for (var i = 0; i < 512; i++) {
          var pointXPos, pointYPos;
          var randomPoint = random(0, 1);
          graphicsBuffers[buffer.geometry].stroke(
            (hueStart + hueRange * j) % 360,
            360,
            instanceBackgroundBrightness <= 180 ? 330 : 30,
            map(renderProgress, 0, 1, 10, 60)
          );
          graphicsBuffers[buffer.geometry].strokeWeight(
            map(renderProgress, 0, 1, maxStroke / 5, minStroke / 6)
          );
          pointXPos = map(
            randomPoint,
            0,
            1,
            -sqrt(2) * fullRes,
            sqrt(2) * fullRes
          );
          switch (geometryType) {
            case 0: // Straight
              pointYPos =
                map(randomPoint, 0, 1, 0, fullRes * 0.25) +
                fullRes * random() * random() * random();
              break;
            case 1: // Gentle curve
              pointYPos =
                map(
                  sin(randomPoint * 5 * thisGeometry[2]),
                  -1,
                  1,
                  0,
                  fullRes * 0.25
                ) +
                fullRes * random() * random() * random();
              break;
            case 2: // Intense curve
              pointYPos =
                map(
                  cos(randomPoint * 16 * thisGeometry[2]),
                  -1,
                  1,
                  0,
                  fullRes * 0.25
                ) +
                fullRes * random() * random() * random() * random();
              break;
          }
          graphicsBuffers[buffer.geometry].point(pointXPos, pointYPos);
        }
        graphicsBuffers[buffer.geometry].pop();
      }
    }
  } // End elapsedFrame less than required frames loop

  // Create list of layers to render, according to interactive preferences
  var bufferList = [];
  for (var i = 0; i < graphicsBuffers.length; i++) {
    if (renderFlags[i]) {
      bufferList.push(graphicsBuffers[i]);
    }
  }
  renderBuffer.clear();
  renderLayers(renderBuffer, bufferList);

  // Create tiles
  var rectSizeH = fullRes / sectorsH;
  var rectSizeV = fullRes / sectorsV;
  var spacing = max(fullRes * 0.005, min(rectSizeH * 0.02, rectSizeV * 0.02));
  gridBuffer.clear();
  gridBuffer.resetMatrix();
  gridBuffer.translate(spacing, spacing);

  for (var i = 0; i < sectorsH; i++) {
    for (var j = 0; j < sectorsV; j++) {
      // Set up noise values for this square
      var noiseValues = [
        noise(i / 1000 + noiseShiftX, j / 100 + noiseShiftY),
        noise(i / 100 + noiseShiftX, j / 10 + noiseShiftY),
        noise(i + noiseShiftX, j + noiseShiftY),
        noise(j + noiseShiftY, i + noiseShiftX),
        noise(i * 100 + noiseShiftX, j * 10 + noiseShiftY),
        noise(i * 1000 + noiseShiftX, j * 100 + noiseShiftY),
      ];

      // Find the width and height of this tile
      var dWidth = (fullRes - spacing) / sectorsH - spacing;
      var dHeight = (fullRes - spacing) / sectorsV - spacing;
      var iMapped = blockShiftingXAllowed
        ? ~~map(noise(i, j), 0, 1, 0, sectorsH)
        : i;
      var jMapped = blockShiftingYAllowed
        ? ~~map(noise(j, i), 0, 1, 0, sectorsV)
        : j;
      var sX = (iMapped * fullRes) / sectorsH;
      var sY = (jMapped * fullRes) / sectorsV;

      // Move to correct position
      gridBuffer.push();
      gridBuffer.translate(i * (dWidth + spacing), j * (dHeight + spacing));

      // Scale blocks
      if (allowBlocksToBeScaled) {
        gridBuffer.translate((dWidth + spacing) / 2, (dHeight + spacing) / 2);
        gridBuffer.scale(
          map(noiseValues[blockScalingNoiseType], 0, 1, 0.75, 1)
        );
        gridBuffer.translate(-(dWidth + spacing) / 2, -(dHeight + spacing) / 2);
      }

      // Reflect and rotate
      if (allowBlocksToBeReflected) {
        gridBuffer.translate(dWidth / 2, dHeight / 2);
        if (allowBlocksToBeRotated) {
          gridBuffer.scale(0.975);
          gridBuffer.rotate(
            map(
              noiseValues[blockRotationNoiseType],
              0,
              1,
              -blockRotationRange,
              blockRotationRange
            )
          );
        }
        if (sectorsH === sectorsV) {
          gridBuffer.rotate(
            (~~map(noiseValues[blockReflectionNoiseType], 0, 1, 0, 4) * PI) / 2
          );
        } else {
          gridBuffer.rotate(
            noiseValues[blockReflectionNoiseType] < 0.5 ? PI : 0
          );
        }
        gridBuffer.translate(-dWidth / 2, -dHeight / 2);
      }

      // Draw frame and image section
      gridBuffer.noFill();
      gridBuffer.noStroke();

      if (
        allowRectanglesToBeBlank &&
        noiseValues[blankRectangleNoiseType] < 0.3
      ) {
        // This rectangle is blank
        gridBuffer.fill(instanceBackgroundBrightness, 8);
        gridBuffer.rect(0, 0, dWidth, dHeight);
      } else {
        // This rectangle is not blank - should it be split?
        gridBuffer.noFill();
        gridBuffer.noStroke();
        if (
          allowRectanglesToBeSplit &&
          noiseValues[rectangleSplitNoiseType] < 0.4
        ) {
          var split = ~~map(noiseValues[rectangleSplitNoiseType], 0, 1, 2, 8);
          var newWidth = (dWidth + spacing) / split - spacing;
          for (var k = 0; k < split; k++) {
            gridBuffer.rect(0, 0, newWidth, dHeight);
            gridBuffer.image(
              renderBuffer,
              0,
              0,
              newWidth,
              dHeight,
              sX + (fullRes / sectorsH / split) * k,
              sY,
              fullRes / sectorsH / split,
              fullRes / sectorsV
            );
            gridBuffer.translate(newWidth + spacing, 0);
          }
          // Rectangle isn't split, so:
        } else if (
          allowRectanglesToBeSplit &&
          noiseValues[rectangleSplitNoiseType] > 0.65
        ) {
          var split = ~~map(noiseValues[rectangleSplitNoiseType], 0, 1, 2, 8);
          var newHeight = (dHeight + spacing) / split - spacing;
          for (var k = 0; k < split; k++) {
            gridBuffer.rect(0, 0, dWidth, newHeight);
            gridBuffer.image(
              renderBuffer,
              0,
              0,
              dWidth,
              newHeight,
              sX,
              sY + (fullRes / sectorsV / split) * k,
              fullRes / sectorsH,
              fullRes / sectorsV / split
            );
            gridBuffer.translate(0, newHeight + spacing);
          }
          // So this is a solid sector
        } else if (
          dWidth === dHeight &&
          allowBlocksToBeCircular &&
          noiseValues[blockCircularNoiseType] < 0.35
        ) {
          circleBuffer.clear();
          circleBuffer.image(
            renderBuffer,
            0,
            0,
            dWidth,
            dHeight,
            sX,
            sY,
            (fullRes / sectorsH) *
              (allowBlocksToBeScaled
                ? map(noiseValues[blockContentScalingNoiseType], 0, 1, 0.9, 1.1)
                : 1),
            (fullRes / sectorsV) *
              (allowBlocksToBeScaled
                ? map(noiseValues[blockContentScalingNoiseType], 0, 1, 0.9, 1.1)
                : 1)
          );
          circleBuffer.erase();
          circleBuffer.stroke(0);
          circleBuffer.noFill();
          circleBuffer.strokeWeight(fullRes / 2);
          circleBuffer.ellipse(
            0 + dWidth / 2,
            0 + dHeight / 2,
            dWidth + fullRes / 2.1,
            dHeight + fullRes / 2.1
          );
          circleBuffer.noErase();
          gridBuffer.image(circleBuffer, 0, 0, fullRes, fullRes);
          circleBuffer.strokeWeight(9);
        } else {
          gridBuffer.rect(0, 0, dWidth, dHeight);
          gridBuffer.image(
            renderBuffer,
            0,
            0,
            dWidth,
            dHeight,
            sX,
            sY,
            (fullRes / sectorsH) *
              (allowBlocksToBeScaled
                ? map(noiseValues[blockContentScalingNoiseType], 0, 1, 0.9, 1.1)
                : 1),
            (fullRes / sectorsV) *
              (allowBlocksToBeScaled
                ? map(noiseValues[blockContentScalingNoiseType], 0, 1, 0.9, 1.1)
                : 1)
          );
        }
      }

      // Return the grid to its original state
      gridBuffer.pop();
    }
  }

  // Build final image in the saveBuffer
  // Clear and reset everything, then move so (0, 0) is in the centre
  saveBuffer.resetMatrix();
  saveBuffer.clear();
  saveBuffer.translate(fullRes * 0.5, fullRes * 0.5);

  // Create the background, coloured or greyscale background
  if (instanceBackgroundIsColoured) {
    saveBuffer.background(
      instanceBackgroundTint,
      instanceBackgroundTintSaturation,
      instanceBackgroundBrightness
    );
  } else {
    saveBuffer.background(instanceBackgroundBrightness);
  }

  // Add main image to the background and fade the whole background using instanceBackgroundImageFading
  saveBuffer.image(renderBuffer, 0, 0, fullRes, fullRes);
  saveBuffer.fill(
    instanceBackgroundBrightness,
    360 * instanceBackgroundImageFading
  );
  saveBuffer.noStroke();
  saveBuffer.rect(0, 0, fullRes, fullRes);

  // Now the background's complete, scale to the instance
  saveBuffer.scale(instanceScale);
  saveBuffer.rotate(instanceMainRotation * HALF_PI);

  if (instanceIsDiagonal) {
    saveBuffer.rotate(PI / 4);
  } else if (instanceIsTilted) {
    saveBuffer.rotate(instanceSmallRotation);
  }

  // Apply the gridBuffer to the saveBuffer image
  saveBuffer.image(gridBuffer, 0, 0, fullRes, fullRes);

  // If necessary, add a border to the saveBuffer to frame rotated versions
  if (instanceIsDiagonal || instanceIsTilted || allowBlocksToBeRotated) {
    saveBuffer.resetMatrix();
    saveBuffer.translate(fullRes * 0.5, fullRes * 0.5);
    saveBuffer.noFill();
    saveBuffer.strokeWeight(spacing * 2);
    if (instanceBackgroundIsColoured) {
      saveBuffer.stroke(
        instanceBackgroundTint,
        instanceBackgroundTintSaturation * instanceSaturation,
        instanceBackgroundBrightness < 180 ? 30 : 330
      );
    } else {
      saveBuffer.stroke(instanceBackgroundBrightness);
    }
    saveBuffer.rect(0, 0, fullRes, fullRes);
  }

  // Display finished image on canvas
  translate(screenSize * 0.5, screenSize * 0.5);
  image(saveBuffer, 0, 0, screenSize, screenSize);

  // Handle information text visibility
  if (infoAlpha < infoTargetAlpha) {
    infoAlpha += 30;
  } else if (infoAlpha > infoTargetAlpha) {
    infoAlpha -= 30;
  }

  // Render title text
  if (titleAlpha > 0) {
    titleAlpha -= map(elapsedFrame, 0, requiredFrames, 2, 3);
    textSize(screenSize * 0.11);
    textAlign(RIGHT, BOTTOM);
    textFont(titleFont);
    fill(360, titleAlpha);
    stroke(0, titleAlpha);
    strokeWeight(screenSize * 0.005);
    strokeJoin(ROUND);
    text(nameOfPiece, screenSize * 0.45, screenSize * 0.45);
  }

  // Render title overlay
  if (SHOWTITLE) {
    textSize(screenSize * 0.05);
    textAlign(RIGHT, BOTTOM);
    textFont(titleFont);
    fill(360);
    stroke(0);
    strokeWeight(screenSize * 0.005);
    strokeJoin(ROUND);
    text(nameOfPiece, screenSize * 0.45, screenSize * 0.475);
  }

  // Render information text
  if (infoAlpha > 0) {
    textFont("sans-serif");
    textSize(screenSize * 0.015);
    fill(360, infoAlpha);
    stroke(0, infoAlpha);
    strokeWeight(screenSize * 0.005);
    strokeJoin(ROUND);
    textAlign(RIGHT, TOP);
    text(instructionText, screenSize * 0.45, screenSize * -0.45);
    textAlign(LEFT, TOP);
    text(
      infoText +
        "\n\n" +
        (renderProgress < 1
          ? "Rendering progress: " + ~~(renderProgress * 100) + "%"
          : "Render complete") +
        "\n",
      screenSize * -0.45,
      screenSize * -0.45
    );
    textSize(screenSize * 0.025);
  }

  // Render message text
  if (messageAlpha > 0) {
    textFont("sans-serif");
    rectMode(CORNER);
    messageAlpha -=
      map(messageAlpha, 0, 360, 1, 6) *
      (elapsedFrame < requiredFrames ? 1 : 0.25);
    textAlign(LEFT, BOTTOM);
    textSize(screenSize * 0.02);
    strokeWeight(screenSize * 0.005);
    fill(360, messageAlpha);
    stroke(0, messageAlpha);
    text(
      messageString,
      screenSize * -0.45,
      screenSize * 0.45,
      screenSize * 0.9
    );
    rectMode(CENTER);
  }

  // Check if render is complete for fxpreview(), and set related flags;

  // Normally, we check if elapsedFrame === requiredFrames
  // For this piece, however, we'll allow the render to continue for longer
  if (elapsedFrame === requiredFrames * 2 || particleArray.length < 0) {
    if (!firstRenderComplete) {
      fxpreview();
      currentlyRendering = false;
      firstRenderComplete = true;
    }
    if (TESTMODE && RENDERCOUNT <= RENDERSREQUIRED) {
      displayMessage(RENDERCOUNT + " / " + RENDERSREQUIRED);
      RENDERCOUNT += 1;
      if (RENDERCOUNT === RENDERSREQUIRED) {
        TESTMODE = false;
      }
      if (SAVECANVAS) {
        saveCanvas(
          shortNameOfPiece +
            "Canvas" +
            nf(hour(), 2, 0) +
            nf(minute(), 2, 0) +
            nf(second(), 2),
          "png"
        );
      }
      if (SAVESAVEBUFFER) {
        save(
          saveBuffer,
          shortNameOfPiece +
            "FullRes" +
            nf(hour(), 2, 0) +
            nf(minute(), 2, 0) +
            nf(second(), 2),
          "png"
        );
      }
      initiate();
      createGraphicsBuffers();
      createInfo();
      startRender();
    }
  }
}

// ********************************************************************
// Various interaction functions - key presses, clicking, window-sizing
// ********************************************************************

function keyPressed() {
  // Save piece at canvas resolution, with overlays if visible
  if (key === "c") {
    saveCanvas(
      shortNameOfPiece +
        "Canvas" +
        nf(hour(), 2, 0) +
        nf(minute(), 2, 0) +
        nf(second(), 2),
      "png"
    );
    displayMessage("Canvas saved ");
  }

  // Save piece at full resolution without overlays
  if (key === "s") {
    save(
      saveBuffer,
      shortNameOfPiece +
        "FullRes" +
        nf(hour(), 2, 0) +
        nf(minute(), 2, 0) +
        nf(second(), 2) +
        ".png"
    );
    displayMessage("Render saved at " + fullRes + "x" + fullRes);
  }

  if (key === "z") {
    instanceMainRotation += 1;
  }

  if (key === "T" && TESTINGENABLED) {
    TESTMODE = !TESTMODE;
    RENDERCOUNT = 0;
    startRender();
    if (TESTMODE) {
      displayMessage(
        "Test mode activated for " +
          RENDERSREQUIRED +
          " renders." +
          (SAVECANVAS ? " Canvas will be exported." : "") +
          (SAVESAVEBUFFER ? " Save buffer will be exported." : "")
      );
    } else {
      displayMessage("Test mode deactivated");
    }
  }

  if (key === "S" && TESTINGENABLED) {
    SAVESAVEBUFFER = !SAVESAVEBUFFER;
    displayMessage(
      SAVESAVEBUFFER
        ? "Test mode will export save buffer."
        : "Test mode will not export save buffer."
    );
  }

  if (key === "C" && TESTINGENABLED) {
    SAVECANVAS = !SAVECANVAS;
    displayMessage(
      SAVECANVAS
        ? "Test mode will export canvas."
        : "Test mode will not export canvas."
    );
  }

  if (key === "r") {
    createInfo();
    createGraphicsBuffers();
    startRender();
    displayMessage("Re-rendering with same parameters.");
  }

  if (key === "p") {
    displayMessage("Re-rendering with new parameters.");
    initiate();
    createGraphicsBuffers();
    createInfo();
    startRender();
  }

  if (key === "i") {
    if (infoTargetAlpha === 0) {
      infoTargetAlpha = 360;
    } else {
      infoTargetAlpha = 0;
    }
  }

  if (!isNaN(key)) {
    var keyNumber = int(key);
    if (keyNumber > 0 && keyNumber <= graphicsBuffers.length) {
      renderFlags[keyNumber - 1] = !renderFlags[keyNumber - 1];
      displayMessage(
        "Layer " +
          keyNumber +
          " rendering is " +
          (renderFlags[keyNumber - 1] ? "active." : "not active.")
      );
    }
  }
} // End of keyPressed()

function doubleClicked() {
  fullscreen(!fullscreen());
}

function windowResized() {
  if (navigator.userAgent.indexOf("HeadlessChrome") === -1) {
    screenSize = min(windowWidth, windowHeight);
    resizeCanvas(screenSize, screenSize);
  }
}

// ***********************************************************
// The following functions contain data and text-related items
// ***********************************************************

function pushInstructionText(textString, newLines) {
  instructionText += textString;
  instructionText += "\n";
}

function createInfo() {
  infoText = nameOfPiece;
  infoText += "\nA generative artwork by Mandy Brigwell";
  infoText += "\n";
  infoText += "\nGrid size: " + sectorsH + " x " + sectorsV;
  infoText += "\nScale: " + round(instanceScale, 2);
  infoText += "\nNoise Scaling: " + round(noiseScaleValue, 2);
  infoText += "\nNoise multiplier: " + round(noiseScaleMultiplier, 2);
  infoText += "\nNoise offset multiplier: " + round(noiseOffsetMultiplier, 2);
  infoText += "\nParticle granularity: " + round(granulationFactor, 2);
  infoText += "\n";
  infoText +=
    "\nInstance background tint: " +
    (instanceBackgroundIsColoured
      ? hueDescriptor(instanceBackgroundTint)
      : "No");
  infoText += "\nInstance is tilted: " + (instanceIsTilted ? "Yes" : "No");
  infoText += "\nInstance is diagonal: " + (instanceIsDiagonal ? "Yes" : "No");
  infoText +=
    "\nInstance stroke fading: " +
    instanceStrokeFadingTypeDescription[instanceStrokeFadingType];
  infoText +=
    "\nInstance wraps around: " + (instanceWrapsAround ? "Yes" : "No");
  infoText += "\ninstance saturation level: " + round(instanceSaturation, 2);

  infoText +=
    "\nBackground image fading: " + round(instanceBackgroundImageFading, 2);
  infoText += "\n";
  infoText +=
    "\nRectangles can be split: " +
    (allowRectanglesToBeSplit
      ? "Yes, with noise type " + rectangleSplitNoiseType
      : "No");
  infoText +=
    "\nRectangles can be blank: " +
    (allowRectanglesToBeBlank
      ? "Yes, with noise type " + blankRectangleNoiseType
      : "No");
  infoText +=
    "\nRectangles can be replaced with circles: " +
    (allowBlocksToBeCircular
      ? "Yes, with noise type " + blockCircularNoiseType
      : "No");
  infoText +=
    "\nRectangles can be reflected: " +
    (allowBlocksToBeReflected
      ? "Yes, with noise type " + blockReflectionNoiseType
      : "No");
  infoText +=
    "\nRectangles can be scaled: " +
    (allowBlocksToBeScaled
      ? "Yes, with noise type " + blockScalingNoiseType
      : "No");
  infoText +=
    "\nRectangle contents can be scaled: " +
    (allowBlockContentsToBeScaled
      ? "Yes, with noise type " + blockContentScalingNoiseType
      : "No");
  infoText +=
    "\nRectangles can be rotated: " +
    (allowBlocksToBeRotated
      ? "Yes, with noise type " + blockRotationNoiseType
      : "No");
  infoText += "\nRectangle rotation range: " + round(blockRotationRange, 2);
  infoText +=
    "\nRectangles can be shifted: " +
    (blockShiftingXAllowed
      ? blockShiftingYAllowed
        ? "Both x- and y-axis"
        : "X-axis only"
      : blockShiftingYAllowed
      ? "Y-axis only"
      : "No");
  infoText += "\n";
}

function hueDescriptor(hueValue) {
  hueValue = ~~(hueValue / 30) * 30;
  switch (hueValue) {
    case 0:
      return "Red";
      break;
    case 30:
      return "Orange";
      break;
    case 60:
      return "Yellow";
      break;
    case 90:
    case 120:
    case 150:
      return "Green";
      break;
    case 180:
    case 210:
    case 240:
      return "Blue";
      break;
    case 270:
      return "Violet";
      break;
    case 300:
      return "Magenta";
      break;
    case 330:
      return "Red";
      break;
    case 360:
      return "Red";
      break;
  }
  return hueValue;
}

function pushInstructionTexts() {
  pushInstructionText("Show/hide information: [I]");
  pushInstructionText("\nSave " + fullRes + "x" + fullRes + " png: [S]");
  pushInstructionText("Save canvas: [C]");
  pushInstructionText("\nRe-render image: [R]");
  pushInstructionText("Generate new image: [P]");
  pushInstructionText("\nToggle render layers:");
  for (var i = 0; i < Object.keys(buffer).length; i++) {
    var keyName = Object.keys(buffer)[i];
    keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
    pushInstructionText(keyName + ": [" + (i + 1) + "]");
  }
}

function capitalise(string) {
  return string[0].toUpperCase() + string.substring(1);
}

class Particle {
  constructor(xPos, yPos, hueValue, opacityMultiplier, noiseOffset, direction) {
    this.position = createVector(xPos, yPos);
    this.velocity = createVector(0, 0);
    this.hueValue = (hueValue + random(-1, 1) * particleRenderHueRange) % 360;
    this.opacityMultiplier = opacityMultiplier;
    this.noiseOffset = noiseOffset;
    this.life = ~~(maxLife * random(0.5, 0.9));
    this.startLife = this.life;
    this.centre = p5.Vector.normalize(new p5.Vector(xPos, yPos)).mult(-1);
    this.direction = direction;
  }

  update() {
    var angle =
      noise(
        this.noiseOffset +
          offsetX +
          (this.position.x / noiseScaleValue) * noiseScaleMultiplier,
        this.noiseOffset +
          offsetY +
          (this.position.y / noiseScaleValue) * noiseScaleMultiplier
      ) *
      TAU *
      noiseScaleMultiplier *
      noiseScaleValue;

    // Add the velocity, according to the flowfield noise value
    this.velocity = p5.Vector.fromAngle(angle);
    this.velocity.mult(this.direction);
    this.velocity.mult(map(this.life, this.startLife, 0, 4, 1));
    this.position.add(this.velocity);
    this.centre.mult(renderProgressRemaining);
    this.position.add(this.centre);
    this.life -= 1;

    // Wrap around
    if (instanceWrapsAround) {
      this.position.x = ((this.position.x + fullRes) % fullRes) - fullRes * 0.5;
      this.position.y = ((this.position.y + fullRes) % fullRes) - fullRes * 0.5;
    }
  }

  render() {
    // Increase strokeWeight to half-way through particle life, then decrease
    if (this.life > this.startLife / 2) {
      graphicsBuffers[buffer.particles].strokeWeight(
        random() + map(this.life, this.startLife, 0, minStroke, maxStroke)
      );
    } else {
      graphicsBuffers[buffer.particles].strokeWeight(
        random() * random() +
          map(this.life, this.startLife, 0, maxStroke, minStroke)
      );
    }

    // Stroke fading applies to all particles
    var strokeDist = 1;
    switch (instanceStrokeFadingType) {
      case 0: // No change
        break;
      case 1: // Squared fade from centre
        strokeDist = map(
          dist(this.position.x, this.position.y, 0, 0) *
            dist(this.position.x, this.position.y, 0, 0),
          0,
          fullRes * fullRes * 0.75,
          0,
          1
        );
        break;
      case 2: // Squared fade to centre
        strokeDist = map(
          dist(this.position.x, this.position.y, 0, 0) *
            dist(this.position.x, this.position.y, 0, 0),
          0,
          fullRes * fullRes * 0.25,
          1,
          0
        );
        break;
      case 3: // y=x fade from centre
        strokeDist = map(
          dist(this.position.x, this.position.y, 0, 0),
          0,
          fullRes * sqrt(2),
          0,
          1
        );
        break;
      case 4: // y=x fade from centre
        strokeDist = map(
          dist(this.position.x, this.position.y, 0, 0),
          0,
          fullRes * 0.7,
          1,
          0
        );
        break;
    }

    // Particle stroke is altered according to the life of the particle
    graphicsBuffers[buffer.particles].stroke(
      this.hueValue + random(-4, 4),
      360 + random(-4, 4),
      map(this.life, this.startLife, 0, 340, 320),
      360 * this.opacityMultiplier * strokeDist
    );

    // And a point is plotted using the granulationFactor to disperse and constrain
    graphicsBuffers[buffer.particles].point(
      granulate(
        this.position.x,
        random((this.startLife - this.life) * granulationFactor)
      ),
      granulate(
        this.position.y,
        random((this.startLife - this.life) * granulationFactor)
      )
    );

    // Darker texturing is added as rendering progresses
    graphicsBuffers[buffer.textures].strokeWeight(
      random() *
        random() *
        random() *
        map(this.life, this.startLife, 0, minStroke, maxStroke)
    );
    graphicsBuffers[buffer.textures].stroke(
      0,
      map(this.life, this.startLife, 0, 0, 60)
    );
    for (var k = 0; k < 8; k++) {
      graphicsBuffers[buffer.textures].point(
        this.position.x +
          this.position.x *
            random(-0.05, 0.05) *
            random() *
            random() *
            map(this.life, this.startLife, 0, minStroke, minStroke * 2),
        this.position.y +
          this.position.y *
            random(-0.05, 0.05) *
            random() *
            random() *
            map(this.life, this.startLife, 0, minStroke, minStroke * 2)
      );
    }

    // Add smaller points to the background texture, with a variance in hue at multiples of 30 degrees
    graphicsBuffers[buffer.backgroundTexture].stroke(
      (dustHueVariance + this.hueValue + random(-4, 4)) % 360,
      360 + random(-4, 4),
      map(this.life, this.startLife, 0, 340, 320),
      300 * this.opacityMultiplier
    );
    graphicsBuffers[buffer.backgroundTexture].strokeWeight(fullRes * 0.00075);
    graphicsBuffers[buffer.backgroundTexture].point(
      map(sin(this.position.x), -1, 1, -fullRes * 0.5, fullRes * 0.5),
      map(cos(this.position.y), -1, 1, -fullRes * 0.5, fullRes * 0.5)
    );
  }

  isAlive() {
    return this.life > 0;
  }
}

function createNewParticle() {
  var randomValueX, randomValueY;
  // Generate xPosition
  switch (random() < 0.5 ? 0 : creationOptionForX) {
    case 0: // Spaced around the centre, no convergence
      randomValueX = random(-1, 1);
      break;
    case 1: // Spaced around the centre, according to the convergence
      randomValueX = random(-1, 1);
      if (convergenceX > 0) {
        for (var j = 0; j < convergenceX; j++) {
          randomValueX *= random();
        }
      }
      break;
    case 2: // Shift towards both edges
      randomValueX = random(0, 1);
      if (convergenceX > 0) {
        for (var j = 0; j < convergenceX; j++) {
          randomValueX *= random();
        }
      }
      randomValueX = randomSign() * (0.6 - randomValueX);
      break;
    case 3: // Shift towards the edge
      randomValueX = random(0, 1);
      if (convergenceX > 0) {
        for (var j = 0; j < convergenceX; j++) {
          randomValueX *= random();
        }
      }
      randomValueX = 0.6 - randomValueX;
      break;
    case 4: // Spaced points
      randomValueX =
        random(-0.1, 0.1) * random() * random() +
        ~~(random(-0.95, 0.95) * 3) / 3;
  }

  // Generate yPosition
  switch (random() < 0.5 ? 0 : creationOptionForY) {
    case 0: // Spaced around the centre, no convergence
      randomValueY = random(-1, 1);
      break;
    case 1: // Spaced around the centre, according to the convergence
      randomValueY = random(-1, 1);
      if (convergenceY > 0) {
        for (var j = 0; j < convergenceY; j++) {
          randomValueY *= random();
        }
      }
      break;
    case 2: // Shift towards both edges
      randomValueY = random(0, 1);
      if (convergenceY > 0) {
        for (var j = 0; j < convergenceX; j++) {
          randomValueY *= random();
        }
      }
      randomValueY = randomSign() * (0.6 - randomValueY);
      break;
    case 3: // Shift towards one edge
      randomValueY = random(0, 0.5);
      if (convergenceY > 0) {
        for (var j = 0; j < convergenceY; j++) {
          randomValueY *= random();
        }
      }
      randomValueY = 0.6 - randomValueY;
      break;
    case 4: // Spaced points
      randomValueY =
        random(-0.1, 0.1) * random() * random() +
        ~~(random(-0.95, 0.95) * 3) / 3;
      break;
    case 5: // Mirroring of X
      randomValueY = randomValueX + random(-0.5, 0.5) * random() * random();
      break;
  }

  var particleDirection;
  switch (particleDirectionChoice) {
    case 0:
      particleDirection = 1;
      break;
    case 1:
      particleDirection = -1;
      break;
    case 2:
      particleDirection = randomSign();
      break;
  }

  particleArray.push(
    new Particle(
      map(randomValueX, -1, 1, -fullRes * 0.5, fullRes * 0.5), // xPosition
      map(randomValueY, -1, 1, -fullRes * 0.5, fullRes * 0.5), // yPosition
      (hueStart + random(hueRange)) % 360, // Hue
      renderProgressRemaining, // Opacity
      renderProgressRemaining * noiseOffsetMultiplier, // Noise offset
      particleDirection
    )
  );
}
