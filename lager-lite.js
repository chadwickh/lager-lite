var cpu_usage = {}
var cwp_usage = {}
var port_iops = {}
var port_mbps = {}
var dp_iops = {}
var dp_mbps = {}
var lun_iops = {}
var lun_mbps = {}
var lun_tags = {}
var disk_busy = {}
var divs=['CPU', 'CWP', 'Port_IOPS', 'Port_MBPS', 'DP_IOPS', 'DP_MBPS', 'LUN_IOPS', 'LUN_MBPS', 'LUN_TAGS', 'DISK_BUSY']

if (Meteor.isClient) {

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
          return ''
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
      for (var i=0; i <  divs.length; i++) {
        console.log ("Clearing div:  "+divs[i])
        var div=divs[i]
        $.plot($('#'+div+'_chart'),[],{legend: {show: false}})
        $('#'+div+'_chart').empty()
        $('#'+div+'_legend').empty()
      }
      Session.set("filesCount",0)
      Session.set("filesLoaded",0)
      Session.set("serial",undefined)
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
          section=''
          var lines = e.target.result.split('\n')
          $.each(lines, function() {
             line=this.replace(/^\s+/,'')
             if (section_re.test(line)) {
               section=''
             }
             if (start_re.test(line)) {
               sample=parseInt(line.split('.')[1])-1
               console.log('Now processing sample:  ' + sample)
             } else if (date_re.test(line)) {
               info = line.split('-')
               start = new Date(info[0].replace(/\s+$/,'').replace('"',''))
               end = new Date(info[1].replace(/\s+$/,'').replace('"',''))
               //start = moment(info[0],"YYYY/MM/DD HH:mm:ss").valueOf()
               //end = moment(info[1],"YYYY/MM/DD HH:mm:ss").valueOf()
               serial = info[2].split(':')[1]
               Session.set("serial", serial)
               console.log('Processing array:  '+serial+'  from:  '+start+' to:  '+end)
             } else if (proc_re.test(line)) {
               section='CPU'
               console.log('In CPU section')
               // Crazy jQuery stuff to go to next iteration
               return true
             } else if (cwp_re.test(line)) {
               section='CWP'
               console.log('In CWP section')
               return true
             } else if (port_re.test(line)) {
               section='Port'
               console.log('In Port section')
               return true
             } else if (dp_re.test(line)) {
               section='DP'
               console.log('In DP section')
               return true
             } else if (lun_re.test(line)) {
               section='LUN'
               console.log('In LUN section')
               return true
             } else if (tags_re.test(line)) {
               section='TAG'
               console.log('In TAG section')
               return true
             } else if (drive_re.test(line)) {
               section='DRIVE'
               console.log('In DRIVE section')
               return true
             }
             switch (section) {
               case 'CPU':
                 //console.log(line)
                 proc_line=line.split(/\s+/)
                 proc=proc_line[0]+'-'+proc_line[1]
                 usage=parseFloat(proc_line[2])
                 //console.log("CPU:  "+proc+"  Usage:  "+usage)
                 if (cpu_usage[proc] === undefined) {
                    cpu_usage[proc] = {}
                    cpu_usage[proc]['label']=proc
                    cpu_usage[proc]['data']=[]
                 }
                 cpu_usage[proc]['data'][sample]=[start,usage]
                 break
               case 'CWP':
                 cwp_line=line.split(/\s+/)
                 clpr=cwp_line[0]+'-'+cwp_line[1]
                 //console.log('CLPR:  '+clpr)
                 cwp=parseFloat(cwp_line[2])
                 if (cwp_usage[clpr] === undefined) {
                    cwp_usage[clpr] = {}
                    cwp_usage[clpr]['label']=clpr
                    cwp_usage[clpr]['data']=[]
                 }
                 cwp_usage[clpr]['data'][sample]=[start,cwp]
                 break
               case 'Port':
                 //console.log(line)
                 port_line=line.split(/\s+/)
                 //console.log(port_line)
                 port=port_line[0]+'-'+port_line[1]
                 iops=parseFloat(port_line[2])
                 mbps=parseFloat(port_line[7])
                 //console.log(port, iops, mbps)
                 if (port_iops[port] === undefined) {
                    port_iops[port] = {}
                    port_iops[port]['label']=port
                    port_iops[port]['data']=[]
                 }
                 port_iops[port]['data'][sample]=[start,iops]
                 if (port_mbps[port] === undefined) {
                    port_mbps[port] = {}
                    port_mbps[port]['label']=port
                    port_mbps[port]['data']=[]
                 }
                 port_mbps[port]['data'][sample]=[start,mbps]
                 break
               case 'DP':
                 //console.log(line)
                 dp_line=line.split(/\s+/)
                 //console.log(dp_line)
                 pool=dp_line[0]+'-'+dp_line[1]
                 iops=parseFloat(dp_line[2])
                 mbps=parseFloat(dp_line[7])
                 //console.log(pool, iops, mbps)
                 if (dp_iops[pool] === undefined) {
                    dp_iops[pool] = {}
                    dp_iops[pool]['label']=pool
                    dp_iops[pool]['data']=[]
                 }
                 dp_iops[pool]['data'][sample]=[start,iops]
                 if (dp_mbps[pool] === undefined) {
                    dp_mbps[pool] = {}
                    dp_mbps[pool]['label']=pool
                    dp_mbps[pool]['data']=[]
                 }
                 dp_mbps[pool]['data'][sample]=[start,mbps]
                 break
               case 'LUN':
                 //console.log(line)
                 lun_line=line.split(/\s+/)
                 //console.log(lun_line)
                 lun=lun_line[0]+'-'+lun_line[1]
                 iops=parseFloat(lun_line[2])
                 mbps=parseFloat(lun_line[7])
                 //console.log(lun, iops, mbps)
                 if (lun_iops[lun] === undefined) {
                    lun_iops[lun] = {}
                    lun_iops[lun]['label']=lun
                    lun_iops[lun]['data']=[]
                 }
                 lun_iops[lun]['data'][sample]=[start,iops]
                 if (lun_mbps[lun] === undefined) {
                    lun_mbps[lun] = {}
                    lun_mbps[lun]['label']=lun
                    lun_mbps[lun]['data']=[]
                 }
                 lun_mbps[lun]['data'][sample]=[start,mbps]
                 break
               case 'TAG':
                 tag_line=line.split(/\s+/)
                 lun=tag_line[0]+'-'+tag_line[1]
                 tags=parseFloat(tag_line[2])
                 if (lun_tags[lun] === undefined) {
                    lun_tags[lun] = {}
                    lun_tags[lun]['label']=lun
                    lun_tags[lun]['data']=[]
                 }
                 lun_tags[lun]['data'][sample]=[start,tags]
                 break
               case 'DRIVE':
                 //console.log(line)
                 drive_line=line.split(/\s+/)
                 //console.log(drive_line)
                 drive=drive_line[0]+'-'+drive_line[1]+'-'+drive_line[2]
                 busy=parseFloat(drive_line[3])
                 //console.log(drive, busy)
                 if (disk_busy[drive] === undefined) {
                    disk_busy[drive] = {}
                    disk_busy[drive]['label']=drive
                    disk_busy[drive]['data']=[]
                 }
                 disk_busy[drive]['data'][sample]=[start,busy]
                 break
             }
           })
        }

        reader.onloadend = function(e) {
           var cpu_data = []
           var dygraph_cpu_data = []
           var dygraph_cpu_labels = []
           var cwp_data = []
           var port_iops_data = []
           var port_mbps_data = []
           var dp_iops_data = []
           var dp_mbps_data = []
           var lun_iops_data = []
           var lun_mbps_data = []
           var tag_data = []
           var disk_busy_data = []
           filecount++
           Session.set("filesLoaded",filecount)
           //console.log('Filecount:  '+filecount+'  fileList.length:  '+fileList.length)
           if (filecount >= fileList.length) {
              for (var key in cpu_usage) {
                 cpu_data.push(cpu_usage[key])
              }
              dygraph_cpu_labels.push("time")
              for (var key in cpu_usage) {
                 dygraph_cpu_labels.push(key)
                 for (var time in cpu_usage[key]['data']) {
                    if (dygraph_cpu_data[time] === undefined) {
                       dygraph_cpu_data[time]=[]
                       dygraph_cpu_data[time].push(cpu_usage[key]['data'][time][0])
                    }
                    dygraph_cpu_data[time].push(cpu_usage[key]['data'][time][1])
                 }
              }
              console.log(cpu_usage)
              console.log(dygraph_cpu_labels)
              console.log(dygraph_cpu_data)
              var cpu_graph= new Dygraph(document.getElementById('CPU_chart'),dygraph_cpu_data,{labels:dygraph_cpu_labels,hideOverlayOnMouseOut: false, valueRange: [0,100], labelsDiv: 'CPU_legend',drawAxesAtZero: true,labelsSeparateLines:true, yRangePad: 1,xRangePad: 10, underlayCallback: function(canvas, area, cpu_graph) { var bottom_left = cpu_graph.toDomCoords(area.x,50); var top_right = cpu_graph.toDomCoords(cpu_graph.xAxisExtremes()[1],70); var left = bottom_left[0]; var right = top_right[0]; canvas.fillStyle = "rgba(255, 253, 208, 1.0)"; canvas.fillRect(left, bottom_left[1], right-left+200, top_right[1]-bottom_left[1]);}})
              //$.plot($('#CPU_chart'), cpu_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, tooltip: true, yaxis: {min:0, max: 100}, grid: {hoverable: true, markings: [ {yaxis: {from: 50, to:70}, color: "#fffdd1"}, {yaxis: {from: 70, to:100}, color: "#ff99ac"}]}})
              for (var key in cwp_usage) {
                 cwp_data.push(cwp_usage[key])
              }
              $.plot($('#CWP_chart'), cwp_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, tooltip: true, yaxis: {min:0, max: 100}, grid: {hoverable: true, markings: [ {yaxis: {from: 15, to:20}, color: "#fffdd1"}, {yaxis: {from: 20, to:100}, color: "#ff99ac"}]}})
              for (var key in port_iops) {
                 port_iops_data.push(port_iops[key])
                 port_mbps_data.push(port_mbps[key])
              }
              $.plot($('#Port_IOPS_chart'), port_iops_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, grid: {hoverable: true}, tooltip: true})
              $.plot($('#Port_MBPS_chart'), port_mbps_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, grid: {hoverable: true}, tooltip: true})
              for (var key in dp_iops) {
                 dp_iops_data.push(dp_iops[key])
                 dp_mbps_data.push(dp_mbps[key])
              }
              $.plot($('#DP_IOPS_chart'), dp_iops_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, grid: {hoverable: true}, tooltip: true})
              $.plot($('#DP_MBPS_chart'), dp_mbps_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, grid: {hoverable: true}, tooltip: true})
              for (var key in lun_iops) {
                 lun_iops_data.push(lun_iops[key])
                 lun_mbps_data.push(lun_mbps[key])
              }
              $.plot($('#LUN_IOPS_chart'), lun_iops_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, grid: {hoverable: true}, tooltip: true})
              $.plot($('#LUN_MBPS_chart'), lun_mbps_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, grid: {hoverable: true}, tooltip: true})
              for (var key in lun_tags) {
                 tag_data.push(lun_tags[key])
              }
              $.plot($('#LUN_TAGS_chart'), tag_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, selection: { mode: "xy"}, tooltip: true,  grid: {hoverable: true, markings: [ {yaxis: {from: 32}, color: "#ff99ac"}]}}) 
              for (var key in disk_busy) {
                 disk_busy_data.push(disk_busy[key])
              }
              $.plot($('#DISK_BUSY_chart'), disk_busy_data,{xaxis: {mode: "time", timeformat: "%Y/%m/%d %h:%M"}, yaxis: {min:0, max:100}, selection: { mode: "xy"}, tooltip: true,  grid: {hoverable: true, markings: [ {yaxis: {from: 50, to:70}, color: "#fffdd1"}, {yaxis: {from: 70, to:100}, color: "#ff99ac"}]}})
           }
        }
      }
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
