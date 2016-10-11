// perf_ams.js - build data structure for AMS pfm files
  var data_fields = {};

  var start_re = /^No\./;
  var date_re = /^20[0-9][0-9]\/[01][0-9]\//;
  var proc_re = /^CTL Core Usage\(%\)/;
  var cwp_re = /^CTL Partition Write Pending Rate\(%\)/;
  var port_re = /^CTL  Port        IO Rate\(IOPS\)/;
  var dp_re = /^CTL DP Pool        IO Rate\(IOPS\)/;
  var lun_re = /^CTL    LU        IO Rate\(IOPS\)/;
  var tags_re = /^CTL    LU   Tag Count/;
  var drive_re = /^CTL Unit HDU Operating Rate\(%\)/;
  var section_re = /^[\-a-zA-Z]/;
  var read_count2_re = /^CTL    LU   Read CMD Hit Count2/;
  var write_count2_re = /^CTL    LU  Write CMD Hit Count2/;
  var read_miss_re = /^CTL    LU   Read CMD Miss Count/;
  var write_miss_re = /^CTL    LU  Write CMD Miss Count/;
  var read_job_re = /^CTL    LU    Read CMD Job Count/;
  var write_job_re = /^CTL    LU   Write CMD Job Count/;
  var backend_re = /^CTL Path        IO Rate\(IOPS\)/;


  process_ams = function(lines) {
    $.each(lines, function() {
       line=this.replace(/^\s+/,'')
       if (section_re.test(line)) {
         metric='';
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
           LAGER['start'] = start;
         } else if (start < LAGER['start']) {
           LAGER['start'] = start;
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
         data_fields[metric+'_READ_IOPS']=[3]
         data_fields[metric+'_WRITE_IOPS']=[4]
         data_fields[metric+'_MBPS']=[7]
         data_fields[metric+'_READ_MBPS']=[8]
         data_fields[metric+'_WRITE_MBPS']=[9]
         //console.log('In DP section')
         return true
       } else if (lun_re.test(line)) {
         metric='LUN'
         series_fields=[0,1]
         data_fields[metric+'_IOPS']=[2]
         data_fields[metric+'_READ_IOPS']=[3]
         data_fields[metric+'_WRITE_IOPS']=[4]
         data_fields[metric+'_MBPS']=[7]
         data_fields[metric+'_READ_MBPS']=[8]
         data_fields[metric+'_WRITE_MBPS']=[9]
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
         //console.log('Matched back-end pattern')
         //console.log(line)
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
             //console.log('Building read vs. write using Port data')
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

  postprocess_ams = function () {
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
    //console.log('LAGER data structure')
    //console.log(LAGER)
    for (var i=0; i <  LAGER.metrics.length; i++) {
        console.log ("Graphing div:  "+LAGER.metrics[i]);
        var div=LAGER.metrics[i];
        console.log(LAGER[div])
        if ((div != 'READ_IOPS') && (div != 'FRONT_IOPS') && (div != 'BACKEND_IOPS')) {
          graphit(div, LAGER[div], 100);
        }
      }
    //buildCSV(LAGER);
    }
  }
