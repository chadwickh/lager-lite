// graphit.js - wrapper around dygraphs.  At this point you pass a div, the metric, and the ymax and 
//              this function will build the graph for you.  

graphit =  function(div, metric, ymax) {
    var graph_div = div +"_chart"
    var legend_div = div +"_legend"
    var labels=['Time']
    var data=[]
    var times = []
    console.log('In graphit function')
    console.log(metric)

    // There's gotta be a better way - but I haven't figured it out yet
    // Basically had an issue using the milliseconds from epoch as an array index and had to change to
    // building an array of sorted timestamps and then populating a 0-indexed array with them...
    for (var time in metric['data']) {
        times.push(time)
    }

    times.sort()
    //console.log(times)

    for (var key in metric['labels']) {
       labels.push(key)
       //console.log(key)
       for (i=0; i < times.length; i++) {
          time=times[i]
          if (data[i] === undefined) {
             data[i]=[]
             data[i].push(new Date(parseInt(time)))
          }
          data[i].push(metric['data'][time][key])
       }
    }

    console.log("Data for Div")
    console.log(div)
    console.log(data)
    //console.log(Papa.unparse(data));

    GRAPHS[div]['graph'] = new Dygraph(document.getElementById(graph_div),
                           data,
                           {
                             hideOverlayOnMouseOut: false,
                             valueRange: [0,null],
                             stackedGraph: false,
                             drawAxesAtZero: true,
                             legend:"always",
                             labels:labels,
                             labelsDiv: legend_div,
                             labelsSeparateLines:true,
                             labelsShowZeroValues: false,
                             labelsSortByValue: true,
                             hideOverlayOnMouseOut: false,
                             yRangePad: 1,
                             xRangePad: 10,
                             xValueParser: function(x) {return (new Date(x))},
                             axes : {
                                 x: {
                                     valueFormatter: Dygraph.dateString_
                                 }
                             }
                             //This is for the color shading to indicate caution and danger
                             //underlayCallback: function(canvas, area, cpu_graph)
                               //{ var bottom_left = cpu_graph.toDomCoords(area.x,50);
                                 //var top_right = cpu_graph.toDomCoords(cpu_graph.xAxisExtremes()[1],70);
                                 //var left = bottom_left[0];
                                 //var right = top_right[0]; canvas.fillStyle = "rgba(255, 253, 208, 1.0)";
                                 //canvas.fillRect(left, bottom_left[1], right-left+200, top_right[1]-bottom_left[1]);
                               //}
                            }
     )

  }
