/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Lib = require('../../lib');

var attributes = require('./attributes');
var contants = require('./constants');

var name = contants.name;
var buttonAttrs = attributes.buttons;


module.exports = function updateMenusDefaults(layoutIn, layoutOut) {
    var contIn = Array.isArray(layoutIn[name]) ? layoutIn[name] : [],
        contOut = layoutOut[name] = [];

    for(var i = 0; i < contIn.length; i++) {
        var menuIn = contIn[i] || {},
            menuOut = {};

        menuDefaults(menuIn, menuOut, layoutOut);
        menuOut._input = menuIn;
        contOut.push(menuOut);
    }
};

function menuDefaults(menuIn, menuOut, layoutOut) {

    function coerce(attr, dflt) {
        return Lib.coerce(menuIn, menuOut, attributes, attr, dflt);
    }

    var buttons = buttonsDefaults(menuIn, menuOut);

    var visible = coerce('visible', buttons.length > 0);
    if(!visible) return;

    coerce('active');

    coerce('x');
    coerce('y');
    Lib.noneOrAll(menuIn, menuOut, ['x', 'y']);

    coerce('xanchor');
    coerce('yanchor');

    Lib.coerceFont(coerce, 'font', layoutOut.font);

    coerce('bgcolor');
    coerce('bordercolor');
    coerce('borderwidth');
}

function buttonsDefaults(menuIn, menuOut) {
    var buttonsIn = menuIn.buttons || [],
        buttonsOut = menuOut.buttons = [];

    var buttonIn, buttonOut;

    function coerce(attr, dflt) {
        return Lib.coerce(buttonIn, buttonOut, buttonAttrs, attr, dflt);
    }

    for(var i = 0; i < buttonsIn.length; i++) {
        buttonIn = buttonsIn[i];
        buttonOut = {};

        // Should we do some validation for 'args' depending on `method`
        // or just let Plotly[method] error out?

        coerce('method');
        coerce('args');
        coerce('label');

        buttonsOut.push(buttonOut);
    }

    return buttonsOut;
}
