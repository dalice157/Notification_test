<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js + TypeScript App" />
  </div>
  <n-button @click="createNotify()">Create</n-button>
  <n-button type="primary" @click="notifyMe()">通知我</n-button>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { NButton } from "naive-ui";
import HelloWorld from "@/components/HelloWorld.vue"; // @ is an alias to /src

export default defineComponent({
  name: "Home",
  components: {
    HelloWorld,
    NButton,
  },
  setup() {
    // Case 1: 建立簡單的通知
    // Case 1: 建立簡單的通知
    var notifyConfig = {
      body: "\\ ^o^ /",
      icon: "https://cythilya.github.io/public/favicon.ico",
    };

    function createNotify() {
      var notification = null;
      if (!("Notification" in window)) {
        // 檢查瀏覽器是否支援通知
        console.log("This browser does not support notification");
      } else if (Notification.permission === "granted") {
        // 使用者已同意通知
        console.log("granted", Notification.permission);
        notification = new Notification(
          "Thanks for granting this permission.",
          notifyConfig
        );
        console.log("notification", notification);
      } else if (Notification.permission !== "denied") {
        console.log("denied", Notification.permission);
        // 通知權限為 default (未要求) or undefined (老舊瀏覽器的未知狀態)，向使用者要求權限
        Notification.requestPermission(function (permission) {
          if (permission === "granted") {
            notification = new Notification("Hi there!", notifyConfig);
          }
        });
      }
      return notification;
    }

    // Case 2: 加上標籤
    function notifyMe() {
      var tagList = ["newArrival", "newFeature", "newMsg", "promotion"];
      var len = tagList.length;
      var times = 0;
      var timerNewArrival = setInterval(function () {
        sendNotify({
          title: tagList[times % len] + " " + times,
          body: "\\ ^o^ /",
          tag: tagList[times % len],
          icon: "https://cythilya.github.io/public/favicon.ico",
          url: "http://www.ruten.com.tw/",
        });
        if (times++ == 20) {
          clearInterval(timerNewArrival);
        }
      }, 1000);
    }

    function sendNotify(msg: {
      title: any;
      body: any;
      tag: any;
      icon: any;
      url: any;
    }) {
      var notify = new Notification(msg.title, {
        icon: msg.icon,
        body: msg.body,
        tag: msg.tag,
      });
      console.log("msg:", msg);
      console.log("notify:", notify);

      if (msg.url) {
        notify.onclick = function (e) {
          // Case 3: 綁定 click 事件
          e.preventDefault();
          window.open(msg.url);
        };
      }
    }
    return {
      createNotify,
      notifyMe,
    };
  },
});
</script>
