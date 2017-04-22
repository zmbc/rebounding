$(function() {
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

  var div = d3.select('#scatter');

  var svg = div.append("svg")
      .style('width', '100%')
      .style('max-height', '700px')
      .attr('height', height)
      .attr('width', width)
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('preserveAspectRatio', 'xMidYMin meet');

  var drawArea = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

  var xAxis = d3.axisBottom();

  var xAxisContainer = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + (margin.top + drawHeight) + ')');

  var xAxisTitle = svg.append('text')
    .attr('transform', 'translate(' + (margin.left + (drawWidth / 2)) + ',' + (margin.top + drawHeight + 40) + ')')
    .attr('text-anchor', 'middle')
    .text('Defensive Rebounding %');

  var yAxis = d3.axisLeft();

  var yAxisContainer = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var yAxisTitle = svg.append('text')
    .attr('transform', 'translate(' + (margin.left - 40) + ',' + (margin.top + (drawHeight / 2)) + ') rotate(-90)')
    .attr('text-anchor', 'middle')
    .text('Offensive Rebounding %');

  var tip = d3.tip()
    .attr('class', 'd3-tip')
    .html(function(d) {
      var teamText = d.Tm;
      if (teamText === 'TOT') {
        teamText = 'multiple';
      }
      return d.Player + '<br/>' + d.Position + '<br/>' + d.Season + ', ' + teamText;
    });

  svg.call(tip);

  function updateUsageText() {
    var range = $('#usage-range')[0];
    $('#usage-min').text(range.valueLow + '%');
    $('#usage-max').text(range.valueHigh + '%');
  }

  updateUsageText();

  $('.usage').on('input', updateUsageText);

  d3.csv('data/prepped-data.csv', withData);

  function withData(error, data) {
    if (error) {
      return;
    }

    $('input.season').on('change', filterAndEncodeData);

    $('input.position').on('change', filterAndEncodeData);

    $('input[name=color]').on('change', filterAndEncodeData);

    $('.usage').on('change', filterAndEncodeData);

    function filterAndEncodeData() {
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
        return +d['USG%'] >= usageRange.valueLow;
      });
      filtered = filtered.filter(function(d) {
        return +d['USG%'] <= usageRange.valueHigh;
      });

      var colorEncoding = $('input[name=color]:checked').val();
      draw(filtered, colorEncoding);
    }

    filterAndEncodeData();
  }

  function draw(data, colorEncoding) {
    var xMin = d3.min(data, function(d) {return +d['DRB%'];}) - 1;
    var xMax = d3.max(data, function(d) {return +d['DRB%'];}) * 1.1;

    var yMin = d3.min(data, function(d) {return +d['ORB%'];}) - 1;
    var yMax = d3.max(data, function(d) {return +d['ORB%'];}) * 1.1;

    var xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, drawWidth]);

    var yScale = d3.scaleLinear()
      .domain([yMax, yMin])
      .range([0, drawHeight]);

    var colorScale;

    if (colorEncoding === 'Position') {
      colorScale = d3.scaleOrdinal()
        .domain(['Guard', 'Forward', 'Center'])
        .range(d3.schemeCategory10);

      $('.coded-season').css('color', '');
      $('.coded-position').each(function(index, item) {
        $(item).css('color', colorScale($(item).text()));
      });
    } else {
      // Season encoded as color
      colorScale = d3.scaleOrdinal()
        .domain(['1982-83', '1994-95', '2016-17'])
        .range(d3.schemeCategory10);

      $('.coded-position').css('color', '');
      $('.coded-season').each(function(index, item) {
        $(item).css('color', colorScale($(item).text()));
      });
    }

    xAxisContainer
      .transition()
      .duration(500)
      .call(xAxis.scale(xScale));
    yAxisContainer
      .transition()
      .duration(500)
      .call(yAxis.scale(yScale));

    var circles = drawArea.selectAll('circle').data(data, function(d) {return d.ID + d.Season;});

    circles.enter()
      .append('circle')
      .attr('r', 0)
      .attr('opacity', 0.7)
      .attr('fill', function(d) {
        return colorScale(d[colorEncoding]);
      })
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .attr('cx', function(d) {
        return xScale(+d['DRB%']);
      })
      .attr('cy', function(d) {
        return yScale(+d['ORB%']);
      })
      .transition()
      .duration(500)
      .attr('r', 5);

    circles.transition()
      .duration(500)
      .attr('cx', function(d) {
        return xScale(+d['DRB%']);
      })
      .attr('cy', function(d) {
        return yScale(+d['ORB%']);
      })
      .attr('fill', function(d) {
        return colorScale(d[colorEncoding]);
      });

    circles.exit()
      .transition()
      .duration(500)
      .attr('r', 0)
      .remove();
  }
});
