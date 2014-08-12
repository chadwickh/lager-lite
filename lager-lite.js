reportslite = new Meteor.Collection("reportslite")

LAGER = {}
LAGER.metrics=['CPU', 'CWP', 'Port_IOPS', 'Port_MBPS', 'DP_IOPS', 'DP_MBPS', 'LUN_IOPS', 'LUN_MBPS', 'LUN_TAGS', 'DISK_BUSY', 'BLOCK_SIZE']

if (Meteor.isClient) {

  Router.map(function() {
    this.route('home', {path: '/', template:'hello'})
  })

  function graphit (div, metric, ymax) {
    var graph_div = div +"_chart"
    var legend_div = div +"_legend"
    var labels=['Time']
    var data=[]
    var times = []
    console.log('In graphit function')
    console.log(metric)

    // There's gotta be a better way - but I haven't figured it out yet
    // Basically had an issue using the milliseconds from epoch as an arry index and had to change to
    // building an array of sorted timestamps and then populating a 0-indexed array with them...
    for (var time in metric['data']) {
        times.push(time)
    }

    times.sort()
    console.log(times)

    for (var key in metric['labels']) {
       labels.push(key)
       console.log(key)
       for (i=0; i < times.length; i++) {
          time=times[i]
          if (data[i] === undefined) {
             data[i]=[]
             data[i].push(new Date(parseInt(time)))
          }
          data[i].push(metric['data'][time][key])
       }
    }

    console.log(data)

    LAGER[div]['graph'] = new Dygraph(document.getElementById(graph_div),
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

  Template.hello.helpers({
    uploadPercent: function() {
       filesCount = Session.get("filesCount")
       console.log('filesCount:  '+filesCount)
       filesLoaded = Session.get("filesLoaded")
       console.log('filesLoaded:  '+filesLoaded)
       if ((filesCount > 0) && (filesLoaded != undefined)) {
          console.log("Returning:  "+filesLoaded/filesCount)
          return ((filesLoaded/filesCount)*100).toFixed(0)
       } else {
          console.log("Returning 0, no files in list")
          return 0
       }
    },

    arraySerial: function() {
       serial=Session.get("serial")
       if (serial === undefined) {
          return 'No array'
       } else {
          return 'Information for array:  '+serial
       }
    }
  })

  Template.hello.greeting = function () {
    return "Welcome to lager-lite.";
  };

  Template.hello.events({
    'click input': function () {
      console.log(Meteor.user())
      if (Meteor.user() !== "undefined") {
         LAGER['owner']=Meteor.user()
      }
      for (var i=0; i <  LAGER.metrics.length; i++) {
        var div=LAGER.metrics[i]
        $('#'+div+'_chart').empty()
        $('#'+div+'_legend').empty()
        LAGER[LAGER.metrics[i]]={}
        LAGER[LAGER.metrics[i]]['labels']={}
        LAGER[LAGER.metrics[i]]['data']={}
        LAGER[LAGER.metrics[i]]['graph']={}
        LAGER[LAGER.metrics[i]]['max']={}
        LAGER[LAGER.metrics[i]]['sum']={}
        LAGER[LAGER.metrics[i]]['average']={}
      }
      Session.set("filesCount",0)
      Session.set("filesLoaded",0)
      Session.set("serial",undefined)
    },

    'shown.bs.tab': function (e) {
        selected_div=$(e.target).attr("href").replace('#','')
        LAGER[selected_div]['graph'].resize()
    },


    'change input':  function() {
      var filecount = 0
      var fileList = []
      var data_fields = {}
      fileList = document.getElementById('input').files
      Session.set("filesCount",fileList.length)

      var start_re = /^No\./
      var date_re = /^20[0-9][0-9]\/[01][0-9]\//
      var proc_re = /^CTL Core Usage\(%\)/
      var cwp_re = /^CTL Partition Write Pending Rate\(%\)/
      var port_re = /^CTL  Port        IO Rate\(IOPS\)/
      var dp_re = /^CTL DP Pool        IO Rate\(IOPS\)/
      var lun_re = /^CTL    LU        IO Rate\(IOPS\)/
      var tags_re = /^CTL    LU   Tag Count/
      var drive_re = /^CTL Unit HDU Operating Rate\(%\)/
      var section_re = /^[\-a-zA-Z]/

      for (i=0; i < fileList.length; i++) {
        var reader = new FileReader()

        reader.readAsText(fileList[i])

        reader.onload = function(e) {
          metric=''
          var lines = e.target.result.split('\n')
          $.each(lines, function() {
             line=this.replace(/^\s+/,'')
             if (section_re.test(line)) {
               metric=''
             }
             if (start_re.test(line)) {
               sample=parseInt(line.split('.')[1])-1
               console.log('Now processing sample:  ' + sample)
             } else if (date_re.test(line)) {
               info = line.split('-')
               //start = new Date(info[0].replace(/\s+$/,'').replace('"',''))
               //end = new Date(info[1].replace(/\s+$/,'').replace('"',''))
               start = moment(info[0],"YYYY/MM/DD HH:mm:ss").valueOf()
               end = moment(info[1],"YYYY/MM/DD HH:mm:ss").valueOf()
               serial = info[2].split(':')[1]
               Session.set("serial", serial)
               console.log('Processing array:  '+serial+'  from:  '+start+' to:  '+end)
             } else if (proc_re.test(line)) {
               metric='CPU'
               // series_fields is an array of fields to concatenate with dashes to build the 
               // series name
               series_fields=[0,1]
               // data_fields is a hash with the key being the metric name and the value
               // the field from the line to use
               data_fields[metric]=[2]
               console.log('In CPU section')
               return true
             } else if (cwp_re.test(line)) {
               metric='CWP'
               series_fields=[0,1]
               data_fields[metric]=[2]
               console.log('In CWP section')
               return true
             } else if (port_re.test(line)) {
               metric='Port'
               series_fields=[0,1]
               data_fields[metric+'_IOPS']=[2]
               data_fields[metric+'_MBPS']=[7]
               console.log('In Port section')
               return true
             } else if (dp_re.test(line)) {
               metric='DP'
               series_fields=[0,1]
               data_fields[metric+'_IOPS']=[2]
               data_fields[metric+'_MBPS']=[7]
               console.log('In DP section')
               return true
             } else if (lun_re.test(line)) {
               metric='LUN'
               series_fields=[0,1]
               data_fields[metric+'_IOPS']=[2]
               data_fields[metric+'_MBPS']=[7]
               console.log('In LUN section')
               return true
             } else if (tags_re.test(line)) {
               metric='LUN_TAGS'
               series_fields=[0,1]
               data_fields[metric]=[2]
               console.log('In LUN_TAGS section')
               return true
             } else if (drive_re.test(line)) {
               metric='DISK_BUSY'
               series_fields=[0,1,2]
               data_fields[metric]=[3]
               console.log('In DISK_BUSY section')
               return true
             }
             switch (metric) {
               case 'CPU':
               case 'CWP':
               case 'Port':
               case 'DP':
               case 'LUN':
               case 'LUN_TAGS':
               case 'DISK_BUSY':
                 //console.log(metric)
                 //console.log(line)
                 temp_line=line.split(/\s+/)
                 series=temp_line[series_fields[0]]
                 //console.log("Setting series to:  " + series)
                 if (series_fields.length > 0) {
                    for (i=1; i < series_fields.length; i++) {
                       series=series+"-"+temp_line[series_fields[i]]
                       //console.log("Setting series to:  " + series)
                    }
                 }
                 for (var key in data_fields) {
                    // check to make sure that the metric and key are related - 
                    // otherwise you'll enumerate over every key for every series 
                    if (key.indexOf(metric) > -1) {
                       if (data_fields.hasOwnProperty(key)) {
                          //console.log("Got key: " + key + " with value: " + data_fields[key])
                          data=parseFloat(temp_line[data_fields[key]])
                          //console.log("Got value: " + data + " for data")
                          LAGER[key]['labels'][series]=1
                          if (LAGER[key]['data'][start] === undefined) {
                              LAGER[key]['data'][start] = {}
                          }
                          //console.log('Key: ' + key +', series: '+ series + ', data: ' + data)
                          LAGER[key]['data'][start][series]=data
                       }
                    }
                 }
                 break
             }
           })
        }

        reader.onloadend = function(e) {
           filecount++
           Session.set("filesLoaded",filecount)
           console.log('Filecount:  '+filecount+'  fileList.length:  '+fileList.length)
           if (filecount >= fileList.length) {
              for (var time in LAGER['LUN_IOPS']['data']) {
                 if (LAGER['LUN_IOPS']['data'].hasOwnProperty(time)) {
                    for (var lun in LAGER['LUN_IOPS']['data'][time]) {
                       if (LAGER['LUN_IOPS']['data'][time].hasOwnProperty(lun)) {
                          LAGER['BLOCK_SIZE']['labels'][lun]=1
                          if (LAGER['BLOCK_SIZE']['data'][time] === undefined) {
                             LAGER['BLOCK_SIZE']['data'][time] = {}
                          }
                          LAGER['BLOCK_SIZE']['data'][time][lun]=(LAGER['LUN_MBPS']['data'][time][lun]*1024)/LAGER['LUN_IOPS']['data'][time][lun]
                       } 
                    }
                 }
              }
              console.log('LAGER data structure')
              console.log(LAGER)
              for (var i=0; i <  LAGER.metrics.length; i++) {
                  console.log ("Graphing div:  "+LAGER.metrics[i])
                  var div=LAGER.metrics[i]
                  //console.log(LAGER[div])
                  graphit(div, LAGER[div], 100)
                }
              }
           }
        }
      }
    })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
