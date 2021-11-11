<template>
  <n-button @click="activate">打开</n-button>
  <n-drawer
    placement="left"
    v-model:show="active"
    :width="`90%`"
    :height="`100%`"
  >
    <n-drawer-content closable>
      <template #header>我是表頭</template>
      <div>我是身體</div>
      <template #footer>
        <n-button>Footer</n-button>
      </template>
    </n-drawer-content>
  </n-drawer>
  <n-divider>我是分隔線</n-divider>
  <h1>{{ doubleCount }}</h1>
  <h2>{{ doubleGet }}</h2>
  <n-button type="primary" @click="increment()">點擊</n-button>
</template>

<script>
import { defineComponent, ref } from "vue";
import { NButton, NDrawer, NDrawerContent, NDivider } from "naive-ui";
import { storeToRefs } from "pinia"; // storeToRefs 加入就可以做解構
import { useCounterStore } from "../store/index";
export default defineComponent({
  components: {
    NButton,
    NDrawer,
    NDrawerContent,
    NDivider,
  },
  setup() {
    const store = useCounterStore();
    const { count, doubleCount, doubleGet, increment } = storeToRefs(store);
    const active = ref(false);
    const activate = () => {
      active.value = true;
    };
    return {
      count,
      store,
      doubleCount,
      doubleGet,
      increment,
      active,
      activate,
    };
  },
});
</script>
<style lang="scss">
.footerWrap {
  display: flex;
  justify-content: center;
  background-color: #eee;
  border-radius: 8px;
  padding: 10px;
  margin: 10px;
}
</style>
