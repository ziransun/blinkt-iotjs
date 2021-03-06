/* This work is based on node-blinkt module (https://github.com/irrelon/node-blinkt).
 * Modifications and additions have been made to adapt to IoT.js platform by Samsung. 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var Gpio = require('gpio'),
    gpio = new Gpio(),
    DAT = 23,
    CLK = 24,
    Blinkt;

var gpio_dat; // A reference (handle) to gpio data pin
var gpio_clk; // A reference (handle) to gpioclock pin

Blinkt = function () {};

/**
 * Connects to the GPIO and sets the GPIO pin modes. Must be called
 * before any other commands. All pixels will start off white at
 * full brightness by default.
 */
Blinkt.prototype.setup = function setup () {
	// Set pin mode to output
	gpio_dat = gpio.open({
		pin: DAT,
		direction: gpio.DIRECTION.OUT
	}, function(err) {
		if (err) {
			console.error(err);
		}
	});

	gpio_clk = gpio.open({
		pin: CLK,
		direction: gpio.DIRECTION.OUT
	}, function(err) {
		if (err) {
			console.error(err);
		}
	});

	this._numPixels = 8;
	this._pixels = [];

	// Init pixels
	for (var i = 0; i < this._numPixels; i++) {
		this.setPixel(i, 255, 255, 255, 1.0);
	}
};

/**
 * Sets all pixels to the passed RGB and brightness values.
 * @param {Number} r The pixel red value between 0 and 255.
 * @param {Number} g The pixel green value between 0 and 255.
 * @param {Number} b The pixel blue value between 0 and 255.
 * @param {Number} a The pixel brightness value between 0.0 and 1.0.
 */
Blinkt.prototype.setAllPixels = function setAllPixels (r, g, b, a) {
	for (var i = 0; i < this._numPixels; i++) {
		this.setPixel(i, r, g, b, a);
	}
};

/**
 * Sets the specified pixel to the passed rgb and brightness level.
 * The pixelNum is an integer between 0 and 7 to indicate the pixel
 * to change.
 * @param {Number} pixelNum The pixel to set RGB and brightness for.
 * An integer value between 0 and 7. Zero is the first pixel, 7 is
 * the last one.
 * @param {Number} r The pixel red value between 0 and 255.
 * @param {Number} g The pixel green value between 0 and 255.
 * @param {Number} b The pixel blue value between 0 and 255.
 * @param {Number} a The pixel brightness value between 0.0 and 1.0.
 */
Blinkt.prototype.setPixel = function setPixel (pixelNum, r, g, b, a) {
	if (a === undefined) {
		if (this._pixels[pixelNum]) {
			// Set a to current level or 1.0 if none exists
			a = this._pixels[pixelNum][3] !== undefined ? this._pixels[pixelNum][3] : 1.0;
		}
	} else {
		a = parseInt((31.0 * a), 10) & 0x1F;
	}

	this._pixels[pixelNum] = [
		parseInt(r, 10) & 255, // jshint ignore:line
		parseInt(g, 10) & 255, // jshint ignore:line
		parseInt(b, 10) & 255, // jshint ignore:line
		a
	];
};

/**
 * Sets the brightness of the pixel specified by pixelNum.
 * @param {Number} pixelNum The pixel to set RGB and brightness for.
 * An integer value between 0 and 7. Zero is the first pixel, 7 is
 * the last one.
 * @param {Number} brightness The pixel brightness value between 0.0
 * and 1.0.
 */
Blinkt.prototype.setBrightness = function setBrightness (pixelNum, brightness) {
	this._pixels[pixelNum][3] = parseInt((31.0 * brightness), 10) & 0x1F;
};

/**
 * Clears the pixel buffer.
 * This is the same as setting all pixels to black.
 * You must also call sendUpdate() if you want to turn Blinkt! off.
 */
Blinkt.prototype.clearAll = function clearAll () {
	for (var i = 0; i < this._numPixels; i++) {
		this.setPixel(i, 0, 0, 0);
	}
};

/**
 * Sends the current pixel settings to the Blinkt! device. Once you
 * have set each pixel RGB and brightness, you MUST call this for the
 * pixels to change on the Blinkt! device.
 */
Blinkt.prototype.sendUpdate = function sendUpdate () {
	var i,
		pixel;

    this._latch(); // send a 32 bit latch (on/off) sequence

	for (i = 0; i < this._numPixels; i++) {
		pixel = this._pixels[i];

		// Brightness
		this._writeByte(0xE0 | pixel[3]); // jshint ignore:line
		// Blue
		this._writeByte(pixel[2]);
		// Green
		this._writeByte(pixel[1]);
		// Red
		this._writeByte(pixel[0]);
	}

	this._latch();
};

/**
 * Writes byte data to the GPIO pins.
 * @param {Number} byte The byte value to write.
 * @private
 */
Blinkt.prototype._writeByte = function writeByte (byte) {
	var bit;

	for (var i = 0 ; i < this._numPixels; i++) {
		bit = ((byte & (1 << (7 - i))) > 0) === true ? 1 : 0; // jshint ignore:line

        gpio_dat.write(bit); // physically set your pin high/low
        gpio_clk.write(true); // set your clock high to load your data
        gpio_clk.write(false); // set your clock low to consume your data
    }
};

/**
 * Emit exactly enough clock pulses to latch the small dark die APA102s which are weird.
 * @private
 */
Blinkt.prototype._latch = function latch() {
    gpio_dat.write(false);
    for (var i = 0; i < 36; i++) {
        gpio_clk.write(true);
        gpio_clk.write(false);
    }
};

module.exports = Blinkt;
