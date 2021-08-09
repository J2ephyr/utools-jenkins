# utools-jenkins

仓库地址：[https://github.com/J2ephyr/utools-jenkins](https://github.com/J2ephyr/utools-jenkins)

原作者：me10zyl
[https://github.com/me10zyl/utools-jenkins](https://github.com/me10zyl/utools-jenkins)

+ 使用 `jk-set` 或者 `jenkins-set` 来设置jenkins的URL, 用户名密码(可选)
+ 使用 `jk` 或者 `jenkins` 来搜索jenkins的job

搜索jenkins页面
![jk](https://raw.githubusercontent.com/J2ephyr/img/main/img/WeChat4c8a6aa838ba550cf44725d572e51d68.png)
设置jenkins页面
![jk-config](https://raw.githubusercontent.com/J2ephyr/img/main/img/WeChat971a0d95adaae62921dd75c7fd1852cb.png)
![jk-config](https://raw.githubusercontent.com/J2ephyr/img/main/img/WeChat259c7c2a11c4a1e6b40027fdddd5ffaa.png)
可支持多个jenkins配置,在主页面点击相应配置可以随时切换。

# 使用教程

先使用`jk-set`设置好jenkins连接，再使用使用`jk`命令实现jenkins的筛序，查看，构建等功能

# 现有功能

1. 可搜索JOB并跳转到jenkins浏览器
2. 可直接构建或参数化构建项目, 可以取消构建
3. 随时查看构建进度(百分比显示)
4. 查看最后一次构建的git 日志描述
5. 可配置多个jenkinsURL, 在主页面随意切换, 用于区分测试环境和生产环境的jenkins

# 更新日志

+ v0.0.1 初始
+ v0.0.2 完全重构, 解决文件夹下的JOB不会出现列表中
+ v0.0.3 新增构建功能，支持无参构建和部分有参构建（文本和选择），新增构建进度展示和增加刷新按钮
+ v0.0.4 修复构建时未授权的BUG
+ v0.0.5 修复有些文本参数化构建选项无法显示问题
+ v0.1.0 1.UI重构 2.Jenkins参数解析修改 3.取消构建功能
+ v0.1.1 1.优化 2.修复一些问题
+ v0.1.2 🐛 jenkins url 端口校验修改
+ v0.1.2 ✨ 1.axios替换jquery ajax 2.任务状态图标替换 3.增加任务控制台查看功能 4.任务构建进度条展示方式修改
