<template>
  <section data-route="config" id="config">
    <el-container>
      <el-main>
        <el-tabs v-model="activeTabName" @tab-click="handleTabClick">
          <el-tab-pane label="首页" name="index"></el-tab-pane>
          <el-tab-pane label="配置" name="config"></el-tab-pane>
        </el-tabs>
        <el-row>
          <el-button type="primary" @click="handleAdd">新增</el-button>
        </el-row>
        <el-table :data="configList" style="width: 100%">
          <el-table-column prop="data.alias" fixed label="名称" width="300"></el-table-column>
          <el-table-column prop="data.url" label="Jenkins服务器地址" width="300"></el-table-column>
          <el-table-column prop="data.username" label="用户名" width="300"></el-table-column>
          <el-table-column prop="data.password" label="密码" width="900"></el-table-column>
          <el-table-column prop="操作" fixed="right" width="200" align="center">
            <template slot-scope="scope">
              <el-button @click="handleEdit(scope.row)" type="primary" size="small">编辑</el-button>
              <el-button @click="handleDelete(scope.row)" type="primary" size="small">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>
    <el-dialog
      :visible.sync="dialogVisible"
      :close-on-click-modal="false"
    >
      <el-form :model="config" ref="configForm" :rules="configFormRules">
        <el-form-item prop="data.alias" label="名称">
          <el-input v-model="config.data.alias" placeholder="名称"/>
        </el-form-item>
        <el-form-item prop="data.url" label="Jenkins服务器地址">
          <el-input v-model="config.data.url" placeholder="Jenkins Url"/>
        </el-form-item>
        <el-form-item prop="data.username" label="用户名">
          <el-input v-model="config.data.username" placeholder="用户名"/>
        </el-form-item>
        <el-form-item prop="data.password" label="密码">
          <el-input v-model="config.data.password" placeholder="密码"/>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSave">保 存</el-button>
      </span>
    </el-dialog>
  </section>

</template>

<script>
import utools_dev from "../js/utools_mock";
import utils from "../js/util";

let utools = window.utools ? window.utools : utools_dev;

function getConfList() {
  let allDocs = utools.db.allDocs("jenkins");
  let ret = [];
  if (allDocs.length > 0) {
    for (let i = 0; i < allDocs.length; i++) {
      let data = allDocs[i];
      ret.push(data);
    }
  }
  return ret;
}

const checkUrl = (rule, value, callback) => {
  setTimeout(() => {
    let strRegex = '^((https|http|ftp|rtsp|mms)?://)'
      + '?(([0-9a-z_!~*\'().&=+$%-]+: )?[0-9a-z_!~*\'().&=+$%-]+@)?' //ftp的user@
      + '(([0-9]{1,3}.){3}[0-9]{1,3}' // IP形式的URL- 199.194.52.184
      + '|' // 允许IP和DOMAIN（域名）
      + '([0-9a-z_!~*\'()-]+.)*' // 域名- www.
      + '([0-9a-z][0-9a-z-]{0,61})?[0-9a-z].' // 二级域名
      + '[a-z]{2,6})' // first level domain- .com or .museum
      + '(:[0-9]{1,5})?' // 端口- :80
      + '((/?)|' // a slash isn't required if there is no file name
      + '(/[0-9a-z_!~*\'().;?:@&=+$,%#-]+)+/?)$'
    let oRegUrl = new RegExp(strRegex);
    if (!oRegUrl.test(value)) {
      callback(new Error('请输入正确的Url地址'));
    } else {
      callback();
    }
  }, 400);
};

export default {
  name: "Config",
  data: () => {
    return {
      activeTabName: 'config',
      configList: getConfList(),
      dialogVisible: false,
      config: {
        data: {}
      },
      configFormRules: {
        "data.alias": [{required: true, message: '名称不能为空'}],
        "data.url": [{required: true, message: '地址不能为空'}, {validator: checkUrl, trigger: 'blur'}],
        // "data.username": [{required: true, message: '用户名不能为空'}],
        // "data.password": [{required: true, message: '密码不能为空'}],
      }
    }
  },
  created() {

  },
  methods: {
    handleDelete: function (config) {
      console.log(config)
      this.configList.forEach((c, i) => {
        if (c._id === config._id) {
          this.configList.splice(i, 1)
        }
      });
      utools.db.remove(config._id);
    },
    handleEdit: function (config) {
      this.dialogVisible = true
      this.config = JSON.parse(JSON.stringify(config))
    },
    handleAdd: function () {
      this.dialogVisible = true
    },
    handleSave: function () {
      this.$refs["configForm"].validate((valid) => {
        console.log(valid)
        if (valid) {

          if (!this.config._id) {
            this.config._id = "jenkins-" + utils.uuid()
          }
          this.config._rev || delete this.config._rev
          utools.db.put(this.config);
          this.configList = getConfList()
          this.$message({
            message: '保存成功！',
            type: 'success'
          });
          this.config = {data: {}}
          this.dialogVisible = false
        }
      });
    },
    handleTabClick: function (tab) {
      if (tab.name === 'index') {
        window.location.hash = '/index'
      } else if (tab.name === 'config') {
        window.location.hash = '/config'
      }
    }
  }
}
</script>

<style scoped>

</style>
