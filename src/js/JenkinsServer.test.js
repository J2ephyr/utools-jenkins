import JenkinsServer from './JenkinsServer.js';
import {expect} from 'chai';

let config = {
  "active": true,
  "alias": "测试",
  "url": "http://127.0.0.1:8080",
  "username": "admin",
  "password": "admin"
}

describe('jenkins server test', function () {

  let jenkinsServer
  before(async function () {
    jenkinsServer = await JenkinsServer.build(config)
    console.log(jenkinsServer)
  })

  it('#init', function () {
    let js = new JenkinsServer(config)
    return js._init().then(() => {
      expect(js).to.not.be.undefined
      expect(js).to.have.property('baseInfo')
      expect(js).to.have.property('crumb')
    })
  })

  it('#getBuild', function () {
    return jenkinsServer.getBuild('simple-java-maven-app', 38).then(res => {
      return res
    })
  })

})
