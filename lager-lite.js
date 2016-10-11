Reportslite = new Meteor.Collection("reportslite")
Summary = new Meteor.Collection("summary")

Meteor.methods({
  returnReport: function(reportsId,owner) {
    return Reportslite.findOne({_id:reportsId,owner:owner})
  }
})


LAGER = {}
GRAPHS= {}
LAGER.metrics=['CPU', 'CWP', 'Port_IOPS', 'Port_MBPS', 'DP_IOPS', 'DP_READ_IOPS', 'DP_WRITE_IOPS', 'DP_MBPS', 'DP_READ_MBPS', 'DP_WRITE_MBPS', 'LUN_IOPS', 'LUN_READ_IOPS', 'LUN_WRITE_IOPS', 'LUN_MBPS', 'LUN_READ_MBPS', 'LUN_WRITE_MBPS', 'LUN_TAGS', 'LUN_RESPONSE', 'LUN_READ_RESPONSE', 'LUN_WRITE_RESPONSE', 'DISK_BUSY', 'BLOCK_SIZE', 'READ_PERCENT', 'BACK_END', 'READ_IOPS', 'FRONT_IOPS', 'BACKEND_IOPS']
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
    selected_div=split_div.slice(0,-1).join('_')
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

<<<<<<< HEAD
processZip = function(inputZip) {
  //console.log("In process zip with input:");
  //console.log(inputZip);
  var zip = inputZip;
  for (var fileInZip in zip.files) {
    //console.log(fileInZip);
    if (/\/$/.test(fileInZip)) {
      //console.log("Is a directory, skipping...")
    } else if ((/\.ZIP$/.test(fileInZip)) || (/\.zip$/.test(fileInZip))) {
      //console.log("Nested Zip file - recursing");
      var nestedZip = new JSZip(zip.file(fileInZip).asArrayBuffer());
      processZip(nestedZip);
    } else {
      //console.log(typeof(fileInZip));
      var lines = zip.file(fileInZip).asText().split('\n');
      //console.log("First line of file is:");
      //console.log(lines[0]);
      if (/^No\./.test(lines[0])) {
        //console.log("This is pfm data - processing");
        process_ams(lines);
      } else {
        //console.log("This is data from Export Tool - processing");
      }
    }
  }
}

buildCSV = function(LAGER) {
  var zip = new JSZip();
  var zipOut="";
  //console.log("In buildCSV with input:");
  //console.log(LAGER);
  for (var metric in LAGER) {
    //console.log(metric);
    var header="Time";
    if ((LAGER[metric]) && (LAGER[metric]['labels'])) {
      for (var label in LAGER[metric]['labels']) {
        //console.log(label);
        header=header+",'"+label+"'";
      }
      header=header+"\n";
      zipOut=header;
    //console.log(header);
        for (var time in LAGER[metric]['data']) {
          var outTime=moment.unix(time/1000).format("MM/DD/YYYY HH:mm");
          //console.log(time);
          //console.log(outTime);
          var data="";
          data=data+outTime+",";
          for (var label in LAGER[metric]['labels']) {
            data=data+LAGER[metric]['data'][time][label]+",";  
          }
          data=data+"\n";
          zipOut=zipOut+data;
          //console.log(zipOut);
      }
      zip.file(metric+".csv", zipOut)
    }
  }
  var content = zip.generate({type:"blob"});
  saveAs(content,"lager-lite.zip");
}

=======
>>>>>>> 2abc776181efce46f5c9deecc00e5fb9920d4eae
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
    'click .submitFiles':  function(event) {
      console.log("Starting...")
      console.log(moment().format());
      event.preventDefault()
      //var filecount = 0
      //var fileList = []
      filecount=0;
      fileList = document.getElementById('loadFiles').files;
      Session.set("filesCount",fileList.length)

      for (i=0; i < fileList.length; i++) {
        var reader = new FileReader()
        var zipReader = new FileReader()
        console.log(fileList[i].type);

<<<<<<< HEAD
        if ((fileList[i].type === "application/x-zip-compressed") || (fileList[i].type === "application/zip")) {
=======
        if (fileList[i].type === "application/x-zip-compressed") {
>>>>>>> 2abc776181efce46f5c9deecc00e5fb9920d4eae
          console.log("This is a zip file");
          console.log(fileList[i].name);
          zipReader.readAsArrayBuffer(fileList[i]);
          console.log("File read");
        } else {
          reader.readAsText(fileList[i])
        }
<<<<<<< HEAD

        zipReader.onload = function (e) {
          //console.log("In zipReader onload section");
          var zip = new JSZip(e.target.result);
          // We're calling a recursive function to process zip files - since they can be nested this seems
          // like an ideal use case
          processZip(zip);
        }

=======

        zipReader.onload = function (e) {
          console.log("In zipReader onload section");
          var zip = new JSZip(e.target.result);
          //console.log(zip.files);
          for (var fileInZip in zip.files) {
            console.log(fileInZip);
            //console.log(zip.file(fileInZip).asText());
            if (/\/$/.test(fileInZip)) {
              console.log("Is a directory, skipping...")
            } else if ((/\.ZIP$/.test(fileInZip)) || (/\.zip$/.test(fileInZip))) {
              console.log("Nested Zip file");
            } else {
              console.log(typeof(fileInZip));
              var lines = zip.file(fileInZip).asText().split('\n');
            //reader.readAsText(zip.file(fileInZip).asArrayBuffer());
              process_ams(lines);
            }
          }
        }

>>>>>>> 2abc776181efce46f5c9deecc00e5fb9920d4eae
        zipReader.onloadend = function(e) {
          postprocess_ams();
          console.log(moment().format());
          console.log("Ended");
<<<<<<< HEAD
          //buildCSV(LAGER);
=======
>>>>>>> 2abc776181efce46f5c9deecc00e5fb9920d4eae
        }

        reader.onload = function(e) {
          console.log("In reader.onload section");
          metric=''
          var lines = e.target.result.split('\n')
          process_ams(lines);
        }

        reader.onloadend = function(e) {
          postprocess_ams();
          console.log(moment().format());
          console.log("Ended");
<<<<<<< HEAD
          //buildCSV(LAGER);
=======
>>>>>>> 2abc776181efce46f5c9deecc00e5fb9920d4eae
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
