Reportslite = new Meteor.Collection("reportslite")
Summary = new Meteor.Collection("summary")

Meteor.methods({
  returnReport: function(reportsId,owner) {
    return Reportslite.findOne({_id:reportsId,owner:owner})
  }
})


LAGER = {}
GRAPHS= {}
LAGER.metrics=['CPU', 'CWP', 'Port_IOPS', 'Port_MBPS', 'DP_IOPS', 'DP_MBPS', 'LUN_IOPS', 'LUN_MBPS', 'LUN_TAGS', 'LUN_RESPONSE', 'LUN_READ_RESPONSE', 'LUN_WRITE_RESPONSE', 'DISK_BUSY', 'BLOCK_SIZE', 'READ_PERCENT', 'BACK_END', 'READ_IOPS', 'FRONT_IOPS', 'BACKEND_IOPS']
  for (var i=0; i <  LAGER.metrics.length; i++) {
    var div=LAGER.metrics[i]
    LAGER[LAGER.metrics[i]]={}
    LAGER[LAGER.metrics[i]]['labels']={}
    LAGER[LAGER.metrics[i]]['data']={}
    LAGER[LAGER.metrics[i]]['max']={}
    LAGER[LAGER.metrics[i]]['sum']={}
    LAGER[LAGER.metrics[i]]['average']={}
    LAGER[LAGER.metrics[i]]['count']={}
    GRAPHS[LAGER.metrics[i]]={}
    GRAPHS[LAGER.metrics[i]]['graph']={}
  }

if (Meteor.isClient) {

  Meteor.subscribe("summary")

  Router.map(function() {
    this.route('home', {path: '/', template:'hello'});
    //this.route('view', {path: '/view', template:'view', data: function() {console.log(Meteor.userId()); summary: Summary.find({owner:Meteor.userId()})}})
    this.route('view', {path: '/view', template:'view', data: {summary: Summary.find({owner:Meteor.userId()})}});
    this.route('display', {path: '/display/:reportsId', template: 'display', data: function() {Session.set('reportsId', this.params.reportsId)}});
  })

stackchange = function(el) {
    split_div=$(el).attr('id').split('_')
    console.log(split_div)
    selected_div=split_div.slice(0,2).join('_')
    console.log(selected_div)
    if (el.checked) {
      //console.log("Checked")
      //console.log(el)
      GRAPHS[selected_div]['graph'].updateOptions({
        stackedGraph: true
      })
    } else {
      //console.log("Not Checked")
      //console.log(el)
      GRAPHS[selected_div]['graph'].updateOptions({
        stackedGraph: false
      })
    }
  }

  function graphit (div, metric, ymax) {
    var graph_div = div +"_chart"
    var legend_div = div +"_legend"
    var labels=['Time']
    var data=[]
    var times = []
    //console.log('In graphit function')
    //console.log(metric)

    // There's gotta be a better way - but I haven't figured it out yet
    // Basically had an issue using the milliseconds from epoch as an arry index and had to change to
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

    //console.log("Data for Div")
    //console.log(div)
    //console.log(data)

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

  Template.hello.helpers({
    uploadPercent: function() {
       filesCount = Session.get("filesCount")
       //console.log('filesCount:  '+filesCount)
       filesLoaded = Session.get("filesLoaded")
       //console.log('filesLoaded:  '+filesLoaded)
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

  Template.display.events({
    'shown.bs.tab': function (e) {
        selected_div=$(e.target).attr("href").replace('#','')
        GRAPHS[selected_div]['graph'].resize()
    }
  })

  Template.display.rendered=function() {
    reportsId=Session.get("reportsId")
    console.log(reportsId)
    Meteor.call("returnReport", reportsId, Meteor.userId(), function(error, result) {
      if(error) {
        console.log(error.reason)
      } else {
        LAGER=result
        if (result.metrics.length > 0) {
          for (var i=0; i <  result.metrics.length; i++) {
            GRAPHS[result.metrics[i]]={} 
            GRAPHS[result.metrics[i]]['graph']={} 
            //console.log ("Graphing div:  "+result.metrics[i])
            var div=result.metrics[i]
            //console.log(LAGER[div])
            graphit(div, result[div], 100)
          }
        }
      }
    })
    //LAGER=returnReport(reportsId)
    //LAGER=report(reportsId)
    //console.log(LAGER)
  }


  Template.hello.greeting = function () {
    return "Welcome to lager-lite.";
  };

  Template.hello.events({
    'click .loadFiles': function () {
      //console.log(Meteor.user())
      if (Meteor.user() !== "undefined") {
         LAGER['owner']=Meteor.userId()
         console.log(LAGER['owner'])
      }
      for (var i=0; i <  LAGER.metrics.length; i++) {
        var div=LAGER.metrics[i]
        $('#'+div+'_chart').empty()
        $('#'+div+'_legend').empty()
        LAGER[LAGER.metrics[i]]={}
        LAGER[LAGER.metrics[i]]['labels']={}
        LAGER[LAGER.metrics[i]]['data']={}
        LAGER[LAGER.metrics[i]]['max']={}
        LAGER[LAGER.metrics[i]]['sum']={}
        LAGER[LAGER.metrics[i]]['average']={}
        LAGER[LAGER.metrics[i]]['count']={}
        GRAPHS[LAGER.metrics[i]]={}
        GRAPHS[LAGER.metrics[i]]['graph']={}
      }
      // Uncheck all checkboxes
      $('.checkbox1').each(function() {
        this.checked = false;
      })
      // Set filesCount to 1 even though we have 0 files (avoid divide by 0 error)
      Session.set("filesCount",1)
      Session.set("filesLoaded",0)
      Session.set("serial",undefined)
    },

    'click .saveButton' : function() {
      console.log("In insert section")
      // Inserts kept giving me a circular reference error before I added this
      // And this would keep them from resizing on selection so we added GRAPHS
      // data structure...
      //for (var i=0; i <  LAGER.metrics.length; i++) {
        //LAGER[LAGER.metrics[i]]['graph']={}
      //}
      description=$('#saveDescription').val()
      console.log(description)
      LAGER['description']=description
      console.log(moment(LAGER['start']).format("MM/DD/YYYY HH:mm"))
      console.log(moment(LAGER['end']).format("MM/DD/YYYY HH:mm"))
      //console.log(LAGER)
      reportsId=Reportslite.insert(LAGER, function(err, docId) {
        if(err) {console.log(err)}
        else {
          return docId
        }
      })
      console.log(reportsId)
      Summary.insert({'serial':Session.get('serial'), 'start':moment(LAGER['start']).format("MM/DD/YYYY HH:mm"), 'end':moment(LAGER['end']).format("MM/DD/YYYY HH:mm"), 'description':LAGER['description'], 'reportsId':reportsId, 'owner':LAGER['owner']}, function(err) {
        if(err) {console.log(err)}
      })
      //Reportslite.insert({'foobie': 'bletch'})
    },

    'shown.bs.tab': function (e) {
        selected_div=$(e.target).attr("href").replace('#','')
        GRAPHS[selected_div]['graph'].resize()
    },


    // Changed this from a change event to try and speed things up
    // as well as deal with the case where it's the same filelist repeatedly
    'click .submitFiles':  function() {
      event.preventDefault()
      var filecount = 0
      var fileList = []
      var data_fields = {}
      fileList = document.getElementById('loadFiles').files
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
      var read_count2_re = /^CTL    LU   Read CMD Hit Count2/
      var write_count2_re = /^CTL    LU  Write CMD Hit Count2/
      var read_miss_re = /^CTL    LU   Read CMD Miss Count/
      var write_miss_re = /^CTL    LU  Write CMD Miss Count/
      var read_job_re = /^CTL    LU    Read CMD Job Count/
      var write_job_re = /^CTL    LU   Write CMD Job Count/
      var backend_re = /^CTL Path        IO Rate\(IOPS\)/

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
               //console.log('Now processing sample:  ' + sample)
             } else if (date_re.test(line)) {
               info = line.split('-')
               //start = new Date(info[0].replace(/\s+$/,'').replace('"',''))
               //end = new Date(info[1].replace(/\s+$/,'').replace('"',''))
               start = moment(info[0],"YYYY/MM/DD HH:mm:ss").valueOf()
               if (LAGER['start'] === undefined) {
                 LAGER['start'] = start
               } else if (start < LAGER['start']) {
                 LAGER['start'] = start
               }
               end = moment(info[1],"YYYY/MM/DD HH:mm:ss").valueOf()
               // we track the largest start # because we're using the start for the timestamp
               // and we'll never have the last number in the dataset
               if (LAGER['end'] === undefined) {
                 LAGER['end'] = start
               } else if (start > LAGER['end']) {
                 LAGER['end'] = start
               }
               serial = info[2].split(':')[1]
               LAGER['serial']=serial
               Session.set("serial", serial)
               //console.log('Processing array:  '+serial+'  from:  '+start+' to:  '+end)
             } else if (proc_re.test(line)) {
               metric='CPU'
               // series_fields is an array of fields to concatenate with dashes to build the 
               // series name
               series_fields=[0,1]
               // data_fields is a hash with the key being the metric name and the value
               // the field from the line to use
               data_fields[metric]=[2]
               //console.log('In CPU section')
               return true
             } else if (cwp_re.test(line)) {
               metric='CWP'
               series_fields=[0,1]
               data_fields[metric]=[2]
               //console.log('In CWP section')
               return true
             } else if (port_re.test(line)) {
               metric='Port'
               series_fields=[0,1]
               data_fields[metric+'_IOPS']=[2]
               data_fields[metric+'_MBPS']=[7]
               //console.log('In Port section')
               return true
             } else if (dp_re.test(line)) {
               metric='DP'
               series_fields=[0,1]
               data_fields[metric+'_IOPS']=[2]
               data_fields[metric+'_MBPS']=[7]
               //console.log('In DP section')
               return true
             } else if (lun_re.test(line)) {
               metric='LUN'
               series_fields=[0,1]
               data_fields[metric+'_IOPS']=[2]
               data_fields[metric+'_MBPS']=[7]
               //console.log('In LUN section')
               return true
             } else if (tags_re.test(line)) {
               metric='LUN_TAGS'
               series_fields=[0,1]
               data_fields[metric]=[2]
               //console.log('In LUN_TAGS section')
               return true
             } else if (drive_re.test(line)) {
               metric='DISK_BUSY'
               series_fields=[0,1,2]
               data_fields[metric]=[3]
               //console.log('In DISK_BUSY section')
               return true
             } else if ((read_count2_re.test(line)) || (read_miss_re.test(line)) || (read_job_re.test(line))) {
               metric='LUN_READ_RESPONSE'
               series_fields=[0, 1]
               count_field=2
               response_field=3
               return true
             } else if ((write_count2_re.test(line)) || (write_miss_re.test(line))|| (write_job_re.test(line))) {
               metric='LUN_WRITE_RESPONSE'
               series_fields=[0, 1]
               count_field=2
               response_field=3
               return true
             } else if (backend_re.test(line)) {
               console.log('Matched back-end pattern')
               console.log(line)
               metric='BACKEND_IOPS'
               series_fields=[0,1]
               data_fields[metric]=2
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
                 // We'll build the read, write and front vs. backend values here and then calculate
                 // them on finishA
                 if (metric === 'Port') {
                   console.log('Building read vs. write using Port data')
                   LAGER['READ_IOPS']['labels'][serial]=1
                   if (LAGER['READ_IOPS']['data'][start] === undefined) {
                     LAGER['READ_IOPS']['data'][start]={}
                     LAGER['READ_IOPS']['data'][start][serial]=0
                   }
                   LAGER['READ_IOPS']['data'][start][serial] += parseFloat(temp_line[3])
                   //
                   LAGER['FRONT_IOPS']['labels'][serial]=1
                   if (LAGER['FRONT_IOPS']['data'][start] === undefined) {
                     LAGER['FRONT_IOPS']['data'][start]={}
                     LAGER['FRONT_IOPS']['data'][start][serial]=0
                   }
                   LAGER['FRONT_IOPS']['data'][start][serial] += parseFloat(temp_line[2])
                   //console.log(temp_line)
                   //console.log(start + ' reads ' + LAGER['READ_IOPS'][start])
                 }
                 break
               case 'BACKEND_IOPS':
                 temp_line=line.split(/\s+/)
                 //console.log(line)
                 //console.log(temp_line)
                 //console.log('Building BACKEND_IOPS')
                 LAGER['BACKEND_IOPS']['labels'][serial]=1
                 if (LAGER['BACKEND_IOPS']['data'][start] === undefined) {
                   LAGER['BACKEND_IOPS']['data'][start]={}
                   LAGER['BACKEND_IOPS']['data'][start][serial]=0
                 }
                 //console.log(temp_line)
                 LAGER['BACKEND_IOPS']['data'][start][serial] += parseFloat(temp_line[2])
                 break
               case 'LUN_READ_RESPONSE':
               case 'LUN_WRITE_RESPONSE':
                 //console.log(metric)
                 temp_line=line.split(/\s+/)
                 series=temp_line[series_fields[0]]
                 //console.log("Setting series to:  " + series)
                 if (series_fields.length > 0) {
                    for (i=1; i < series_fields.length; i++) {
                       series=series+"-"+temp_line[series_fields[i]]
                       //console.log("Setting series to:  " + series)
                    }
                 }
                 if(LAGER[metric]['count'][start] === undefined) {
                    LAGER[metric]['count'][start] = {}
                 }
                 if (LAGER[metric]['count'][start][series] === undefined) {
                    LAGER[metric]['count'][start][series] = parseFloat(temp_line[count_field])
                 } else {
                   LAGER[metric]['count'][start][series] += parseFloat(temp_line[count_field])
                 }
                 //console.log(series + ' count: ' + LAGER[metric]['count'][start][series])


                 if(LAGER[metric]['sum'][start] === undefined) {
                   LAGER[metric]['sum'][start] = {}
                 }
                 if (LAGER[metric]['sum'][start][series] === undefined) {
                   LAGER[metric]['sum'][start][series] = parseFloat(temp_line[count_field]) * parseFloat(temp_line[response_field])
                 } else {
                   LAGER[metric]['sum'][start][series] += parseFloat(temp_line[count_field]) * parseFloat(temp_line[response_field])
                 }
                 //console.log(series + ' sum: ' + LAGER[metric]['sum'][start][series])
             }
           })
        }

        reader.onloadend = function(e) {
           filecount++
           Session.set("filesLoaded",filecount)
           //console.log('Filecount:  '+filecount+'  fileList.length:  '+fileList.length)
           if (filecount >= fileList.length) {
              for (var time in LAGER['LUN_IOPS']['data']) {
                 //console.log(time)
                 //console.log( LAGER['READ_IOPS']['data'][time][serial] + '/' +  LAGER['FRONT_IOPS']['data'][time][serial])
                 if (LAGER['READ_PERCENT']['data'][time] === undefined) {
                   LAGER['READ_PERCENT']['data'][time] = {}
                 }
                 LAGER['READ_PERCENT']['data'][time][serial] = LAGER['READ_IOPS']['data'][time][serial] / LAGER['FRONT_IOPS']['data'][time][serial]
                 LAGER['READ_PERCENT']['labels'][serial]=1
                 if (LAGER['BACK_END']['data'][time] === undefined) {
                   LAGER['BACK_END']['data'][time] = {}
                 }
                 LAGER['BACK_END']['data'][time][serial] = LAGER['BACKEND_IOPS']['data'][time][serial] / LAGER['FRONT_IOPS']['data'][time][serial]
                 LAGER['BACK_END']['labels'][serial]=1
                 if (LAGER['LUN_IOPS']['data'].hasOwnProperty(time)) {
                    for (var lun in LAGER['LUN_IOPS']['data'][time]) {
                       if (LAGER['LUN_IOPS']['data'][time].hasOwnProperty(lun)) {
                          // Because the pfm files are regular we can use the same indices for multiple calculations
                          LAGER['BLOCK_SIZE']['labels'][lun]=1
                          if (LAGER['BLOCK_SIZE']['data'][time] === undefined) {
                             LAGER['BLOCK_SIZE']['data'][time] = {}
                          }
                          LAGER['BLOCK_SIZE']['data'][time][lun]=(LAGER['LUN_MBPS']['data'][time][lun]*1024)/LAGER['LUN_IOPS']['data'][time][lun]
                          // Read response
                          LAGER['LUN_READ_RESPONSE']['labels'][lun]=1
                          if (LAGER['LUN_READ_RESPONSE']['data'][time] === undefined) {
                             LAGER['LUN_READ_RESPONSE']['data'][time] = {}
                          }
                          LAGER['LUN_READ_RESPONSE']['data'][time][lun] = LAGER['LUN_READ_RESPONSE']['sum'][time][lun] / LAGER['LUN_READ_RESPONSE']['count'][time][lun]
                          
                          // Write response
                          LAGER['LUN_WRITE_RESPONSE']['labels'][lun]=1
                          if (LAGER['LUN_WRITE_RESPONSE']['data'][time] === undefined) {
                             LAGER['LUN_WRITE_RESPONSE']['data'][time] = {}
                          }
                          LAGER['LUN_WRITE_RESPONSE']['data'][time][lun] = LAGER['LUN_WRITE_RESPONSE']['sum'][time][lun] / LAGER['LUN_WRITE_RESPONSE']['count'][time][lun]
                          // Total response
                          LAGER['LUN_RESPONSE']['labels'][lun]=1
                          if (LAGER['LUN_RESPONSE']['data'][time] === undefined) {
                             LAGER['LUN_RESPONSE']['data'][time] = {}
                          }
                          LAGER['LUN_RESPONSE']['data'][time][lun] = (LAGER['LUN_WRITE_RESPONSE']['sum'][time][lun] + LAGER['LUN_READ_RESPONSE']['sum'][time][lun]) / (LAGER['LUN_WRITE_RESPONSE']['count'][time][lun] +  LAGER['LUN_READ_RESPONSE']['count'][time][lun])
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
                  if ((div != 'READ_IOPS') && (div != 'FRONT_IOPS') && (div != 'BACKEND_IOPS')) {
                    graphit(div, LAGER[div], 100)
                  }
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

  Meteor.publish("summary",  function () {
    return Summary.find({})
  })
  
  Meteor.publish("reportslite",  function () {
    return Reportslite.find({})
  })

  Summary.allow({
    insert: function(userId, doc) {
      return true
    } 
  })

  Reportslite.allow({
    insert: function(userId, doc) {
      return true
    } 
  })

}
