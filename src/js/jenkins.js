import $ from 'jquery'

class Jenkins {

  constructor(baseURL) {
    this.baseURL = baseURL;
    let match = this.baseURL.match(/(.+)\/$/);
    if(match){
      this.baseURL = match[1];
    }
  }

  async listJobs(url) {
    let result = await $.ajax({
      dataType: 'json',
      url: (url ? url : this.baseURL) + "/api/json"
    })
    console.log('listJobs', result)
    for(let job of result.jobs){
      if(job._class === 'com.cloudbees.hudson.plugins.folder.Folder'){
          console.log('job url' , job.url)
          let concatjobs = await this.listJobs(job.url);
          console.log('concatjobs', concatjobs.jobs)
          result.jobs = result.jobs.concat(concatjobs.jobs)
      }
    }
    return result;
  }

  async getJob(jobName) {
    return await $.ajax({
      dataType: 'json',
      url: this.baseURL + "/job/" + jobName + "/api/json"
    });
  }

  async getJenkinsCrumb(jobName){
    return await $.ajax({
      url: this.baseURL + "/crumbIssuer/api/json"
    });
  }

  async getJobColor(jobName){
    let result = await $.ajax({
      dataType: 'json',
      url: this.baseURL + "/job/" + jobName + "/api/json?tree=color"
    })
    return result.color;
  }

  async buildJob(jobName, parameters, authString) {
    let httpRequest = new XMLHttpRequest();
    if (parameters != null) {
      let string = "";
      for(let key in parameters){
        if(key && key.trim() !== "") {
          string += "&" + key + "=" + parameters[key];
        }
      }
      string = '?' + string.substring(1);
      httpRequest.open('POST', this.baseURL + "/job/" + jobName + "/buildWithParameters" + string, true);
    }else {
      httpRequest.open('POST', this.baseURL + "/job/" + jobName + "/build", true);
    }
    httpRequest.setRequestHeader("Authorization", authString)
    httpRequest.setRequestHeader( "content-type", "application/x-www-form-urlencoded")
    httpRequest.send();
  }

  async ajaxJob(jobName){
    return await $.ajax({
      type: 'post',
      url: this.baseURL + "/job/" + jobName + "/buildHistory/ajax"
    });
  }

  async getProgress(jobName){
    let text = await this.ajaxJob(jobName);
    let find = $(text).find(".progress-bar-done");
    if(find.length === 0) {
      return 0;
    }
    return parseInt(find[0].style.width);
  }

  async getLastBuild(jobUrl) {
    return await $.ajax({
      dataType: 'json',
      url: jobUrl + "/lastBuild/api/json"
    });
  }

  async getBuild(buildURL) {
    if (!buildURL) {
      return null;
    }
    return await $.ajax({
      dataType: 'json',
      url: buildURL + "/api/json"
    });
  }

  async stopBuild(buildURL) {
    if (!buildURL) {
      return null;
    }
    return await $.ajax({
      dataType: 'json',
      type: 'POST',
      url: buildURL + "stop"
    });
  }

  async getBuildView(jobName) {
    let result
    try {
      await $.ajax({
        type: 'GET',
        url: this.baseURL + "/job/" + jobName + "/build",
        error: function (res) {
          result = res.responseText
        }
      })
    } catch (e) {

    }
    return result;
  }
}

export default Jenkins
