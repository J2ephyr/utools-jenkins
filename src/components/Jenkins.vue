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
        <el-table :data="filterJobList" style="width: 100%" ref="jobTable">
          <el-table-column label="状态" width="80" fixed="left">
            <template slot-scope="scope">
              <status-icon :name="scope.row.icon" :color="scope.row.color" :anime="scope.row.anime"/>
            </template>
          </el-table-column>
          <el-table-column prop="name" fixed="left" label="名称" width="300">
            <template slot-scope="scope">
              <el-link href="" target="_blank" @click="onClickJobName(scope.row)" type="primary">{{ scope.row.name }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="lastBuildTime" label="上次构建时间" width="200"></el-table-column>
          <el-table-column prop="lastChange" label="内容" width="1200"></el-table-column>
          <el-table-column fixed="right" width="200" align="center">
            <template slot="header" slot-scope="scope">
              <el-button type="primary" icon="el-icon-refresh-right" circle @click="onClickRefresh"></el-button>
            </template>
            <template slot-scope="scope">
              <el-row v-if="scope.row.buildStatus && scope.row.buildStatus !== 'FINISH'" style="margin: auto 0"
                      align="middle">
                <!--                <el-col :span="12">-->
                <!--                  <el-progress v-if="scope.row.buildStatus === 'BUILDING' && scope.row.progress !== -1"-->
                <!--                               :percentage="scope.row.progress"></el-progress>-->
                <!--                  <i v-else class="el-icon-loading"></i>-->
                <!--                </el-col>-->
                <el-button type="danger" size="mini" @click="handleCancelBuild(scope.row)">取消</el-button>
                <el-button @click="onClickJobConsole(scope.row)" type="info" size="mini"
                           icon="el-icon-monitor"></el-button>
              </el-row>
              <el-row v-else align="middle" style="margin: auto 0">
                <el-button @click="onClickBuildJob(scope.row)" type="primary" size="mini">构建</el-button>
                <el-button @click="onClickJobConsole(scope.row)" type="info" size="mini"
                           icon="el-icon-monitor"></el-button>
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
      <label v-if="currentJob.description">{{ currentJob.description }}</label>
      <el-divider v-if="currentJob.description"></el-divider>
      <el-form label-position="top"
               v-if="currentJob.parameterProcessed">
        <el-form-item v-for="param in currentJob.parameterProcessed">
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
            <template v-if="jobParameterTypeOfSelectNoChoice.indexOf(param.type) !== -1">
              <el-option v-for="choice in param.choices" :value="choice.value" :label="choice.text"/>
            </template>
            <el-option v-else v-for="choice in param.choices" :value="choice" :label="choice"/>
          </el-select>
          <el-input v-else-if="jobParameterTypeOfInput.indexOf(param.type) !== -1" autocomplete="true"
                    @input="refreshStatus"
                    :type="param.type === 'PasswordParameterDefinition' ? 'password' : 'text'"
                    v-model="currentJob.form[param.name]"/>
          <el-input v-else-if="jobParameterTypeOfTextArea.indexOf(param.type) !== -1" type="textarea" autosize
                    v-model="currentJob.form[param.name]"/>
          <el-switch v-else-if="jobParameterTypeOfCheckbox.indexOf(param.type) !== -1"
                     v-model="currentJob.form[param.name]"/>
          <label v-else>不支持的参数类型：{{ param.type }}</label>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="buildDialog = false">取 消</el-button>
        <el-button type="primary" @click="startBuildJob(currentJob)">开始构建</el-button>
      </span>
    </el-dialog>
    <el-dialog
      v-if="currentJob"
      :title="currentJob.name"
      :visible.sync="consoleDialog"
      :close-on-click-modal="false"
      :before-close="onConsoleDialogClose"
      width="70%"
    >
      <div style="height: 500px;overflow: auto;word-wrap: break-word;white-space: pre-wrap;" id="job-console"
           v-html="console">
      </div>
    </el-dialog>
  </section>
</template>

<script>
import utils from "../js/util";
import utools_dev from "../js/utools_mock";
import Jenkins from "../js/JenkinsServer";
import moment from "moment"
import StatusIcon from "./StatusIcon";

let utools = window.utools ? window.utools : utools_dev;
console.log("utools:", utools)

export default {
  name: 'Jenkins',
  components: {StatusIcon},
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
      viewList: [],
      consoleDialog: false,
      console: []
    }
  },
  computed: {
    filterJobList: function () {
      let filter = this.jobList.filter(e => e.name.match(this.filterValue));
      for (let i = 0; i < filter.length; i++) {
        filter[i].index = i
      }
      return filter;
    },
  },
  watch: {
    filterValue: {
      handler: function () {
      }
    },
    configList: {
      handler: function (val) {
        this.viewSelected = ''
        this.viewList = []
        this.switchConfig()
      },
      deep: true
    },
    console: {
      handler: function () {
        this.$nextTick(function () {
          let consoleElement = document.querySelector('#job-console');
          consoleElement.scrollTop = consoleElement.scrollHeight;
        });
      }
    }
  },
  mounted() {
    this.switchConfig()
  },
  methods: {
    /**
     * 切换配置
     */
    async switchConfig() {
      this.jobList = []
      if (!this.configList || this.configList.length === 0) {
        return null;
      }
      let activeConf = this.configList.filter(e => e.data.active)[0];
      let jenkins = await Jenkins.build(activeConf.data)
      this.activeConfigId = activeConf._id;
      if (jenkins.baseInfo) {
        if (jenkins.baseInfo.views) {
          this.viewList = jenkins.baseInfo.views
        }
        if (jenkins.baseInfo.primaryView && jenkins.baseInfo.primaryView.name) {
          this.viewSelected = jenkins.baseInfo.primaryView.name
        }
      }
      this.jenkins = jenkins
      this.setJobList()
    },
    /**
     * 任务列表
     */
    setJobList() {
      this.jenkins.getJobs(this.viewSelected).then((res) => {
        let result = res.data
        let jobs = result.jobs
        for (let job of jobs) {
          job.lastBuildTime = 'N/A';
          this.jenkins.convertJobColor(job)
          this.getJobLastBuild(job)
        }
        this.jobList = jobs
      })
    },
    /**
     * 获取任务上一次构建内容
     * @param job
     * @returns {Promise<void>}
     */
    async getJobLastBuild(job) {
      this.jenkins.getBuild(job.name, 'lastBuild').then(res => {
        let result = res.data
        job.lastBuildTime = this.formatDate(result.timestamp);
        if (result.changeSet && result.changeSet.items.length > 0) {
          let item = result.changeSet.items[result.changeSet.items.length - 1];
          job.lastChange = item.msg + " (" + item.authorEmail + ")";
        }
        if (result.building) {
          job.buildStatus = 'BUILDING'
          job.curBuildingNumber = result.number
          this.timingGetBuildProgress(job)
        }
      }).catch(({error, hideNormalError}) => {
          hideNormalError()
      })
    },
    /**
     * 刷新按钮点击事件
     */
    onClickRefresh() {
      // this.getJobsLastBuild(this.filterJobList)
      this.setJobList()
    },
    /**
     * 列表任务构建按钮事件
     * @param job
     * @returns {Promise<void>}
     */
    async onClickBuildJob(job) {
      let loading = this.$loading({
        lock: true,
        text: "Loading...",
        background: 'rgba(255, 255, 255, 0.5)',
        target: "body"
      })
      if (!job.form) {
        job.form = {}
      }
      let data = await this.jenkins.getJob(job.name).then(res => res.data);
      job.property = data.property
      job.description = data.description
      job.displayName = data.displayName
      job.parameterProcessed = []
      if (job.property && job.property.length > 0) {
        for (let property of job.property) {
          if (!property || !property.parameterDefinitions || property.parameterDefinitions.length === 0) {
            continue
          }
          for (let param of property.parameterDefinitions) {
            job.form[param.name] = param.defaultParameterValue ? param.defaultParameterValue.value : '';
            await this.jenkins.handleGitParameter(job, param)
            job.parameterProcessed.push(param)
          }
        }
      }
      loading.close()
      console.log('form', job.form)
      this.buildDialog = true;
      this.currentJob = job;
    },
    /**
     * 开始构建任务
     * @param job
     */
    startBuildJob(job) {
      this.jenkins.buildJob(job.name, job.form).then(res => {
        let location = res.headers.location
        let regExp = new RegExp('^.*/item/([a-zA-Z0-9]+)/$')
        let array = regExp.exec(location);
        if (array.length >= 2) {
          job.curBuildingQueueItemId = array[1]
        }
        if (job.curBuildingNumber) {
          delete job.curBuildingNumber
        }
        this.$set(job, 'buildStatus', 'SUBMIT');
        this.timingGetBuildProgress(job)
        this.buildDialog = false;
        this.$message({
          message: '开始构建！',
          type: 'success'
        });
      })
    },
    /**
     * 定时获取构建进度
     */
    async timingGetBuildProgress(job) {
      let timing = true
      try {
        await this.getBuildProgress(job)
        if (job.buildStatus === 'FINISH') {
          let notify = '构建结束！'
          timing = false
          switch (job.buildResult) {
            case 'SUCCESS':
              notify = '构建成功！'
              break
            case 'UNSTABLE':
              notify = '构建结束，结果不稳定！'
              break
            case 'FAILURE':
              notify = '构建失败！'
              break
            case 'NOT_BUILT':
              notify = '构建未开始！'
              break
            case 'ABORTED':
              notify = '构建中止！'
              break
          }
          utools.showNotification(job.name + notify)
        } else {
          setTimeout(() => this.timingGetBuildProgress(job), 5000)
        }
      } catch (e) {
        timing = false
        utools.showNotification(job.name + '构建中止！')
      } finally {
        if (!timing) {
          let data = await this.jenkins.getJob(job.name).then(res => res.data);
          this.$set(job, 'color', data.color)
          this.jenkins.convertJobColor(job)
          await this.getJobLastBuild(job)
        }
      }
    },
    /**
     * 获取构建进度
     * @param job
     */
    async getBuildProgress(job) {
      if (job.curBuildingNumber) {
        await this.jenkins.getBuild(job.name, job.curBuildingNumber).then(res => {
          let result = res.data
          if (result.building === false && result.result) {
            this.$set(job, 'buildStatus', 'FINISH')
            this.$set(job, 'buildResult', result.result)
            this.$set(job, 'anime', false)
            this.setProgress(job)
          } else {
            let startTime = result.timestamp
            let nowTime = new Date().getTime()
            let estimatedDuration = result.estimatedDuration
            let progress = -1
            if (estimatedDuration && estimatedDuration !== -1) {
              progress = Math.ceil(((nowTime - startTime) / estimatedDuration) * 100)
              if (progress >= 100) {
                progress = 99
              }
            }
            this.$set(job, 'progress', progress)
            this.setProgress(job)
          }
        })
      } else {
        await this.jenkins.getQueueItem(job.curBuildingQueueItemId).then(res => {
          let result = res.data
          if (result.executable && result.executable.number) {
            this.$set(job, 'curBuildingNumber', result.executable.number)
            this.$set(job, 'buildStatus', 'BUILDING')
            this.$set(job, 'anime', true)
            this.$set(job, 'progress', -1)
          }
          if (result.cancelled === true) {
            this.$set(job, 'buildStatus', 'FINISH')
          }
        })
      }
    },
    setProgress(job) {
      let row = document.querySelectorAll('.el-table__fixed .el-table__row > td:nth-child(2)').item(job.index);
      if (job.buildStatus === 'FINISH') {
        row.removeAttribute('style')
      } else {
        row.setAttribute('style', 'background: linear-gradient(to right, #D9ECFF ' + job.progress + '%,#ffffff 0%)')
      }
    },
    /**
     * 取消构建
     * @param job
     * @returns {Promise<void>}
     */
    async handleCancelBuild(job) {
      this.$confirm('是否取消构建？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        if (job.curBuildingNumber) {
          this.jenkins.cancelBuild(job.name, job.curBuildingNumber)
        } else if (job.curBuildingQueueItemId) {
          this.jenkins.cancelQueueItem(job.curBuildingQueueItemId)
        }
      })
    },
    onClickJobName(job) {
      utools.shellOpenExternal(this.jenkins.config.url + '/job/' + job.name);
    },
    onClickJobConsole(job) {
      this.console = ''
      this.currentJob = job
      this.consoleDialog = true
      if (job.buildStatus && (job.buildStatus === 'SUBMIT' || job.buildStatus === 'BUILDING')) {
        this.timingGetBuildConsole(job)
      } else {
        this.jenkins.getBuildConsole(job.name, 'lastBuild', 0).then(res => {
          this.console = res.data
        })
      }
    },
    async timingGetBuildConsole(job) {
      if (job.buildStatus === 'FINISH') {
        return false
      }
      if (!job.curBuildingNumber) {
        setTimeout(() => this.timingGetBuildConsole(job), 5000)
        return true
      }
      try {
        return await this.jenkins.getBuildConsole(job.name, job.curBuildingNumber, job.fetchedSize).then(res => {
          if (res.headers['content-length'] === 0) {
            setTimeout(() => this.timingGetBuildConsole(job), 5000)
            return true
          }
          this.console = this.console + res.data
          let moreData = res.headers['x-more-data']
          job.fetchedSize = res.headers['x-text-size']
          if (moreData && moreData !== false) {
            setTimeout(() => this.timingGetBuildConsole(job), 3000)
          }
        })
      } catch (e) {
        return false
      }
    },
    onConsoleDialogClose(done) {
      if (this.currentJob && this.currentJob.consoleInterval) {
        clearInterval(this.currentJob.consoleInterval)
        this.currentJob.consoleInterval = null
      }
      done()
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
    onInputSearch() {
      $.xhrPool.abortAll();
      this.syncJobDetail(this.filterValue);
    },
    formatDate(timestamp) {
      if (timestamp) {
        return moment(new Date(timestamp)).format('YYYY-MM-DD HH:mm:ss');
      }
      return 'N/A'
    },
    async onSwitchConf(activeConfigId) {
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
    async onSwitchView(viewSelected) {
      this.setJobList()
    },
    handleTabClick(tab) {
      if (tab.name === 'index') {
        window.location.hash = '/index'
      } else if (tab.name === 'config') {
        window.location.hash = '/config'
      }
    },
    refreshStatus() {
      this.$forceUpdate()
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.el-row {
  margin-bottom: 20px;
}

.pipeline-new-node {
  color: #9A9999;
}
</style>
