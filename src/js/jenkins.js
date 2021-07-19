import $ from 'jquery'

class Jenkins {

  constructor(baseURL) {
    this.baseURL = baseURL;
    let match = this.baseURL.match(/(.+)\/$/);
    if (match) {
      this.baseURL = match[1];
    }
    this.getJenkinsCrumb().then((crumb) => {
      this.crumb = crumb
    })
  }

  async listJobs(url, viewName) {
    if (!url || url.length === 0) {
      url = this.baseURL + (viewName ? "/view/" + viewName : "") + "/api/json"
    }
    let result = await $.ajax({
      dataType: 'json',
      url: url
    })
    console.log('listJobs', result)
    for (let job of result.jobs) {
      if (job._class === 'com.cloudbees.hudson.plugins.folder.Folder') {
        console.log('job url', job.url)
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

  async getJenkinsCrumb() {
    return await $.ajax({
      url: this.baseURL + "/crumbIssuer/api/json"
    });
  }

  async getJobColor(jobName) {
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
      for (let key in parameters) {
        if (key && key.trim() !== "") {
          string += "&" + key + "=" + parameters[key];
        }
      }
      string = '?' + string.substring(1);
      httpRequest.open('POST', this.baseURL + "/job/" + jobName + "/buildWithParameters" + string, true);
    } else {
      httpRequest.open('POST', this.baseURL + "/job/" + jobName + "/build", true);
    }
    httpRequest.setRequestHeader("Authorization", authString)
    httpRequest.setRequestHeader("content-type", "application/x-www-form-urlencoded")
    httpRequest.send();
  }

  async ajaxJob(jobName) {
    let headers = {}
    if (this.crumb) {
      headers[this.crumb.crumbRequestField] = this.crumb.crumb;
    }
    return await $.ajax({
      type: 'post',
      headers: headers,
      url: this.baseURL + "/job/" + jobName + "/buildHistory/ajax"
    });
  }

  async getProgress(jobName) {
    let text = await this.ajaxJob(jobName);
    let find = $(text).find(".progress-bar-done");
    if (find.length === 0) {
      return 0;
    }
    return parseInt(find[0].style.width);
  }

  async getLastBuild(jobName) {
    return await $.ajax({
      dataType: 'json',
      url: this.baseURL + "/job/" + jobName + "/lastBuild/api/json"
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

  async stopBuild(jobName, num) {
    return await $.ajax({
      dataType: 'json',
      type: 'POST',
      url: this.baseURL + "/job/" + jobName + "/" + num + "/stop"
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

  async getGitParameter(jobName, paramName) {
    let headers = {}
    if (this.crumb) {
      headers[this.crumb.crumbRequestField] = this.crumb.crumb;
    }
    return await $.ajax({
      headers: headers,
      url: this.baseURL + "/job/" + jobName + '/descriptorByName/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition/fillValueItems?param=' + paramName,
      dataType: 'json',
      type: 'post'
    })
  }
}

export default Jenkins
