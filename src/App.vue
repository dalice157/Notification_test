<template>
  <div id="nav">
    <router-link to="/">Home</router-link><n-divider class="navLine" vertical />
    <router-link to="/about">About</router-link>
  </div>
  <router-view />
</template>

<script>
import { defineComponent, onMounted } from "vue";
import { NDivider } from "naive-ui";
// import { smsplugin } from "./assets/js/Janus/smsplugin";
export default defineComponent({
  components: {
    NDivider,
  },
  setup() {
    // const sms = new smsplugin();

    onMounted(() => {
      // sms();
    });
  },
});
</script>

<style lang="scss">
@import "./scss/_var.scss";
body {
  box-sizing: border-box;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
  .n-divider {
    background-color: $gray-400;
  }
  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
