reportslite = new Meteor.Collection("reportslite")

LAGER = {}
LAGER.metrics=['CPU', 'CWP', 'Port_IOPS', 'Port_MBPS', 'DP_IOPS', 'DP_MBPS', 'LUN_IOPS', 'LUN_MBPS', 'LUN_TAGS', 'DISK_BUSY', 'BLOCK_SIZE']
//for (var i=0; i< LAGER.metrics.length; i++) {
   //console.log('Creating dict for LAGER:  '+LAGER.metrics[i])
   //LAGER[LAGER.metrics[i]]={}
   //LAGER[LAGER.metrics[i]]['labels']={}
   //LAGER[LAGER.metrics[i]]['data']={}
   //LAGER[LAGER.metrics[i]]['graph']={}
   //LAGER[LAGER.metrics[i]]['max']={}
   //LAGER[LAGER.metrics[i]]['average']={}
//}

if (Meteor.isClient) {

  Router.map(function() {
    this.route('home', {path: '/', template:'hello'})
  })

  function graphit (div, metric, ymax) {
    var graph_div = div +"_chart"
    var legend_div = div +"_legend"
    console.log('Now charting:  '+graph_div)
    var labels=['Time']
    var data=[]
    var times = []

    // There's gotta be a better way - but I haven't figured it out yet
    // Basically had an issue using the milliseconds from epoch as an arry index and had to change to
    // building an array of sorted timestamps and then populating a 0-indexed array with them...
    for (var time in metric['data']) {
        times.push(time)
    }

    times.sort();

    for (var key in metric['labels']) {
       labels.push(key)
       for (i=0; i < times.length; i++) {
          time=times[i]
          if (data[i] === undefined) {
             data[i]=[]
             data[i].push(new Date(parseInt(time)))
          }
          data[i].push(metric['data'][time][key])
       }
    }

    LAGER[div]['graph'] = new Dygraph(document.getElementById(graph_div),
                           data,
                           {
                             //height: 800,
                             //width: 1024,
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
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
        console.log(moment())
      for (var i=0; i <  LAGER.metrics.length; i++) {
        console.log ("Clearing div:  "+LAGER.metrics[i])
        var div=LAGER.metrics[i]
        $('#'+div+'_chart').empty()
        $('#'+div+'_legend').empty()
        console.log('Clearing dict for LAGER:  '+LAGER.metrics[i])
        LAGER[LAGER.metrics[i]]={}
        LAGER[LAGER.metrics[i]]['labels']={}
        LAGER[LAGER.metrics[i]]['data']={}
        LAGER[LAGER.metrics[i]]['graph']={}
        LAGER[LAGER.metrics[i]]['max']=new Number()
        LAGER[LAGER.metrics[i]]['average']={}
      }
      Session.set("filesCount",0)
      Session.set("filesLoaded",0)
      Session.set("serial",undefined)
    },

    'shown.bs.tab': function (e) {
        console.log("Showing tab: " + event.target)
        selected_div=$(e.target).attr("href").replace('#','')
        console.log("Resizing: " + selected_div)
        //console.log((LAGER[selected_div]['graph']))
        LAGER[selected_div]['graph'].resize()
    },


    'change input':  function() {
      var filecount = 0
      var fileList = []
      console.log(document.getElementById('input').files[0])
      console.log(document.getElementById('input').files)
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
        console.log('Now processing: '+fileList[i].name)
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
               console.log('In CPU section')
               return true
             } else if (cwp_re.test(line)) {
               metric='CWP'
               console.log('In CWP section')
               return true
             } else if (port_re.test(line)) {
               metric='Port'
               console.log('In Port section')
               return true
             } else if (dp_re.test(line)) {
               metric='DP'
               console.log('In DP section')
               return true
             } else if (lun_re.test(line)) {
               metric='LUN'
               console.log('In LUN section')
               return true
             } else if (tags_re.test(line)) {
               metric='LUN_TAGS'
               console.log('In LUN_TAGS section')
               return true
             } else if (drive_re.test(line)) {
               metric='DISK_BUSY'
               console.log('In DISK_BUSY section')
               return true
             }
             switch (metric) {
               case 'CPU':
                 //console.log(line)
                 proc_line=line.split(/\s+/)
                 proc=proc_line[0]+'-'+proc_line[1]
                 usage=parseFloat(proc_line[2])
                 LAGER[metric]['labels'][proc]=1
                 if (LAGER[metric]['data'][start] === undefined) {
                     LAGER[metric]['data'][start] = {}
                 }
                 LAGER[metric]['data'][start][proc]=usage
                 //
                 //if (LAGER[metric]['data']['max'] === undefined) {
                     //console.log("In undefined section for max")
                     //LAGER[metric]['data']['max'] = new Number()
                 //} else if (usage > LAGER[metric]['data']['max']) {
                     //LAGER[metric]['data']['max'] = usage
                 //}
                 //console.log("Setting CPU Max to: " + LAGER[metric]['data']['max'] + " for: " + proc + metric)
                 //console.log(LAGER[metric])
                 break
               case 'CWP':
                 cwp_line=line.split(/\s+/)
                 clpr=cwp_line[0]+'-'+cwp_line[1]
                 //console.log('CLPR:  '+clpr)
                 cwp=parseFloat(cwp_line[2])
                 LAGER[metric]['labels'][clpr]=1
                 if (LAGER[metric]['data'][start] === undefined) {
                     LAGER[metric]['data'][start] = {}
                 }
                 LAGER[metric]['data'][start][clpr]=cwp
                 break
               case 'Port':
                 iops_metric='Port_IOPS'
                 mbps_metric='Port_MBPS'
                 //console.log(line)
                 port_line=line.split(/\s+/)
                 //console.log(port_line)
                 port=port_line[0]+'-'+port_line[1]
                 iops=parseFloat(port_line[2])
                 mbps=parseFloat(port_line[7])
                 LAGER[iops_metric]['labels'][port]=1
                 if (LAGER[iops_metric]['data'][start] === undefined) {
                     LAGER[iops_metric]['data'][start] = {}
                 }
                 LAGER[iops_metric]['data'][start][port]=iops
                 LAGER[mbps_metric]['labels'][port]=1
                 if (LAGER[mbps_metric]['data'][start] === undefined) {
                     LAGER[mbps_metric]['data'][start] = {}
                 }
                 LAGER[mbps_metric]['data'][start][port]=mbps
                 break
               case 'DP':
                 iops_metric='DP_IOPS'
                 mbps_metric='DP_MBPS'
                 //console.log(line)
                 dp_line=line.split(/\s+/)
                 //console.log(dp_line)
                 pool=dp_line[0]+'-'+dp_line[1]
                 iops=parseFloat(dp_line[2])
                 mbps=parseFloat(dp_line[7])
                 LAGER[iops_metric]['labels'][pool]=1
                 if (LAGER[iops_metric]['data'][start] === undefined) {
                     LAGER[iops_metric]['data'][start] = {}
                 }
                 LAGER[iops_metric]['data'][start][pool]=iops
                 LAGER[mbps_metric]['labels'][pool]=1
                 if (LAGER[mbps_metric]['data'][start] === undefined) {
                     LAGER[mbps_metric]['data'][start] = {}
                 }
                 LAGER[mbps_metric]['data'][start][pool]=mbps
                 //console.log(pool, iops, mbps)
                 break
               case 'LUN':
                 iops_metric='LUN_IOPS'
                 mbps_metric='LUN_MBPS'
                 block_size_metric='BLOCK_SIZE'
                 //console.log(line)
                 lun_line=line.split(/\s+/)
                 //console.log(lun_line)
                 lun=lun_line[0]+'-'+lun_line[1]
                 iops=parseFloat(lun_line[2])
                 mbps=parseFloat(lun_line[7])
                 block_size=mbps*1024/iops
                 LAGER[iops_metric]['labels'][lun]=1
                 if (LAGER[iops_metric]['data'][start] === undefined) {
                     LAGER[iops_metric]['data'][start] = {}
                 }
                 LAGER[iops_metric]['data'][start][lun]=iops
                 //
                 LAGER[mbps_metric]['labels'][lun]=1
                 if (LAGER[mbps_metric]['data'][start] === undefined) {
                     LAGER[mbps_metric]['data'][start] = {}
                 }
                 LAGER[mbps_metric]['data'][start][lun]=mbps
                 //
                 LAGER[block_size_metric]['labels'][lun]=1
                 if (LAGER[block_size_metric]['data'][start] === undefined) {
                     LAGER[block_size_metric]['data'][start] = {}
                 }
                 LAGER[block_size_metric]['data'][start][lun]=block_size
                 //console.log(lun, iops, mbps)
                 break
               case 'LUN_TAGS':
                 tag_line=line.split(/\s+/)
                 lun=tag_line[0]+'-'+tag_line[1]
                 tags=parseFloat(tag_line[2])
                 LAGER[metric]['labels'][lun]=1
                 if (LAGER[metric]['data'][start] === undefined) {
                     LAGER[metric]['data'][start] = {}
                 }
                 LAGER[metric]['data'][start][lun]=tags
                 break
               case 'DISK_BUSY':
                 //console.log(line)
                 drive_line=line.split(/\s+/)
                 //console.log(drive_line)
                 drive=drive_line[0]+'-'+drive_line[1]+'-'+drive_line[2]
                 busy=parseFloat(drive_line[3])
                 //console.log(drive, busy)
                 LAGER[metric]['labels'][drive]=1
                 if (LAGER[metric]['data'][start] === undefined) {
                     LAGER[metric]['data'][start] = {}
                 }
                 LAGER[metric]['data'][start][drive]=busy
                 break
             }
           })
        }

        reader.onloadend = function(e) {
           filecount++
           Session.set("filesLoaded",filecount)
           //console.log('Filecount:  '+filecount+'  fileList.length:  '+fileList.length)
           if (filecount >= fileList.length) {
              console.log('LAGER data structure')
              console.log(LAGER)
              for (var i=0; i <  LAGER.metrics.length; i++) {
                  console.log ("Graphing div:  "+LAGER.metrics[i])
                  var div=LAGER.metrics[i]
                  console.log(LAGER[div])
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
