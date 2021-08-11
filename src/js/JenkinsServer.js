import axios from "axios";
import {Loading, MessageBox} from 'element-ui';

export default class JenkinsServer {

  constructor(config) {
    this.config = config
    this.request = axios.create({
      baseURL: config.url,
      auth: {
        username: config.username,
        password: config.password
      },
      headers: {'content-type': 'application/json'}
    });
  }

  static async build(config) {
    let jenkinsServer = new JenkinsServer(config)
    await jenkinsServer._init()
    jenkinsServer.request.interceptors.request.use(function (config) {
      if (config.showLoading === true) {
        jenkinsServer._showLoading();
      }
      if (jenkinsServer.baseInfo && jenkinsServer.baseInfo.useCrumbs && jenkinsServer.crumb) {
        config.headers[jenkinsServer.crumb.crumbRequestField] = jenkinsServer.crumb.crumb
      }
      config.timeout = 10000
      return config
    }, function (error) {
      console.log('request error',error)
      return Promise.reject(error);
    });
    jenkinsServer.request.interceptors.response.use(function (response) {
      if (response.config.showLoading === true) {
        jenkinsServer._hideLoading()
      }
      return response;
    }, function (error) {
      if (error.config.showLoading === true) {
        jenkinsServer._hideLoading()
      }
      let errorMessage
      if (error.response) {
        let contentType = error.response.headers['content-type']
        if (error.response.data) {
          if (contentType.indexOf('json') !== -1) {
            let data = error.response.data
            errorMessage = '<p><h2>status:' + data.status +'</h2></p><p><h3>message:' + data.message +'</h3></p>'
          } else {
            errorMessage = error.response.data
          }
        } else {
          errorMessage = '<h2>status:' + error.response.status + '</h2>'
        }
      } else if (error.request) {
        errorMessage = '<h2>' + error.message + '</h2>' + '<p>请检查配置是否正确！</p>'
      } else {
        errorMessage = error.message
      }
      console.log(error)
      let isShowNormalError = true
      const hideNormalError = () => isShowNormalError = false
      setTimeout(() => {
        if (isShowNormalError) {
          MessageBox.alert(errorMessage, '请求失败', {
            dangerouslyUseHTMLString: true,
            showConfirmButton: false
          });
        }
      })
      return Promise.reject({error, hideNormalError});
    });
    return jenkinsServer
  }

  async _init() {
    this._showLoading()
    try {
      let baseInfo = await this.getBaseInfo().then(res => res.data)
      this.baseInfo = baseInfo
      if (baseInfo && baseInfo.useCrumbs) {
        this.crumb = await this.getJenkinsCrumb().then(res => res.data)
      }
    } catch (e) {
    } finally {
      this._hideLoading()
    }
  }

  _showLoading() {
    this.loading = Loading.service({
      lock: true,
      text: "Loading...",
      background: 'rgba(255, 255, 255, 0.5)',
      target: "body"
    });
  }

  _hideLoading() {
    if (this.loading) {
      this.loading.close();
      this.loading = null;
    }
  }

  /**
   * 获取基础信息
   * @returns {*}
   */
  getBaseInfo() {
    return this.request.get('/api/json', {})
  }

  /**
   * 获取Crumb
   * @returns {*}
   */
  getJenkinsCrumb() {
    return this.request.get('/crumbIssuer/api/json')
  }

  /**
   * 获取任务列表
   * @param viewName
   * @returns {*}
   */
  async getJobs(viewName) {
    let res = await this.request.get((viewName ? "/view/" + viewName : "") + "/api/json")
    for (let i = 0; i < res.data.jobs.length; i++) {
      let job = res.data.jobs[i]
      if (job._class === 'com.cloudbees.hudson.plugins.folder.Folder') {
        let jobs = await this.getJobsOfFolder(encodeURI(job.name))
        if (jobs && jobs.length !== 0) {
          res.data.jobs = res.data.jobs.concat(jobs)
        }
        res.data.jobs.splice(i, 1)
      }
    }
    return res
  }

  getJobsOfFolder(folderPath) {
    return this.request.get('/job/' + folderPath + "/api/json").then(res => {
      return res.data.jobs
    })
  }

  /**
   * 获取任务详情
   * @param jobName
   * @returns {*}
   */
  getJob(jobName) {
    return this.request.get('/job/' + jobName + '/api/json')
  }

  /**
   * 获取构建历史
   * @param jobName
   * @param buildNum
   * @returns {*|void}
   */
  getBuild(jobName, buildNum) {
    return this.request.post("/job/" + jobName + "/" + buildNum + "/api/json")
  }

  /**
   * 获取git参数
   * @param jobName
   * @param paramName
   * @returns {*|void}
   */
  getBuildGitParameter(jobName, paramName) {
    let headers = {}
    return this.request.post("/job/" + jobName + '/descriptorByName/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition/fillValueItems?param=' + paramName, {}, {
      headers: headers
    })
  }

  /**
   * 处理git参数
   * @param job
   * @param param
   * @returns {Promise<void>}
   */
  async handleGitParameter(job, param) {
    if (param._class === 'net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition') {
      let result = await this.getBuildGitParameter(job.name, param.name).then(res => res.data);
      console.log('git parameter', result)
      let choices = []
      let options = result ? result.values : []
      if (options.length !== 0) {
        for (let i = 0; i < options.length; i++) {
          choices.push({text: options[i].name, value: options[i].value})
        }
      }
      param.choices = choices
    }
  }

  /**
   * 构建任务
   * @param jobName
   * @param parameters
   * @returns {*|void}
   */
  buildJob(jobName, parameters) {
    let url
    if (parameters && parameters.length !== 0) {
      url = "/job/" + jobName + "/buildWithParameters"
    } else {
      url = "/job/" + jobName + "/build"
    }
    return this.request.post(url, {}, {
      params: parameters,
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
      showLoading: true
    })
  }

  /**
   * 获取控制台日志
   * @param jobName
   * @param number
   * @param start
   * @returns {*}
   */
  getBuildConsole(jobName, number, start) {
    if (!start) {
      start = 0
    }
    return this.request.get('/job/' + jobName + '/' + number + '/logText/progressiveHtml', {
      params: {start: start}
    })
  }

  convertJobColor(job) {
    switch (job.color) {
      case 'red':
        job.icon = 'last-failed'
        job.anime = false
        job.color = 'icon-red'
        break
      case 'red_anime':
        job.icon = 'last-failed'
        job.anime = true
        job.color = 'icon-red'
        break
      case 'yellow':
        job.icon = 'last-unstable'
        job.anime = false
        job.color = 'icon-yellow'
        break
      case 'yellow_anime':
        job.icon = 'last-unstable'
        job.anime = true
        job.color = 'icon-yellow'
        break
      case 'blue':
        job.icon = 'last-successful'
        job.anime = false
        job.color = 'icon-blue'
        break
      case 'blue_anime':
        job.icon = 'last-successful'
        job.anime = true
        job.color = 'icon-blue'
        break
      case 'grey':
        job.icon = 'last-disabled'
        job.anime = false
        job.color = 'icon-disabled'
        break
      case 'grey_anime':
        job.icon = 'last-disabled'
        job.anime = true
        job.color = 'icon-disabled'
        break
      case 'disabled':
        job.icon = 'last-disabled'
        job.anime = false
        job.color = 'icon-disabled'
        break
      case 'disabled_anime':
        job.icon = 'last-disabled'
        job.anime = true
        job.color = 'icon-disabled'
        break
      case 'aborted':
        job.icon = 'last-aborted'
        job.anime = false
        job.color = 'icon-aborted'
        break
      case 'aborted_anime':
        job.icon = 'last-aborted'
        job.anime = true
        job.color = 'icon-aborted'
        break
      case 'notbuilt':
        job.icon = 'never-built'
        job.anime = false
        job.color = 'icon-nobuilt'
        break
      case 'notbuilt_anime':
        job.icon = 'never-built'
        job.anime = true
        job.color = 'icon-nobuilt'
        break
    }
  }

  /**
   * 取消构建
   * @param jobName
   * @param num
   * @returns {*|void}
   */
  cancelBuild(jobName, num) {
    return this.request.post("/job/" + jobName + "/" + num + "/stop")
  }

  /**
   * 获取队列信息
   * @param itemId
   */
  getQueueItem(itemId) {
    return this.request.get('/queue/item/' + itemId + '/api/json')
  }

  /**
   * 取消队列任务
   * @param itemId
   * @returns {*|void}
   */
  cancelQueueItem(itemId) {
    return this.request.post('/queue/cancelItem', {}, {
      params: {id: itemId}
    })
  }


}
