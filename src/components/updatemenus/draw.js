/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var d3 = require('d3');

var Plotly = require('../../plotly');
var Plots = require('../../plots/plots');
var Lib = require('../../lib');
var Color = require('../color');
var Drawing = require('../drawing');
var svgTextUtils = require('../../lib/svg_text_utils');
var anchorUtils = require('../legend/anchor_utils');

var constants = require('./constants');


module.exports = function draw(gd) {
    var fullLayout = gd._fullLayout,
        menuData = makeMenuData(fullLayout);

    /* Update menu data is bound to the header-group.
     * The items in the header group are always present.
     *
     * Upon clicking on a header its corresponding button
     * data is bound to the button-group.
     *
     * We draw all headers in one group before all buttons
     * so that the buttons *always* appear above the headers.
     *
     * Note that only one set of buttons are visible at once.
     *
     * <g container />
     *
     *     <g header-group />
     *         <g item header />
     *         <text item header-arrow />
     *     <g header-group />
     *         <g item header />
     *         <text item header-arrow />
     *     ...
     *
     *     <g button-group />
     *         <g item button />
     *         <g item button />
     *         ...
     */

    // draw update menu container
    var menus = fullLayout._infolayer
        .selectAll('g.' + constants.containerClassName)
        .data(menuData.length > 0 ? [0] : []);

    menus.enter().append('g')
        .classed(constants.containerClassName, true)
        .style('cursor', 'pointer');

    menus.exit().remove();

    // return early if no update menus are visible
    if(menuData.length === 0) return;

    // join header group
    var headerGroups = menus.selectAll('g.' + constants.headerGroupClassName)
        .data(menuData, keyFunction);

    headerGroups.enter().append('g')
        .classed(constants.headerGroupClassName, true);

    // draw button container
    var gButton = menus.selectAll('g.' + constants.buttonGroupClassName)
        .data([0]);

    gButton.enter().append('g')
        .classed(constants.buttonGroupClassName, true)
        .style('pointer-events', 'all');

    // whenever we add new menu,
    if(headerGroups.enter().size()) {

        // attach 'state' variable to node to keep track of the active menu
        // '-1' means no menu is active
        gButton.attr(constants.menuIndexAttrName, '-1');

        // remove all dropped buttons (if any)
        gButton.selectAll('g.' + constants.buttonClassName).remove();
    }

    // remove exiting header, remove dropped buttons and reset margins
    headerGroups.exit().each(function(menuOpts) {
        d3.select(this).remove();
        gButton.selectAll('g.' + constants.buttonClassName).remove();
        Plots.autoMargin(gd, constants.autoMarginIdRoot + menuOpts._index);
    });

    // find dimensions before plotting anything (this mutates menuOpts)
    for(var i = 0; i < menuData.length; i++) {
        var menuOpts = menuData[i];

        // often more convenient than playing with two arguments
        menuOpts._index = i;
        findDimenstions(gd, menuOpts);
    }

    // draw headers!
    headerGroups.each(function(menuOpts) {
        var gHeader = d3.select(this);
        drawHeader(gd, gHeader, gButton, menuOpts);

        // update buttons if they are dropped
        if(areMenuButtonsDropped(gButton, menuOpts)) {
            drawButtons(gd, gHeader, gButton, menuOpts);
        }
    });
};

function makeMenuData(fullLayout) {
    var contOpts = fullLayout[constants.name],
        menuData = [];

    for(var i = 0; i < contOpts.length; i++) {
        var item = contOpts[i];

        if(item.visible) menuData.push(item);
    }

    return menuData;
}

function keyFunction(opts, i) {
    return opts.visible + i;
}

function areMenuButtonsDropped(gButton, menuOpts) {
    var droppedIndex = gButton.attr(constants.menuIndexAttrName);

    return droppedIndex === menuOpts._index;
}

function drawHeader(gd, gHeader, gButton, menuOpts) {
    var header = gHeader.selectAll('g.' + constants.headerClassName)
        .data([0]);

    header.enter().append('g')
        .classed(constants.headerClassName, true)
        .style('pointer-events', 'all');

    var active = menuOpts.active,
        headerOpts = menuOpts.buttons[active] || constants.blankHeaderOpts,
        posOpts = { y: 0, yPad: 0 };

    header
        .call(drawItem, menuOpts, headerOpts)
        .call(setItemPosition, menuOpts, posOpts);

    // draw drop arrow at the right edge
    var arrow = gHeader.selectAll('text.' + constants.headerArrowClassName)
        .data([0]);

    arrow.enter().append('text')
        .classed(constants.headerArrowClassName, true)
        .classed('user-select-none', true)
        .attr('text-anchor', 'end')
        .call(Drawing.font, menuOpts.font)
        .text('▼');

    arrow.attr({
        x: menuOpts.width - constants.arrowOffsetX,
        y: menuOpts.height1 / 2 + constants.textOffsetY
    });

    header.on('click', function() {
        gButton.selectAll('g.' + constants.buttonClassName).remove();

        // if clicked index is same as dropped index => fold
        // otherwise => drop buttons associated with header
        gButton.attr(
            constants.menuIndexAttrName,
            areMenuButtonsDropped(gButton, menuOpts) ? '-1' : String(menuOpts._index)
        );

        drawButtons(gd, gHeader, gButton, menuOpts);
    });

    header.on('mouseover', function() {
        header.call(styleOnMouseOver);
    });

    header.on('mouseout', function() {
        header.call(styleOnMouseOut, menuOpts);
    });

    // translate header group
    Lib.setTranslate(gHeader, menuOpts.lx, menuOpts.ly);
}

function drawButtons(gd, gHeader, gButton, menuOpts) {
    var buttonData = gButton.attr(constants.menuIndexAttrName) !== '-1' ?
        menuOpts.buttons :
        [];

    var buttons = gButton.selectAll('g.' + constants.buttonClassName)
        .data(buttonData);

    buttons.enter().append('g')
        .classed(constants.buttonClassName, true)
        .attr('opacity', '0')
        .transition()
        .attr('opacity', '1');

    buttons.exit()
        .transition()
        .attr('opacity', '0')
        .remove();

    var posOpts = {
        y: menuOpts.height1 + constants.gapButtonHeader,
        yPad: constants.gapButton
    };

    buttons.each(function(buttonOpts, buttonIndex) {
        var button = d3.select(this);

        button
            .call(drawItem, menuOpts, buttonOpts)
            .call(setItemPosition, menuOpts, posOpts);

        button.on('click', function() {
            // update 'active' attribute in menuOpts
            menuOpts._input.active = menuOpts.active = buttonIndex;

            // fold up buttons and redraw header
            gButton.attr(constants.menuIndexAttrName, '-1');
            drawHeader(gd, gHeader, gButton, menuOpts);
            drawButtons(gd, gHeader, gButton, menuOpts);

            // call button method
            var args = buttonOpts.args;
            Plotly[buttonOpts.method](gd, args[0], args[1], args[2]);
        });

        button.on('mouseover', function() {
            button.call(styleOnMouseOver);
        });

        button.on('mouseout', function() {
            button.call(styleOnMouseOut, menuOpts);
            buttons.call(styleButtons, menuOpts);
        });
    });

    buttons.call(styleButtons, menuOpts);

    // translate button group
    Lib.setTranslate(gButton, menuOpts.lx, menuOpts.ly);
}

function drawItem(item, menuOpts, itemOpts) {
    item.call(drawItemRect, menuOpts)
        .call(drawItemText, menuOpts, itemOpts);
}

function drawItemRect(item, menuOpts) {
    var rect = item.selectAll('rect')
        .data([0]);

    rect.enter().append('rect')
        .classed(constants.itemRectClassName, true)
        .attr({
            rx: constants.rx,
            ry: constants.ry,
            'shape-rendering': 'crispEdges'
        });

    rect.call(Color.stroke, menuOpts.bordercolor)
        .call(Color.fill, menuOpts.bgcolor)
        .style('stroke-width', menuOpts.borderwidth + 'px');
}

function drawItemText(item, menuOpts, itemOpts) {
    var text = item.selectAll('text')
        .data([0]);

    text.enter().append('text')
        .classed(constants.itemTextClassName, true)
        .classed('user-select-none', true)
        .attr('text-anchor', 'start');

    text.call(Drawing.font, menuOpts.font)
        .text(itemOpts.label)
        .call(svgTextUtils.convertToTspans);
}

function styleButtons(buttons, menuOpts) {
    var active = menuOpts.active;

    buttons.each(function(buttonOpts, i) {
        var button = d3.select(this);

        if(i === active) {
            button.select('rect.' + constants.itemRectClassName)
                .call(Color.fill, constants.activeColor);
        }
    });
}

function styleOnMouseOver(item) {
    item.select('rect.' + constants.itemRectClassName)
        .call(Color.fill, constants.hoverColor);
}

function styleOnMouseOut(item, menuOpts) {
    item.select('rect.' + constants.itemRectClassName)
        .call(Color.fill, menuOpts.bgcolor);
}

// find item dimensions (this mutates menuOpts)
function findDimenstions(gd, menuOpts) {
    menuOpts.width = 0;
    menuOpts.height = 0;
    menuOpts.height1 = 0;
    menuOpts.lx = 0;
    menuOpts.ly = 0;

    var fakeButtons = gd._tester.selectAll('g.' + constants.buttonClassName)
        .data(menuOpts.buttons);

    fakeButtons.enter().append('g')
        .classed(constants.buttonClassName, true);

    // loop over fake buttons to find width / height
    fakeButtons.each(function(buttonOpts) {
        var button = d3.select(this);

        button.call(drawItem, menuOpts, buttonOpts);

        var text = button.select('.' + constants.itemTextClassName),
            tspans = text.selectAll('tspan');

        // width is given by max width of all buttons
        var tWidth = text.node() && Drawing.bBox(text.node()).width,
            wEff = Math.max(tWidth + constants.textPadX, constants.minWidth);

        // height is determined by item text
        var tHeight = menuOpts.font.size * constants.fontSizeToHeight,
            tLines = tspans[0].length || 1,
            hEff = Math.max(tHeight * tLines, constants.minHeight) + constants.textOffsetY;

        menuOpts.width = Math.max(menuOpts.width, wEff);
        menuOpts.height1 = Math.max(menuOpts.height1, hEff);
        menuOpts.height += menuOpts.height1;
    });

    fakeButtons.remove();

    var graphSize = gd._fullLayout._size;
    menuOpts.lx = graphSize.l + graphSize.w * menuOpts.x;
    menuOpts.ly = graphSize.t + graphSize.h * (1 - menuOpts.y);

    var xanchor = 'left';
    if(anchorUtils.isRightAnchor(menuOpts)) {
        menuOpts.lx -= menuOpts.width;
        xanchor = 'right';
    }
    if(anchorUtils.isCenterAnchor(menuOpts)) {
        menuOpts.lx -= menuOpts.width / 2;
        xanchor = 'center';
    }

    var yanchor = 'top';
    if(anchorUtils.isBottomAnchor(menuOpts)) {
        menuOpts.ly -= menuOpts.height;
        yanchor = 'bottom';
    }
    if(anchorUtils.isMiddleAnchor(menuOpts)) {
        menuOpts.ly -= menuOpts.height / 2;
        yanchor = 'middle';
    }

    menuOpts.width = Math.ceil(menuOpts.width);
    menuOpts.height = Math.ceil(menuOpts.height);
    menuOpts.lx = Math.round(menuOpts.lx);
    menuOpts.ly = Math.round(menuOpts.ly);

    Plots.autoMargin(gd, constants.autoMarginIdRoot + menuOpts._index, {
        x: menuOpts.x,
        y: menuOpts.y,
        l: menuOpts.width * ({right: 1, center: 0.5}[xanchor] || 0),
        r: menuOpts.width * ({left: 1, center: 0.5}[xanchor] || 0),
        b: menuOpts.height * ({top: 1, middle: 0.5}[yanchor] || 0),
        t: menuOpts.height * ({bottom: 1, middle: 0.5}[yanchor] || 0)
    });
}

// set item positions (mutates posOpts)
function setItemPosition(item, menuOpts, posOpts) {
    var rect = item.select('.' + constants.itemRectClassName),
        text = item.select('.' + constants.itemTextClassName),
        tspans = text.selectAll('tspan'),
        borderWidth = menuOpts.borderwidth;

    Lib.setTranslate(item, borderWidth, borderWidth + posOpts.y);

    rect.attr({
        x: 0,
        y: 0,
        width: menuOpts.width,
        height: menuOpts.height1
    });

    var tHeight = menuOpts.font.size * constants.fontSizeToHeight,
        tLines = tspans[0].length || 1,
        spanOffset = ((tLines - 1) * tHeight / 4);

    var textAttrs = {
        x: constants.textOffsetX,
        y: menuOpts.height1 / 2 - spanOffset + constants.textOffsetY
    };

    text.attr(textAttrs);
    tspans.attr(textAttrs);

    posOpts.y += menuOpts.height1 + posOpts.yPad;
}
