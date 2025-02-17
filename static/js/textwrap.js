// Make sure D3 is globally accessible
var textwrap = (function() {
    var method,
        verify_bounds,
        resolve_bounds,
        resolve_padding,
        pad,
        dimensions,
        wrap;

    // Test for foreignObject support and determine wrapping strategy
    method = typeof SVGForeignObjectElement === 'undefined' ? 'tspans' : 'foreignobject';

    // Accept multiple input types as boundaries
    verify_bounds = function(bounds) {
        if (typeof bounds === 'object' && !bounds.nodeType) {
            if (!bounds.height || !bounds.width) {
                console.error('text wrapping bounds must specify height and width');
                return false;
            } else {
                return true;
            }
        }
        if (bounds instanceof d3.selection || bounds.nodeType || typeof bounds === 'function') {
            return true;
        } else {
            console.error('invalid bounds specified for text wrapping');
            return false;
        }
    };

    resolve_bounds = function(bounds) {
        var dimensions;
        if (typeof bounds === 'function') {
            dimensions = bounds();
        } else if (bounds.nodeType) {
            dimensions = bounds.getBoundingClientRect();
        } else if (typeof bounds === 'object') {
            dimensions = bounds;
        }
        return {
            height: dimensions.height,
            width: dimensions.width
        };
    };

    resolve_padding = function(padding) {
        if (typeof padding === 'function') {
            return padding();
        } else if (typeof padding === 'number') {
            return padding;
        } else {
            return 0;
        }
    };

    pad = function(dimensions, padding) {
        return {
            height: dimensions.height - padding * 2,
            width: dimensions.width - padding * 2
        };
    };

    dimensions = function(bounds, padding) {
        return pad(resolve_bounds(bounds), resolve_padding(padding));
    };

    wrap = {
        foreignobject: function(text, dimensions, padding) {
            var content = text.text();
            var parent = d3.select(text.node().parentNode);
            text.remove();
            var foreignobject = parent.append('foreignObject')
                .attr('width', dimensions.width)
                .attr('height', dimensions.height)
                .attr('x', +text.attr('x') + padding)
                .attr('y', +text.attr('y') + padding);
            var div = foreignobject.append('xhtml:div')
                .style('height', dimensions.height + 'px')
                .style('width', dimensions.width + 'px')
                .html(content);
            return div;
        },
        tspans: function(text, dimensions, padding) {
            var pieces = text.text().split(' ').reverse();
            text.text('');
            var tspan = text.append('tspan').attr('dx', 0).attr('dy', 0);
            var x_offset = 0;
            while (pieces.length) {
                var piece = pieces.pop();
                tspan.text(tspan.text() + ' ' + piece);
                if (tspan.node().getComputedTextLength() > dimensions.width) {
                    var previous_content = tspan.text().split(' ').slice(0, -1).join(' ');
                    tspan.text(previous_content);
                    x_offset = tspan.node().getComputedTextLength() * -1;
                    tspan = text.append('tspan')
                        .attr('dx', x_offset)
                        .attr('dy', '1em')
                        .text(piece);
                }
            }
            text.attr('x', +text.attr('x') + padding)
                .attr('y', +text.attr('y') + padding);
        }
    };

    return function() {
        var bounds, padding = 0;
        var wrapper = function(selection) {
            selection.each(function() {
                var dims = dimensions(bounds, padding);
                d3.select(this).call(wrap[method], dims, padding);
            });
        };

        wrapper.bounds = function(value) {
            if (!arguments.length) return bounds;
            bounds = value;
            return wrapper;
        };

        wrapper.padding = function(value) {
            if (!arguments.length) return padding;
            padding = value;
            return wrapper;
        };

        return wrapper;
    };
})();
