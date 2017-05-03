$(function() {
  // Kinda crazy that D3 doesn't have this built in
  function translateString(x,y) {
    return 'translate(' + x + ', ' + y + ')';
  }

  var margin = {
      top: 20,
      right: 20,
      bottom: 60,
      left: 60
  };
  var height = 700;
  var width = 700;

  var drawHeight = height - margin.top - margin.bottom;
  var drawWidth = width - margin.left - margin.right;

  var div = d3.select('#chart-container');

  var svg = div.append("svg")
      // 'Exterior' CSS styles
      .style('width', '100%')
      .style('height', 'auto')
      .style('max-height', '700px')
      // 'Interior' drawing height
      .attr('height', height)
      .attr('width', width)
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      // Center + don't let it overflow or get cropped
      .attr('preserveAspectRatio', 'xMidYMid meet');

  var drawArea = svg.append('g')
      .attr('transform', translateString(margin.left, margin.top));

  var xAxis = d3.axisBottom();

  var xAxisContainer = svg.append('g')
    .attr('transform', translateString(margin.left, margin.top + drawHeight));

  var xAxisTitle = svg.append('text')
    .attr('transform', translateString(margin.left + (drawWidth / 2), margin.top + drawHeight + 40))
    .attr('text-anchor', 'middle')
    .text('Defensive Rebounding %');

  var yAxis = d3.axisLeft();

  var yAxisContainer = svg.append('g')
    .attr('transform', translateString(margin.left, margin.top));

  var yAxisTitle = svg.append('text')
    .attr('transform', translateString(margin.left - 40, margin.top + (drawHeight / 2)) + ' rotate(-90)')
    .attr('text-anchor', 'middle')
    .text('Offensive Rebounding %');

  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .html(function(d) {
      // 'TOT' means total -- as in, the player's numbers are the total between
      // their multiple teams for that season
      var teamText = d.Tm === 'TOT' ? 'multiple' : d.Tm;
      return d.Player + '<br/>' + d.Position + '<br/>' + d.Season + ', ' + teamText;
    });

  svg.call(tip);

  function updateUsageText() {
    var range = $('#usage-range')[0];
    $('#usage-min').text(range.valueLow + '%');
    $('#usage-max').text(range.valueHigh + '%');
  }

  updateUsageText();

  // For range inputs, 'input' fires continuously as the value is being changed
  $('.usage').on('input', updateUsageText);

  d3.csv('data/prepped-data.csv', withData);

  function withData(error, data) {
    if (error) {
      console.error(error);
      return;
    }

    $('input.season, input.position, input[name=color]').on('input', filterAndEncodeData);

    // For range inputs, 'change' only fires when the slider is released
    $('.usage').on('change', filterAndEncodeData);

    function filterAndEncodeData() {
      // Shallow-copy OK because filtering just removes references, doesn't
      // modify referenced objects
      var filtered = data;

      var seasonFilters = $('input.season:not(:checked)');
      seasonFilters.each(function(index, filter) {
        filtered = filtered.filter(function(d) {
          return d.Season !== $(filter).val();
        });
      });

      var positionFilters = $('input.position:not(:checked)');
      positionFilters.each(function(index, filter) {
        filtered = filtered.filter(function(d) {
          return d.Position !== $(filter).val();
        });
      });

      var usageRange = $('#usage-range')[0];
      filtered = filtered.filter(function(d) {
        return +d['USG%'] >= usageRange.valueLow && +d['USG%'] <= usageRange.valueHigh;
      });

      var colorEncoding = $('input[name=color]:checked').val();
      draw(filtered, colorEncoding);
    }

    filterAndEncodeData();
  }

  function draw(data, colorEncoding) {
    // Maxes multipled by 1.1 for some dynamic headroom.
    // Mins have static amount of headroom because min values are often
    // very close to 0 in this dataset.
    var xMin = (d3.min(data, function(d) {return +d['DRB%'];}) || 0) - 1;
    var xMax = (d3.max(data, function(d) {return +d['DRB%'];}) || 30) * 1.1;

    var yMin = (d3.min(data, function(d) {return +d['ORB%'];}) || 0) - 1;
    var yMax = (d3.max(data, function(d) {return +d['ORB%'];}) || 30) * 1.1;

    var xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, drawWidth]);

    // Previous x scale. Could be null (on first draw).
    var oldXScale = xAxis.scale();

    // Previous y scale. Could be null (on first draw).
    var yScale = d3.scaleLinear()
      // Max -> min because y axis is inverted (higher y value is lower visually)
      .domain([yMax, yMin])
      .range([0, drawHeight]);

    var oldYScale = yAxis.scale();

    var colorScale;

    if (colorEncoding === 'Position') {
      colorScale = d3.scaleOrdinal()
        .domain(['Guard', 'Forward', 'Center'])
        .range(d3.schemeCategory10);

      // Color-code words as a legend
      $('.coded-season').css('color', '');
      $('.coded-position').each(function(index, item) {
        $(item).css('color', colorScale($(item).text()));
      });
    } else {
      // Season encoded as color
      colorScale = d3.scaleOrdinal()
        .domain(['1982-83', '1994-95', '2016-17'])
        .range(d3.schemeCategory10);

      // Color-code words as a legend
      $('.coded-position').css('color', '');
      $('.coded-season').each(function(index, item) {
        $(item).css('color', colorScale($(item).text()));
      });
    }

    xAxisContainer
      .transition()
      .duration(750)
      .ease(d3.easeExp)
      .call(xAxis.scale(xScale));

    yAxisContainer
      .transition()
      .duration(750)
      .ease(d3.easeExp)
      .call(yAxis.scale(yScale));

    var circles = drawArea.selectAll('circle')
      // Player-season is the unique identifier
      .data(data, function(d) {return d.ID + d.Season;});

    circles.enter()
      .append('circle')
        // Stuff that never changes
        .attr('opacity', 0.7)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        // Put entering points where they *would have been* in the previous scale
        // so they enter going in the right direction
        .attr('cx', function(d) {
          if (oldXScale) {
            return oldXScale(+d['DRB%']);
          } else {
            // On initial draw, start entering circles at corner
            return 0;
          }
        })
        .attr('cy', function(d) {
          if (oldYScale) {
            return oldYScale(+d['ORB%']);
          } else {
            // On initial draw, start entering circles at corner
            return drawHeight;
          }
        })
        .attr('fill', function(d) {
          return colorScale(d[colorEncoding]);
        })
        // Animate the entering circles growing from nothing
        .attr('r', 0)
      // Rest applies to updating circles too
      .merge(circles)
        .transition()
        .duration(750)
        .ease(d3.easeExp)
        .attr('cx', function(d) {
          return xScale(+d['DRB%']);
        })
        .attr('cy', function(d) {
          return yScale(+d['ORB%']);
        })
        .attr('fill', function(d) {
          return colorScale(d[colorEncoding]);
        })
        // Grow to full size (if not already)
        .attr('r', 5);

    circles.exit()
      .transition()
      .duration(750)
      .ease(d3.easeExp)
      // Move exiting circles where they would be so they exit going
      // in the right direction
      .attr('cx', function(d) {
        return xScale(+d['DRB%']);
      })
      .attr('cy', function(d) {
        return yScale(+d['ORB%']);
      })
      // Animate exiting circles shrinking down to nothing
      .attr('r', 0)
      .remove();
  }
});
