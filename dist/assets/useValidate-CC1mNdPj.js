function t(i,s,e){s===""||/^1\d{10}$/.test(s)?e():e(new Error("手机号码不合规"))}function o(i,s,e){s===""||/^[\w-]+@[\w-]+(\.[\w-]+)+$/.test(s)?e():e(new Error("邮箱不合规"))}export{t as a,o as u};
