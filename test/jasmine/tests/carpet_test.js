var Plotly = require('@lib/index');
var Plots = require('@src/plots/plots');
var Lib = require('@src/lib');

var Carpet = require('@src/traces/carpet');
var smoothFill2D = require('@src/traces/carpet/smooth_fill_2d_array');
var smoothFill = require('@src/traces/carpet/smooth_fill_array');

var d3 = require('d3');
var customMatchers = require('../assets/custom_matchers');
var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var fail = require('../assets/fail_test');

describe('carpet supplyDefaults', function() {
    'use strict';

    var traceIn,
        traceOut;

    var supplyDefaults = Carpet.supplyDefaults;

    var defaultColor = '#444',
        layout = {
            font: Plots.layoutAttributes.font
        };

    beforeEach(function() {
        traceOut = {};
    });

    it('uses a, b, x, and y', function() {
        traceIn = {
            a: [0, 1],
            b: [0, 1, 2],
            x: [[1, 2, 3], [4, 5, 6]],
            y: [[2, 3, 4], [5, 6, 7]]
        };

        supplyDefaults(traceIn, traceOut, defaultColor, layout);

        expect(traceOut.a).toEqual([0, 1]);
        expect(traceOut.b).toEqual([0, 1, 2]);
        expect(traceOut.x).toEqual([[1, 2, 3], [4, 5, 6]]);
        expect(traceOut.y).toEqual([[2, 3, 4], [5, 6, 7]]);
        expect(traceOut.da).toBeUndefined();
        expect(traceOut.db).toBeUndefined();
        expect(traceOut.a0).toBeUndefined();
        expect(traceOut.b0).toBeUndefined();
    });

    it('sets a0/da when a not provided', function() {
        traceIn = {
            y: [[2, 3, 4], [5, 6, 7]],
            b: [0, 1]
        };
        supplyDefaults(traceIn, traceOut, defaultColor, layout);

        expect(traceOut.da).not.toBeUndefined();
        expect(traceOut.a0).not.toBeUndefined();
        expect(traceOut.db).toBeUndefined();
        expect(traceOut.b0).toBeUndefined();
    });

    it('sets b0/db when b not provided', function() {
        traceIn = {
            y: [[2, 3, 4], [5, 6, 7]],
            a: [0, 1, 2]
        };
        supplyDefaults(traceIn, traceOut, defaultColor, layout);

        expect(traceOut.da).toBeUndefined();
        expect(traceOut.a0).toBeUndefined();
        expect(traceOut.db).not.toBeUndefined();
        expect(traceOut.b0).not.toBeUndefined();
    });

    it('sets visible = false when x is not valid', function() {
        traceIn = {y: [[1, 2], [3, 4]], x: [4]};
        supplyDefaults(traceIn, traceOut, defaultColor, layout);
        expect(traceOut.visible).toBe(false);
    });

    it('sets visible = false when y is not valid', function() {
        traceIn = {y: [1, 2]};
        supplyDefaults(traceIn, traceOut, defaultColor, layout);
        expect(traceOut.visible).toBe(false);
    });

    it('sets visible = false if dim x !== dim y', function() {
        traceIn = {
            x: [[1, 2], [3, 4]],
            y: [[1, 2, 3], [4, 5, 6]]
        };
        supplyDefaults(traceIn, traceOut, defaultColor, layout);
        expect(traceOut.visible).toBe(false);
    });

    /* it('sets _cheater = true when x is provided', function() {
        traceIn = {y: [[1, 2], [3, 4]]};
        supplyDefaults(traceIn, traceOut, defaultColor, layout);
        expect(traceOut._cheater).toBe(true);
    });

    it('sets cheater = false when x is not valid', function() {
        traceIn = {y: [[1, 2], [3, 4]], x: [[3, 4], [1, 2]]};
        supplyDefaults(traceIn, traceOut, defaultColor, layout);
        expect(traceOut._cheater).toBe(false);
    });*/
});

describe('supplyDefaults visibility check', function() {
    it('does not hide empty subplots', function() {
        var gd = {data: [], layout: {xaxis: {}}};
        Plots.supplyDefaults(gd);
        expect(gd._fullLayout.xaxis.visible).toBe(true);
    });

    it('does not hide axes with non-carpet traces', function() {
        var gd = {data: [{x: []}]};
        Plots.supplyDefaults(gd);
        expect(gd._fullLayout.xaxis.visible).toBe(true);
    });

    it('does not hide axes with non-cheater carpet', function() {
        var gd = {data: [{
            type: 'carpet',
            a: [1, 2, 3],
            b: [1, 2],
            x: [[1, 2, 3], [4, 5, 6]],
            y: [[1, 2, 3], [4, 5, 6]],
        }, {
            type: 'contourcarpet',
            z: [[1, 2, 3], [4, 5, 6]],
        }]};
        Plots.supplyDefaults(gd);
        expect(gd._fullLayout.xaxis.visible).toBe(true);
    });

    it('hides axes with cheater', function() {
        var gd = {data: [{
            type: 'carpet',
            a: [1, 2, 3],
            b: [1, 2],
            y: [[1, 2, 3], [4, 5, 6]],
        }, {
            type: 'contourcarpet',
            z: [[1, 2, 3], [4, 5, 6]],
        }]};
        Plots.supplyDefaults(gd);
        expect(gd._fullLayout.xaxis.visible).toBe(false);
    });

    it('does not hide an axis with cheater and non-cheater carpet', function() {
        var gd = {
            data: [{
                carpet: 'c1',
                type: 'carpet',
                a: [1, 2, 3],
                b: [1, 2],
                x: [[1, 2, 3], [4, 5, 6]],
                y: [[1, 2, 3], [4, 5, 6]],
            }, {
                carpet: 'c2',
                type: 'carpet',
                a: [1, 2, 3],
                b: [1, 2],
                y: [[1, 2, 3], [4, 5, 6]],
            }, {
                carpet: 'c1',
                type: 'contourcarpet',
                z: [[1, 2, 3], [4, 5, 6]],
            }, {
                carpet: 'c2',
                type: 'contourcarpet',
                z: [[1, 2, 3], [4, 5, 6]],
            }]
        };

        Plots.supplyDefaults(gd);
        expect(gd._fullLayout.xaxis.visible).toBe(true);
    });

    it('does not hide an axis with cheater and non-cheater carpet', function() {
        var gd = {
            data: [{
                carpet: 'c1',
                type: 'carpet',
                a: [1, 2, 3],
                b: [1, 2],
                x: [[1, 2, 3], [4, 5, 6]],
                y: [[1, 2, 3], [4, 5, 6]],
            }, {
                carpet: 'c2',
                type: 'carpet',
                a: [1, 2, 3],
                b: [1, 2],
                y: [[1, 2, 3], [4, 5, 6]],
            }, {
                carpet: 'c1',
                type: 'contourcarpet',
                z: [[1, 2, 3], [4, 5, 6]],
            }, {
                carpet: 'c2',
                type: 'contourcarpet',
                z: [[1, 2, 3], [4, 5, 6]],
            }]
        };

        Plots.supplyDefaults(gd);
        expect(gd._fullLayout.xaxis.visible).toBe(true);
    });
});

describe('carpet smooth_fill_2d_array', function() {
    var _;

    beforeAll(function() { jasmine.addMatchers(customMatchers); });

    it('fills in all points trivially', function() {
        // Given only corners, should just propagate the constant throughout:
        expect(smoothFill2D(
            [[1, _, _, _, _, _, _, 1],
             [_, _, _, _, _, _, _, _],
             [_, _, _, _, _, _, _, _],
             [_, _, _, _, _, _, _, _],
             [_, _, _, _, _, _, _, _],
             [_, _, _, _, _, _, _, _],
             [1, _, _, _, _, _, _, 1]],
            [1, 2, 3, 4, 5, 6, 7, 8],
            [1, 2, 3, 4, 5, 6, 7]
        )).toBeCloseTo2DArray([
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1]
        ], 3);
    });

    it('fills in linearly from corner data', function() {
        // Similar, but in this case we want it to just fill linearly:
        expect(smoothFill2D(
            [[0, _, _, 3],
             [_, _, _, _],
             [_, _, _, _],
             [_, _, _, _],
             [4, _, _, 7]],
            [1, 2, 3, 4],
            [1, 2, 3, 4, 5]
        )).toBeCloseTo2DArray([
            [0, 1, 2, 3],
            [1, 2, 3, 4],
            [2, 3, 4, 5],
            [3, 4, 5, 6],
            [4, 5, 6, 7]
        ], 3);
    });

    it('fills in interior data', function() {
        expect(smoothFill2D(
            [[1, 2, 3, 4],
             [4, _, _, 7],
             [7, 8, 9, 10]],
            [0, 1, 2, 3],
            [0, 1, 2]
        )).toBeCloseTo2DArray([
            [1, 2, 3, 4],
            [4, 5, 6, 7],
            [7, 8, 9, 10]
        ], 3);
    });

    it('fills in exterior data', function() {
        expect(smoothFill2D(
            [[_, _, 3, _],
             [4, 5, 6, _],
             [_, 8, 9, _]],
            [0, 1, 2, 3],
            [0, 1, 2]
        )).toBeCloseTo2DArray([
            [1, 2, 3, 4],
            [4, 5, 6, 7],
            [7, 8, 9, 10]
        ], 3);
    });

    it('fills in heavily missing data', function() {
        expect(smoothFill2D(
            [[_, _, _, _],
             [4, _, 6, _],
             [_, 8, _, 10]],
            [0, 1, 2, 3],
            [0, 1, 2]
        )).toBeCloseTo2DArray([
            [1, 2, 3, 4],
            [4, 5, 6, 7],
            [7, 8, 9, 10]
        ], 3);
    });

    it('fills non-uniform interior data', function() {
        expect(smoothFill2D(
            [[1, 2, 4, 5],
             [4, _, _, 8],
             [10, 11, 13, 14]],
            [0, 1, 3, 4],
            [0, 1, 3]
        )).toBeCloseTo2DArray([
            [1, 2, 4, 5],
            [4, 5, 7, 8],
            [10, 11, 13, 14]
        ], 3);
    });

    it('fills non-uniform exterior data', function() {
        expect(smoothFill2D(
            [[_, 2, 4, _],
             [4, 5, 7, 8],
             [_, 11, 13, _]],
            [0, 1, 3, 4],
            [0, 1, 3]
        )).toBeCloseTo2DArray([
            [1, 2, 4, 5],
            [4, 5, 7, 8],
            [10, 11, 13, 14]
        ], 3);
    });

    it('fills heavily missing non-uniform data', function() {
        expect(smoothFill2D(
            [[_, _, 4, _],
             [4, _, _, 8],
             [_, 11, _, _]],
            [0, 1, 3, 4],
            [0, 1, 3]
        )).toBeCloseTo2DArray([
            [1, 2, 4, 5],
            [4, 5, 7, 8],
            [10, 11, 13, 14]
        ], 3);
    });

    it('applies laplacian smoothing', function() {
        // The examples above all just assume a linear trend. Check
        // to make sure it's actually smoothing:
        expect(smoothFill2D(
            [[0.5, 1, 1, 0.5],
             [0, _, _, 0],
             [0.5, 1, 1, 0.5]],
            [0, 1, 2, 3],
            [0, 1, 2]
        )).toBeCloseTo2DArray([
            [0.5, 1, 1, 0.5],
            [0, 2 / 3, 2 / 3, 0],
            [0.5, 1, 1, 0.5]
        ], 3);
    });

    it('applies laplacian smoothing symmetrically', function() {
        // Just one more santiy check for a case that's particularly easy to guess
        // due to the symmetry:
        expect(smoothFill2D(
            [[0.5, 1, 1, 0.5],
             [0, _, _, 0],
             [0, _, _, 0],
             [0.5, 1, 1, 0.5]],
            [0, 1, 2, 3],
            [0, 1, 2, 3]
        )).toBeCloseTo2DArray([
            [0.5, 1, 1, 0.5],
            [0, 0.5, 0.5, 0],
            [0, 0.5, 0.5, 0],
            [0.5, 1, 1, 0.5]
        ], 3);
    });
});

describe('smooth_fill_array', function() {
    var _;

    beforeAll(function() { jasmine.addMatchers(customMatchers); });

    it('fills in via linear interplation', function() {
        expect(smoothFill([_, _, 2, 3, _, _, 6, 7, _, _, 10, 11, _]))
        .toBeCloseToArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('fills with zero if no data', function() {
        expect(smoothFill([_, _, _]))
        .toBeCloseToArray([0, 0, 0]);
    });

    it('fills with constant if only one data point', function() {
        expect(smoothFill([_, _, _, _, 8, _, _]))
        .toBeCloseToArray([8, 8, 8, 8, 8, 8, 8]);
    });

    // Extra tests just to make sure the fence cases are handled properly:
    it('fills in one leading point', function() {
        expect(smoothFill([_, 1, 2, 3]))
        .toBeCloseToArray([0, 1, 2, 3]);
    });

    it('fills in two leading points', function() {
        expect(smoothFill([_, _, 2, 3]))
        .toBeCloseToArray([0, 1, 2, 3]);
    });

    it('fills in one trailing point', function() {
        expect(smoothFill([0, 1, 2, _]))
        .toBeCloseToArray([0, 1, 2, 3]);
    });

    it('fills in two trailing points', function() {
        expect(smoothFill([0, 1, _, _]))
        .toBeCloseToArray([0, 1, 2, 3]);
    });
});

describe('Test carpet interactions:', function() {
    var gd;

    beforeEach(function() {
        gd = createGraphDiv();
    });

    afterEach(destroyGraphDiv);

    function countCarpets() {
        return d3.select(gd).selectAll('.carpetlayer').selectAll('.trace').size();
    }

    function countContourTraces() {
        return d3.select(gd).selectAll('.contour').size();
    }

    it('should restyle visible attribute properly', function(done) {
        var mock = Lib.extendDeep({}, require('@mocks/cheater.json'));

        Plotly.plot(gd, mock)
        .then(function() {
            expect(countCarpets()).toEqual(1);
            expect(countContourTraces()).toEqual(3);

            return Plotly.restyle(gd, 'visible', false, [2, 3]);
        })
        .then(function() {
            expect(countCarpets()).toEqual(1);
            expect(countContourTraces()).toEqual(1);

            return Plotly.restyle(gd, 'visible', true);
        })
        .then(function() {
            expect(countCarpets()).toEqual(1);
            expect(countContourTraces()).toEqual(3);

            return Plotly.restyle(gd, 'visible', false);
        })
        .then(function() {
            expect(countCarpets()).toEqual(0);
            expect(countContourTraces()).toEqual(0);
        })
        .catch(fail)
        .then(done);
    });

    it('should add/delete trace properly', function(done) {
        var mock = Lib.extendDeep({}, require('@mocks/cheater.json'));
        var trace1 = Lib.extendDeep({}, mock.data[1]);

        Plotly.plot(gd, mock)
        .then(function() {
            expect(countCarpets()).toEqual(1);
            expect(countContourTraces()).toEqual(3);

            return Plotly.deleteTraces(gd, [1]);
        })
        .then(function() {
            expect(countCarpets()).toEqual(1);
            expect(countContourTraces()).toEqual(2);

            return Plotly.addTraces(gd, trace1);
        })
        .then(function() {
            expect(countCarpets()).toEqual(1);
            expect(countContourTraces()).toEqual(3);

            return Plotly.deleteTraces(gd, [0, 1, 2, 3]);
        })
        .then(function() {
            expect(countCarpets()).toEqual(0);
            expect(countContourTraces()).toEqual(0);
        })
        .catch(fail)
        .then(done);
    });

    it('should respond to relayout properly', function(done) {
        var mock = Lib.extendDeep({}, require('@mocks/cheater.json'));

        Plotly.plot(gd, mock)
        .then(function() {
            return Plotly.relayout(gd, 'xaxis.range', [0, 1]);
        })
        .then(function() {
            return Plotly.relayout(gd, 'yaxis.range', [7, 8]);
        })
        .catch(fail)
        .then(done);
    });
});

describe('scattercarpet array attributes', function() {
    var gd;

    beforeEach(function() {
        gd = createGraphDiv();
    });

    afterEach(destroyGraphDiv);

    it('works in both initial draws and restyles', function(done) {
        var mock = Lib.extendDeep({}, require('@mocks/scattercarpet.json'));

        var mc = ['#000', '#00f', '#0ff', '#ff0'];
        var ms = [10, 20, 30, 40];
        var ms2 = [5, 6, 7, 8];
        var mlw = [1, 2, 3, 4];
        var mlc = ['#00e', '#0ee', '#ee0', '#eee'];

        // add some arrayOk array attributes
        mock.data[5].marker = {
            color: mc,
            size: ms,
            line: {
                width: mlw,
                color: mlc
            }
        };

        Plotly.plot(gd, mock)
        .then(function() {
            for(var i = 0; i < 4; i++) {
                var pt = gd.calcdata[5][i];
                expect(pt.mc).toBe(mc[i]);
                expect(pt.ms).toBe(ms[i]);
                expect(pt.mlw).toBe(mlw[i]);
                expect(pt.mlc).toBe(mlc[i]);
            }

            // turn one array into a constant, another into a new array,
            return Plotly.restyle(gd, {'marker.color': '#f00', 'marker.size': [ms2]},
                null, [5]);
        })
        .then(function() {
            expect(gd._fullData[5].marker.color).toBe('#f00');

            for(var i = 0; i < 4; i++) {
                var pt = gd.calcdata[5][i];
                expect(pt.mc).toBeUndefined();
                expect(pt.ms).toBe(ms2[i]);
                expect(pt.mlw).toBe(mlw[i]);
                expect(pt.mlc).toBe(mlc[i]);
            }
        })
        .catch(fail)
        .then(done);
    });
});
