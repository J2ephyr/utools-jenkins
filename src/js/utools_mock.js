import * as mock from './mock.json'
export default {
  onPluginEnter : function(){

  },
  onPluginReady : function(){

  },
  showNotification : function (msg) {

  },
  shellOpenExternal: function (url) {
    window.open(url)
  },
  db : {
    put : function(){

    },
    allDocs : function (key) {
      return mock.mock_config_list;
    }
  }
}
