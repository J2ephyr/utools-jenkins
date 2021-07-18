import utools_dev from "../js/utools_mock";

let utools = window.utools ? window.utools : utools_dev;

let utils = {
  getConfigList: function () {
    let allDocs = utools.db.allDocs("jenkins");
    console.log('config list', allDocs)
    let alldata = [];
    let noActive = true;
    for (let i = 0; i < allDocs.length; i++) {
      let data = allDocs[i];
      if (data.data.active) {
        noActive = false;
      }
      alldata.push(data);
    }

    if (noActive && alldata.length > 0) {
      alldata[0].data.active = true;
    }
    console.log('alldata', alldata)
    return alldata;
  },
  uuid: function () {
    let s = [];
    let hexDigits = "0123456789abcdef";
    for (let i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";
    return s.join("");
  },

}

export default utils;
