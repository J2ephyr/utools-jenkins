<template>
  <section data-route="index" id="index">
    <el-container>
      <el-main>
        <el-tabs v-model="activeTabName" @tab-click="handleTabClick">
          <el-tab-pane label="首页" name="index"></el-tab-pane>
          <el-tab-pane label="配置" name="config"></el-tab-pane>
        </el-tabs>
        <el-row>
          <el-col :span="6">
            <el-select style="width: 100%" v-model="activeConfigId" placeholder="请选择" @change="onSwitchConf">
              <el-option
                v-for="config in configList"
                :key="config._id"
                :label="config.data.alias"
                :value="config._id">
              </el-option>
            </el-select>
          </el-col>
          <el-col :span="6" :push="1">
            <el-select style="width: 100%" v-model="viewSelected" placeholder="请选择" @change="onSwitchView">
              <el-option
                v-for="view in viewList"
                :key="view.name"
                :label="view.name"
                :value="view.name">
              </el-option>
            </el-select>
          </el-col>
        </el-row>
        <el-row>
          <el-input class="input" placeholder="JOB名称" v-model="filterValue" v-bind:input="onInputSearch"/>
        </el-row>
        <el-table :data="filterJobList" style="width: 100%">
          <el-table-column label="状态" width="80" fixed="left">
            <template slot-scope="scope">
              <img alt="状态" class="jobColor" width="16" height="16" v-bind:src="scope.row.colorUrl"/>
            </template>
          </el-table-column>
          <el-table-column prop="name" fixed="left" label="名称" width="300">
            <template slot-scope="scope">
              <el-link href="" target="_blank" @click="onClickJobName(scope.row)" type="primary">{{scope.row.name}}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="lastBuildTime" label="上次构建时间" width="200"></el-table-column>
          <el-table-column prop="lastChange" label="内容" width="1200"></el-table-column>
          <el-table-column fixed="right" width="200" align="center">
            <template slot="header" slot-scope="scope">
              <el-button type="primary" icon="el-icon-refresh-right" circle @click="onclickRefresh"></el-button>
            </template>
            <template slot-scope="scope">
              <el-button v-if="!scope.row.progress" @click="onClickBuildJob(scope.row)" type="primary" size="small">构建
              </el-button>
              <el-row v-else style="margin: auto 0" type="flex" align="middle">
                <el-col :span="16">
                  <el-progress :percentage="scope.row.progress"></el-progress>
                </el-col>
                <el-col :span="8">
                  <el-button type="danger" @click="handleCancelBuild(scope.row)">取消</el-button>
                </el-col>
              </el-row>
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>
    <el-dialog
      v-if="currentJob"
      :title="currentJob.displayName"
      :visible.sync="buildDialog"
      :close-on-click-modal="false"
    >
      <label v-if="currentJob.description">{{currentJob.description}}</label>
      <el-divider v-if="currentJob.description"></el-divider>
      <el-form label-position="top"
               v-if="currentJob.actions && currentJob.actions[0] && currentJob.actions[0]._class==='hudson.model.ParametersDefinitionProperty'">
        <el-form-item v-for="param in currentJob.actions[0].parameterDefinitions">
          <label slot="label">
            {{ param.name }}
            <el-tooltip v-if="param.description" placement="top">
              <div slot="content">{{ param.description }}</div>
              <i class="el-icon-info"></i>
            </el-tooltip>
          </label>
          <el-select
            v-if="jobParameterTypeOfSelect.indexOf(param.type) !== -1 && param.choices && param.choices.length !== 0"
            v-model="currentJob.form[param.name]" @change="refreshStatus" style="width: 100%"
            :multiple="param.type === 'PT_MULTI_SELECT'">
            <el-option v-if="jobParameterTypeOfSelectNoChoice.indexOf(param.type) !== -1"
                       v-for="choice in param.choices" :value="choice.value" :label="choice.text"/>
            <el-option v-else v-for="choice in param.choices" :value="choice" :label="choice"/>
          </el-select>
          <el-input v-else-if="jobParameterTypeOfInput.indexOf(param.type) !== -1" autocomplete="true" @input="refreshStatus"
                    :type="param.type === 'PasswordParameterDefinition' ? 'password' : 'text'"
                    v-model="currentJob.form[param.name]"/>
          <el-input v-else-if="jobParameterTypeOfTextArea.indexOf(param.type) !== -1" type="textarea" autosize
                    v-model="currentJob.form[param.name]"/>
          <el-switch v-else-if="jobParameterTypeOfCheckbox.indexOf(param.type) !== -1"
                     v-model="currentJob.form[param.name]" active-color="#13ce66" inactive-color="#ff4949"/>
          <label v-else>不支持的参数类型：{{ param.type }}</label>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="buildDialog = false">取 消</el-button>
        <el-button type="primary" @click="onDoBuildJob(currentJob)">开始构建</el-button>
      </span>
    </el-dialog>
  </section>
</template>

<script>
import utils from "../js/util";
import utools_dev from "../js/utools_mock";
import Jenkins from "../js/jenkins";
import $ from "jquery"
import moment from "moment"
import {ThreadPool} from "../js/classutil";

let utools = window.utools ? window.utools : utools_dev;
console.log("utools:", utools)

export default {
  name: 'Jenkins',
  data() {
    return {
      jobParameterTypeOfSeparator: ["ParameterSeparatorDefinition"],
      jobParameterTypeOfFile: ["FileParameterDefinition", "PatchParameterDefinition"],
      jobParameterTypeOfTextArea: ["TextParameterDefinition", "PersistentTextParameterDefinition"],
      jobParameterTypeOfCheckbox: ["BooleanParameterDefinition", "PersistentBooleanParameterDefinition", ""],
      jobParameterTypeOfInput: ["StringParameterDefinition", "DateParameterDefinition",
        "LabelParameterDefinition", "PersistentStringParameterDefinition", "PT_TEXTBOX"],
      jobParameterTypeOfSelect: ["ChoiceParameterDefinition", "CascadeChoiceParameter", "BooleanParameterDefinition",
        "NodeParameterDefinition", "PersistentChoiceParameterDefinition",
        "PT_MULTI_SELECT", "PT_SINGLE_SELECT", "PT_TAG", "PT_BRANCH", "PT_BRANCH_TAG", "PT_REVISION", "PT_PULL_REQUEST"],
      jobParameterTypeOfSelectNoChoice: ["PT_MULTI_SELECT", "PT_SINGLE_SELECT", "PT_TAG", "PT_BRANCH", "PT_BRANCH_TAG", "PT_REVISION", "PT_PULL_REQUEST"],
      activeTabName: 'index',
      buildDialog: false,
      currentJob: null,
      configList: utils.getConfigList(),
      activeConfigId: null,
      jobList: [],
      filterValue: '',
      viewSelected: '',
      viewList: []
    }
  },
  computed: {
    filterJobList: function () {
      let filter = this.jobList.filter(e => e.name.match(this.filterValue));
      return filter;
    },
    imgs: function () {
      if (this.jenkins) {
        return {
          buildImg: this.jenkins.baseURL + '/static/3f381a23/images/24x24/clock.png'
        }
      }
      return {
        buildImg: ''
      };
    }
  },
  watch: {
    filterValue: {
      handler: function () {
      }
    },
    configList: {
      handler: function (val) {
        if (this.getJenkins()) {
          this.viewSelected = ''
          this.viewList = []
          this.setJobList()
        }
      },
      deep: true
    }
  },
  mounted() {
    $(".input").focus();
    let thus = this;
    $.xhrPool = [];
    $.xhrPool.abortAll = function () {
      $(this).each(function (i, jqXHR) {   //  cycle through list of recorded connection
        console.log('abort', jqXHR)
        jqXHR.abort();  //  aborts connection
        $.xhrPool.splice(i, 1); //  removes from list by index
      });
    }
    $.ajaxSetup({
      beforeSend: function (jqXHR) {
        let {url, username, password} = thus.getAuth();
        $.xhrPool.push(jqXHR);
        jqXHR.setRequestHeader('Content-Type', 'application/json')
        jqXHR.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
      }, //  annd connection to list
      complete: function (jqXHR) {
        var i = $.xhrPool.indexOf(jqXHR);   //  get index for current connection completed
        if (i > -1) $.xhrPool.splice(i, 1); //  removes from list by index
      }
    });
    if (this.getJenkins()) {
      this.setJobList();
    }
  },
  methods: {
    onDoBuildJob: function (job) {
      let {url, username, password} = this.getAuth();
      let auth = "Basic " + btoa(username + ":" + password);
      this.buildDialog = false;
      let isParam = job.actions && job.actions[0] && job.actions[0]._class === 'hudson.model.ParametersDefinitionProperty';
      this.jenkins.buildJob(job.name, isParam ? job.form : null, auth);
      this.$message({
        message: '开始构建！',
        type: 'success'
      });
      (async () => {
        job.color = await this.jenkins.getJobColor(job.name);
        this.$set(job, 'progress', 0);
        this.updateJobColor(job, true);
      })()
    },
    onclickRefresh: function () {
      this.filterJobList.forEach(async job => {
        job.color = await this.jenkins.getJobColor(job.name);
        this.updateJobColor(job);
      })
      this.syncJobDetail(this.filterJobList)
    },
    setJobColorUrl: function (job) {
      let anime = false;
      let url = this.getCurrentJenkinsUrl();
      let colorPng = url + "/static/68283e49/images/16x16/" + job.color + ".png";
      if (job.color && job.color.match(/anime/)) {
        colorPng = url + "/static/68283e49/images/16x16/" + job.color + ".gif";
        anime = true;
      }
      job.colorUrl = colorPng;
      return anime;
    },
    updateJobColor: function (job, check) {
      if (this.setJobColorUrl(job) || check) {
        if (!job.interval || check) {
          job.interval = setInterval(async () => {
            job.color = await this.jenkins.getJobColor(job.name);
            this.setJobColorUrl(job);
            let progress = await this.jenkins.getProgress(job.name);
            this.$set(job, 'progress', progress);
            if (progress > 0 && !job.synced) {
              this.syncJobDetailNow(job);
              job.synced = true;
            }
            if (!job.color || !job.color.match(/anime/)) {
              clearInterval(job.interval);
              job.interval = null;
              this.$set(job, 'progress', '');
              job.synced = false;
              if (job.color.match(/yellow|blue/)) {
                utools.showNotification(job.name + "构建成功！")
              } else if (job.color.match(/red/)) {
                utools.showNotification(job.name + "构建失败！")
              } else {
                utools.showNotification(job.name + "构建结束！")
              }
            }
            console.log(job.progress);
          }, 5000);
        }
      }
    },
    handleGitParameter: async function (job, param) {
      if (param._class === 'net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition') {
        let result = await this.jenkins.getGitParameter(job.name, param.name);
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
    },
    handleParameterTypeOfSelectNoChoice: async function (job, param) {
      if (this.jobParameterTypeOfSelectNoChoice.indexOf(param.type) !== -1 && !param.choices) {
        let buildView = await this.jenkins.getBuildView(job.name);
        let options = $(buildView).find('input[value="' + param.name + '"] + select:first option')
        let choices = []
        if (options && options.length !== 0) {
          for (let i = 0; i < options.length; i++) {
            choices.push({text: options[i].text, value: options[i].value})
          }
        }
        param.choices = choices
      }
    },
    onClickBuildJob: async function (job) {
      if (!job.form) {
        job.form = {}
      }
      let data = await this.jenkins.getJob(job.name);
      job = $.extend(job, data);
      console.log('job', job)
      if (job.actions && job.actions.length > 0 && job.actions[0]._class === 'hudson.model.ParametersDefinitionProperty') {
        for (let param of job.actions[0].parameterDefinitions) {
          job.form[param.name] = param.defaultParameterValue ? param.defaultParameterValue.value : '';
          await this.handleGitParameter(job, param)
          await this.handleParameterTypeOfSelectNoChoice(job, param)
        }
      }
      this.buildDialog = true;
      this.currentJob = job;
    },
    handleCancelBuild: async function (job) {
      this.$confirm('是否取消构建？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        console.log("handleCancelBuild", job)
        let num;
        if (!job.lastBuild) {
          let data = await this.jenkins.getJob(job.name);
          job = $.extend(job, data);
          num = job.lastBuild.number
        } else {
          num = job.lastBuild.number + 1
        }
        this.jenkins.stopBuild(job.name, num)
      })
    },
    getJenkins: function () {
      if (!this.configList || this.configList.length === 0) {
        return null;
      }
      console.log('configList jenkins', this.configList)
      let activeConf = this.configList.filter(e => e.data.active)[0];
      this.jenkins = new Jenkins(activeConf.data.url);
      this.activeConfigId = activeConf._id;
      return this.jenkins;
    },
    onInputSearch: function () {
      $.xhrPool.abortAll();
      this.syncJobDetail(this.filterValue);
    },
    formatDate: function (timestamp) {
      if (timestamp) {
        return moment(new Date(timestamp)).format('YYYY-MM-DD HH:mm:ss');
      }
      return 'N/A'
    },
    onClickJobName: function (job) {
      utools.shellOpenExternal(job.url);
    },
    getAuth: function () {
      let config = this.configList.filter(e => e.data.active)[0];
      let url = config && config.data ? config.data.url : null;
      let username = config && config.data ? config.data.username : null;
      let password = config && config.data ? config.data.password : null;
      return {url, username, password}
    },
    getSyncJobDetailRunnable: function (job) {
      return new Promise(r => {
        let thus = this;
        (async function (job) {
          let lastBuild = await thus.jenkins.getLastBuild(job.name);
          let time = thus.formatDate(lastBuild.timestamp);
          if (lastBuild.changeSet && lastBuild.changeSet.items.length > 0) {
            let lastmsg = lastBuild.changeSet.items[lastBuild.changeSet.items.length - 1];
            job.lastChange = lastmsg.msg + " (" + lastmsg.authorEmail + ")";
          }
          job.lastBuildTime = time;
          r();
        })(job)
      });
    },
    syncJobDetailNow: function (job) {
      let promise = this.getSyncJobDetailRunnable(job);
      promise.then(() => {

      })
    },
    syncJobDetail: async function (jobList) {
      let threadPool = new ThreadPool(5);
      let pool = [];
      for (let job of jobList) {
        let runnable = this.getSyncJobDetailRunnable(job);
        if (!job.lastBuildTime && !job.lastChange) {
          pool.push(runnable)
        }
      }
      threadPool.submitList(pool);
    },
    getCurrentJenkinsUrl: function () {
      let {url, username, password} = this.getAuth();
      return url;
    },
    setJobList: async function () {
      let {url, username, password} = this.getAuth();
      let result = {
        jobs: []
      };
      try {
        result = await this.jenkins.listJobs('', this.viewSelected)
      } catch (e) {
        console.error(e)
        this.$alert(e.responseText, '', {
          dangerouslyUseHTMLString: true
        });
      }
      for (let job of result.jobs) {
        job.lastBuildTime = 'N/A';
        this.updateJobColor(job);
      }
      this.jobList = result.jobs;
      if (result.views) {
        this.viewList = result.views
      }
      if (result.primaryView && result.primaryView.name) {
        this.viewSelected = result.primaryView.name
      }
      await new Promise((r) => {
        setTimeout(r, 1000)
      });
      this.syncJobDetail(this.jobList);
    },
    onSwitchConf: async function (activeConfigId) {
      this.configList.forEach(e => {
        e.data.active = e._id === activeConfigId;
      });
      this.configList.forEach((e) => {
        utools.db.put({
          "_id": e._id,
          "data": e.data,
          "_rev": e._rev
        })
      })
    },
    onSwitchView: async function (viewSelected) {
      this.setJobList()
    },
    handleTabClick: function (tab) {
      if (tab.name === 'index') {
        window.location.hash = '/index'
      } else if (tab.name === 'config') {
        window.location.hash = '/config'
      }
    },
    refreshStatus: function () {
      this.$forceUpdate()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.el-row {
  margin-bottom: 20px;
}
</style>
