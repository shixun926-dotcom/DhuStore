/* ==========================================================================
   main.js — 启动引导：根组件 / 全局混入 / 组件注册 / 挂载 / 会话恢复
   DH.boot(Vue) 由 index.html 底部的 CDN 加载器在 Vue 就绪后调用；
   在此之前所有模块只做定义，不碰 Vue。
   ========================================================================== */
window.DH = window.DH || {};

(function (DH) {
'use strict';

var U = DH.util, SVC = DH.services;

/* 根模板：路由分发 + 全局轻提示容器 */
var ROOT_TEMPLATE = `
<div class="app-shell">
  <app-header></app-header>

  <main class="wrap">
    <home-view      v-if="route.name==='home'"     class="view"></home-view>
    <list-view      v-else-if="route.name==='list'"     class="view"></list-view>
    <detail-view    v-else-if="route.name==='detail'"   class="view" :pid="route.params.id"></detail-view>
    <cart-view      v-else-if="route.name==='cart'"     class="view"></cart-view>
    <checkout-view  v-else-if="route.name==='checkout'" class="view"></checkout-view>
    <orders-view    v-else-if="route.name==='orders'"   class="view"></orders-view>
    <order-view      v-else-if="route.name==='order'"   class="view" :no="route.params.no"></order-view>
    <cashier-view    v-else-if="route.name==='pay'"     class="view" :no="route.params.no"></cashier-view>
    <user-view      v-else-if="route.name==='user'"     class="view"></user-view>
    <admin-view     v-else-if="route.name==='admin'"    class="view"></admin-view>
    <div v-else class="empty">
      <div class="ico"><ui-icon name="compass" :size="34"></ui-icon></div>
      <div>页面不存在</div>
      <button class="btn btn-primary" @click="go('/')">返回首页</button>
    </div>
  </main>

  <!-- 页脚只在首页展示 -->
  <app-footer v-if="route.name==='home'"></app-footer>

  <div class="toasts">
    <div class="toast" v-for="t in store.toasts" :key="t.id"><span class="g"><ui-icon v-if="toastIcon(t.icon)" :name="toastIcon(t.icon)" :size="16"></ui-icon><template v-else>{{t.icon}}</template></span>{{t.msg}}</div>
  </div>
</div>`;

/* 全局混入：所有视图共用的计算属性与工具方法，
   省掉 store / money / go 这些在每个组件里都出现的样板。 */
/* 轻提示原本用 emoji 做状态标记，这里在渲染层统一映射为线性图标，
   调用方无需改动（store.toasts 里仍是 emoji 字符串）。 */
var TOAST_ICON = {
  '✅': 'check', '⚠️': 'alert', '🚫': 'close', '🔒': 'lock', '🛒': 'cart',
  '🗑️': 'trash', '📍': 'pin', '💰': 'cash', '🚚': 'truck', '📦': 'box',
  '🎉': 'sparkle', '👋': 'logout', '🔍': 'search', '❔': 'dot'
};

var MIXIN = {
  computed: {
    store: function () { return DH.store; },
    route: function () { return DH.store.route; },
    busy: function () { return DH.store.busy; },
    banners: function () {
      var list = DH.store.banners;
      return list && list.length ? list : DH.data.bannerPlaceholders();
    },
    promises: function () { return DH.data.promises; },
    cartCount: function () {
      return DH.store.cart.reduce(function (s, i) { return s + (Number(i.quantity) || 0); }, 0);
    },
    checkedItems: function () {
      return DH.store.cart.filter(function (i) { return i.checked === 1; });
    },
    checkedCount: function () {
      return this.checkedItems.reduce(function (s, i) { return s + (Number(i.quantity) || 0); }, 0);
    },
    checkedTotal: function () {
      return this.checkedItems.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
    },
    allChecked: function () {
      return DH.store.cart.length > 0 && DH.store.cart.every(function (i) { return i.checked === 1; });
    }
  },
  methods: {
    money: U.money,
    compact: U.compact,
    fmt: U.fmtTime,
    go: DH.router.go,
    toast: DH.toast,
    errMsg: U.errMsg,
    status: DH.data.statusOf,
    payText: DH.data.payText,
    /* emoji → 线性图标名；未登记的返回空串，走原样文本兜底 */
    toastIcon: function (e) { return TOAST_ICON[e] || ''; },
    catName: function (id) {
      if (id === '' || id === null || id === undefined) return '全部商品';
      var cats = DH.store.cats;
      for (var i = 0; i < cats.length; i++) {
        if (String(cats[i].id) === String(id)) return cats[i].name;
      }
      var m = DH.store.catMeta[id];
      return m && m.name ? m.name : '其他';
    },
    /* 按 id 取分类对象（含 icon/emoji/hue），供 <cat-icon> 统一渲染 */
    catOf: function (id) {
      if (id === '' || id === null || id === undefined) return null;
      var cats = DH.store.cats || [];
      for (var i = 0; i < cats.length; i++) {
        if (String(cats[i].id) === String(id)) return cats[i];
      }
      var m = DH.store.catMeta[id] || {};
      return { id: id, name: this.catName(id), icon: '', emoji: m.emoji || '🛍️', hue: m.hue === undefined ? 210 : m.hue };
    },
    /* 订单行/购物车行只有 productId，图标与主色从商品元数据里查 */
    emojiOf: function (pid) {
      var m = DH.store.pmeta[pid];
      return m && m.emoji ? m.emoji : '🛍️';
    },
    hueOf: function (pid) {
      var m = DH.store.pmeta[pid];
      return m && m.hue !== undefined ? m.hue : 210;
    },
    itemCount: function (o) {
      var n = 0;
      ((o && o.items) || []).forEach(function (g) { n += Number(g.quantity) || 0; });
      return n;
    },
    addCart: SVC.addCart,
    remove: SVC.removeCart,
    setQty: SVC.setCartQty,
    logout: SVC.logout
  }
};

DH.boot = function (Vue) {
  if (DH._app) return DH._app;          /* 防重入：CDN 回退链可能触发多次 */
  DH.initStore(Vue);

  var app = Vue.createApp({ template: ROOT_TEMPLATE });
  app.mixin(MIXIN);

  /* 组件名 → 定义，键名即标签名 */
  var name;
  for (name in DH.components) app.component(name, DH.components[name]);
  for (name in DH.views) app.component(name, DH.views[name]);

  DH.router.start();
  DH.router.syncRoute();
  app.mount('#app');
  DH._app = app;

  /* 有 token 就恢复会话（含 role），再预取购物车/订单/地址供页头与个人中心使用 */
  DH.api.restoreSession().then(function (u) {
    if (!u) return;
    DH.chat.connect();          /* 私信实时通道：先连上再预热数据，避免漏掉期间的新消息 */
    return SVC.warmUp();
  });
  SVC.loadCats().catch(function () {});

  /* 调试出口 */
  window.__DH__ = {
    store: DH.store,
    api: DH.api.request,
    adapt: SVC.adapt,
    loadCats: SVC.loadCats,
    loadProducts: SVC.loadProducts,
    loadCart: SVC.loadCart,
    loadOrders: SVC.loadOrders,
    loadAddresses: SVC.loadAddresses,
    buildTrend: DH.chart.buildTrend,
    sparkPath: DH.chart.sparkPath,
    go: DH.router.go
  };

  return app;
};

})(window.DH);
