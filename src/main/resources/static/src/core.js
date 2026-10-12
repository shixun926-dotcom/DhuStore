/* ==========================================================================
   core.js — 工具函数 / 静态字典 / 全局状态 / 提示 / 路由 / API 封装
   命名空间：DH.util  DH.data  DH.store  DH.toast  DH.router  DH.api
   本文件不依赖 Vue，可在 Vue 就绪前加载。
   ========================================================================== */
window.DH = window.DH || {};

(function (DH) {
'use strict';

/* ------------------------------------------------------------ 1. 通用工具 */

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

/* 金额：千分位 + 最多两位小数，尾部 0 省略 */
function money(v) {
  var n = Number(v);
  if (!isFinite(n)) n = 0;
  var s = Math.abs(n).toFixed(2);
  if (/\.00$/.test(s)) s = s.slice(0, -3);
  else if (/0$/.test(s)) s = s.slice(0, -1);
  var parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + parts.join('.');
}

/* 大数缩写：12345 → 1.2万 */
function compact(v) {
  var n = Number(v) || 0;
  var a = Math.abs(n);
  if (a >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿';
  if (a >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
  return money(n);
}

/* 时间：兼容 ISO 串 / 'YYYY-MM-DD HH:mm:ss' / Jackson 数组 / 时间戳 */
function fmtTime(t) {
  if (t === null || t === undefined || t === '') return '—';
  var d;
  if (typeof t === 'number') d = new Date(t);
  else if (Array.isArray(t)) d = new Date(t[0], (t[1] || 1) - 1, t[2] || 1, t[3] || 0, t[4] || 0, t[5] || 0);
  else d = new Date(String(t).replace(/\//g, '-').replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(t);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
    ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/* localStorage 安全读写（file:// 或隐私模式下可能不可用） */
var LS = {
  get: function (k, dv) {
    try { var v = localStorage.getItem(k); return v === null ? dv : JSON.parse(v); }
    catch (e) { return dv; }
  },
  set: function (k, v) {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { /* 忽略 */ }
  }
};

/* 后端列表接口兼容：可能是 PageResult，也可能直接是数组 */
function listOf(d) {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.list)) return d.list;
  if (d && Array.isArray(d.records)) return d.records;
  return [];
}
function totalOf(d) {
  if (Array.isArray(d)) return d.length;
  if (d && d.total !== undefined && d.total !== null) return Number(d.total) || 0;
  return listOf(d).length;
}
function pagesOf(d, size) {
  if (d && !Array.isArray(d) && d.totalPages) return Math.max(1, Number(d.totalPages) || 1);
  return Math.max(1, Math.ceil(totalOf(d) / (size || 12)));
}

/* 401 已由 api 统一处理（清会话 + 跳登录），调用方收到此哨兵时静默退出，不重复提示 */
var HANDLED = { handled: true };

function errMsg(e) {
  if (!e) return '未知错误';
  if (e === HANDLED) return '';
  return e.message || '请求失败';
}
/* 后端未实现该接口（Spring 默认 404/405，或信封里就是 404/405） */
function isUnsupported(e) {
  return !!e && e !== HANDLED && (e.code === 404 || e.code === 405);
}

/* 表单初值 */
function blankAddr() {
  return { receiverName: '', receiverPhone: '', province: '', city: '', district: '', detail: '', isDefault: false };
}
function blankProduct(cat) {
  return {
    id: 0, name: '', sub: '', cat: cat ? cat.id : null, price: 0, stock: 100, sales: 0,
    status: 1, mainImage: '', detail: '',
    emoji: cat ? cat.emoji : '🛍️', hue: cat ? cat.hue : 210
  };
}

DH.util = {
  pad2: pad2, money: money, compact: compact, fmtTime: fmtTime, LS: LS,
  listOf: listOf, totalOf: totalOf, pagesOf: pagesOf,
  HANDLED: HANDLED, errMsg: errMsg, isUnsupported: isUnsupported,
  blankAddr: blankAddr, blankProduct: blankProduct
};

/* ---------------------------------------------------------- 2. 静态字典 */

var BANNERS = [
  { id: 1, kicker: '新品首发', title: '数码焕新季', desc: '手机 / 电脑 / 智能设备，以旧换新最高补贴 800 元',
    btn: '立即选购', to: '/list', goo: '📱', bg: 'linear-gradient(120deg,#2a78d6,#5aa9f5)' },
  { id: 2, kicker: '限时折扣', title: '家居生活节', desc: '全场家电低至 5 折，满 999 再减 100',
    btn: '去看看', to: '/list', goo: '🛋️', bg: 'linear-gradient(120deg,#eb6834,#ffa06b)' },
  { id: 3, kicker: '会员专享', title: '美妆个护周', desc: '大牌正品直降，下单即赠旅行装小样',
    btn: '马上抢购', to: '/list', goo: '💄', bg: 'linear-gradient(120deg,#6250d6,#9b8cf0)' }
];

var PROMISES = [
  { g: '🚚', t: '极速配送', d: '48 小时内发出' },
  { g: '✅', t: '正品保障', d: '官方授权渠道' },
  { g: '↩️', t: '7 天无理由', d: '不满意随时退' },
  { g: '🛡️', t: '全国联保', d: '售后无忧' }
];

/* 订单状态：后端 status 0–4（用整数做键，才能直接索引） */
var STATUS = {
  0: { text: '待付款', icon: '⏰', color: '#d03b3b' },
  1: { text: '已付款', icon: '💰', color: '#eda100' },
  2: { text: '已发货', icon: '🚚', color: '#2a78d6' },
  3: { text: '已完成', icon: '✅', color: '#0ca30c' },
  4: { text: '已取消', icon: '🚫', color: '#898781' }
};
function statusOf(s) {
  return STATUS[Number(s)] || { text: '未知状态', icon: '❔', color: '#898781' };
}
/* 支付方式：1 在线支付 / 2 货到付款 */
function payText(p) {
  var n = Number(p);
  return n === 1 ? '在线支付' : n === 2 ? '货到付款' : '未选择';
}

/* 分类图标/主色：后端只给 id + name，按名称关键词匹配；未知分类用 id 推一个稳定的色相 */
var CAT_ICON = [
  { re: /手机|数码|通讯|电子|智能/, emoji: '📱', hue: 220 },
  { re: /电脑|办公|笔记本|外设/, emoji: '💻', hue: 228 },
  { re: /家电|电器|厨电|生活电/, emoji: '🔌', hue: 190 },
  { re: /服饰|男装|女装|衣|鞋|箱包/, emoji: '👕', hue: 335 },
  { re: /美妆|化妆|护肤|个护|清洁/, emoji: '💄', hue: 350 },
  { re: /食品|生鲜|零食|饮料|酒|茶/, emoji: '🍎', hue: 32 },
  { re: /图书|文娱|书|音像|文具/, emoji: '📚', hue: 265 },
  { re: /运动|户外|健身|体育/, emoji: '⚽', hue: 150 },
  { re: /母婴|玩具|童/, emoji: '🧸', hue: 45 },
  { re: /家居|家装|家具|厨具/, emoji: '🛋️', hue: 100 },
  { re: /汽车|车品|用品/, emoji: '🚗', hue: 205 },
  { re: /珠宝|钟表|饰品|眼镜/, emoji: '💎', hue: 280 }
];
var FALLBACK_ICON = ['🛍️', '🎁', '📦', '🏷️', '✨', '🎀'];

function catMeta(c) {
  var name = (c && c.name) || '';
  for (var i = 0; i < CAT_ICON.length; i++) {
    if (CAT_ICON[i].re.test(name)) return { emoji: CAT_ICON[i].emoji, hue: CAT_ICON[i].hue, name: name };
  }
  var id = Number(c && c.id) || 0;
  return { emoji: FALLBACK_ICON[id % FALLBACK_ICON.length], hue: (id * 67) % 360, name: name };
}

DH.data = {
  banners: BANNERS, promises: PROMISES,
  status: STATUS, statusOf: statusOf, payText: payText,
  catIcon: CAT_ICON, catMeta: catMeta
};

/* ---------------------------------------------------------- 3. 全局状态
   服务端是唯一事实源；store 只做会话缓存与视图快照。
   需要 Vue 的 reactive，因此由 main.js 在 Vue 就绪后调用 initStore()。 */

DH.store = null;

DH.initStore = function (Vue) {
  DH.store = Vue.reactive({
    route: { name: 'home', params: {}, query: {} },
    /* 登录态：localStorage 只保留 token 与用户快照（不含任何密码） */
    user: LS.get('dh_user', null),
    /* 后端连通性：任一请求遭遇网络层失败即置 false */
    backendOk: true,
    /* 分类 */
    cats: [],
    catMeta: {},
    /* 商品 */
    homeProducts: [],
    /* 商品 id → {name, emoji, hue, mainImage}，供购物车/订单行复用占位图 */
    pmeta: {},
    /* 购物车 / 订单 / 地址 */
    cart: [],
    orders: [],
    addresses: [],
    /* 待处理提醒数：管理员=待发货，用户=待收货 */
    pending: 0,
    /* 交互态 */
    busy: false,
    toasts: []
  });
  return DH.store;
};

/* ------------------------------------------------------------ 4. 轻提示 */
var toastSeq = 0;

function toast(msg, icon) {
  if (!msg || !DH.store) return;
  var s = DH.store;
  var id = ++toastSeq;
  s.toasts.push({ id: id, msg: msg, icon: icon || 'ℹ️' });
  setTimeout(function () {
    for (var i = 0; i < s.toasts.length; i++) {
      if (s.toasts[i].id === id) { s.toasts.splice(i, 1); return; }
    }
  }, 2600);
}
DH.toast = toast;

/* -------------------------------------------------------------- 5. 路由 */
var ROUTES = [
  { re: /^\/?$/, name: 'home' },
  { re: /^\/home$/, name: 'home' },
  { re: /^\/list$/, name: 'list' },
  { re: /^\/detail\/(\d+)$/, name: 'detail', keys: ['id'] },
  { re: /^\/cart$/, name: 'cart' },
  { re: /^\/checkout$/, name: 'checkout' },
  { re: /^\/orders$/, name: 'orders' },
  { re: /^\/user$/, name: 'user' },
  { re: /^\/admin$/, name: 'admin' }
];

function parseHash() {
  var raw = String(location.hash || '').replace(/^#/, '');
  var qi = raw.indexOf('?');
  var path = qi >= 0 ? raw.slice(0, qi) : raw;
  var query = {};
  if (qi >= 0) {
    raw.slice(qi + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = i < 0 ? kv : kv.slice(0, i);
      var v = i < 0 ? '' : kv.slice(i + 1);
      try { query[decodeURIComponent(k)] = decodeURIComponent(v); }
      catch (e) { query[k] = v; }
    });
  }
  for (var i = 0; i < ROUTES.length; i++) {
    var m = path.match(ROUTES[i].re);
    if (m) {
      var params = {};
      (ROUTES[i].keys || []).forEach(function (k, idx) { params[k] = m[idx + 1]; });
      return { name: ROUTES[i].name, params: params, query: query };
    }
  }
  return { name: '404', params: {}, query: query };
}

function syncRoute() { DH.store.route = parseHash(); }

function go(path, query) {
  var h = '#' + path;
  if (query) h += (path.indexOf('?') >= 0 ? '&' : '?') + query;
  if (location.hash === h) syncRoute();
  else location.hash = h;
}

function startRouter() {
  window.addEventListener('hashchange', function () {
    syncRoute();
    window.scrollTo(0, 0);
  });
}

DH.router = { routes: ROUTES, parseHash: parseHash, syncRoute: syncRoute, go: go, start: startRouter };

/* --------------------------------------------------------------- 6. API
   后端统一信封 {code, message, data}，HTTP 状态恒为 200。
   code 200 → 取 data；401 → 清会话并跳登录；其余抛 {code, message} 交调用方提示。
   后端未实现该路由时 Spring 会返回 404/405 的普通错误页，同样转成 {code, message}。 */

var API_BASE = '/api';   // 后端托管时用相对路径；若直接双击 file:// 调试，改成 'http://localhost:8080/api'

function getToken() { return LS.get('dh_token', null); }

function clearSession() {
  LS.set('dh_token', null);
  LS.set('dh_user', null);
  var s = DH.store;
  if (s) { s.user = null; s.cart = []; s.orders = []; s.addresses = []; s.pending = 0; }
}

function request(method, path, body) {
  var headers = {};
  var t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  var opt = { method: method, headers: headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  return fetch(API_BASE + path, opt).then(function (res) {
    return res.text().then(function (txt) {
      var j = null;
      try { j = JSON.parse(txt); } catch (e) { /* 非 JSON：多为路由未实现时的 HTML 错误页 */ }
      if (j && typeof j.code === 'number') {
        if (j.code === 200) { if (DH.store) DH.store.backendOk = true; return j.data; }
        if (j.code === 401) {
          clearSession();
          toast('登录已过期，请重新登录', '🔒');
          go('/user?tab=login');
          throw HANDLED;
        }
        throw { code: j.code, message: j.message || '请求失败' };
      }
      throw { code: res.status || 500, message: '接口未实现（HTTP ' + res.status + '）' };
    });
  }, function () {
    if (DH.store) DH.store.backendOk = false;
    throw { code: -1, message: '无法连接后端服务，请确认 DhuStore 已启动' };
  });
}

/* 启动时用 token 换回最新的用户信息（含 role，管理员 = role 1） */
function restoreSession() {
  if (!getToken()) {
    if (DH.store && DH.store.user) LS.set('dh_user', null);
    if (DH.store) DH.store.user = null;
    return Promise.resolve(null);
  }
  return request('GET', '/users/me').then(function (u) {
    if (u && u !== HANDLED && DH.store) { DH.store.user = u; LS.set('dh_user', u); }
    return u;
  }, function () {
    /* 网络故障时保留缓存的 user，避免把用户直接踢下线 */
    return DH.store ? DH.store.user : null;
  });
}

DH.api = {
  BASE: API_BASE,
  getToken: getToken,
  request: request,
  clearSession: clearSession,
  restoreSession: restoreSession
};

})(window.DH);
