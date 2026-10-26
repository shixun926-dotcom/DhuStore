/* ==========================================================================
   services.js — 数据加载与业务动作（按后端 Controller 的切法分域）
   DH.services.auth / catalog / cart / order / address / admin
   约定：
     · 变更类方法一律返回 Promise，且**永不 reject**（错误已在内部提示），
       视图里可以直接 `.then(ok => ...)` 而不必写 catch。
     · 调用后端返回 401 时由 core.request 统一处理，这里拿到 HANDLED 哨兵即静默退出。
   ========================================================================== */
window.DH = window.DH || {};

(function (DH) {
'use strict';

var api = DH.api.request;
var U = DH.util;

/* store 由 core.initStore 在 Vue 就绪后创建，不能在模块作用域缓存引用 */
function S() { return DH.store; }

/* ------------------------------------------------- 一、商品与分类 */

function buildQuery(params) {
  var p = params || {}, q = [];
  if (p.categoryId !== undefined && p.categoryId !== null && p.categoryId !== '') {
    q.push('categoryId=' + encodeURIComponent(p.categoryId));
  }
  if (p.keyword) q.push('keyword=' + encodeURIComponent(p.keyword));
  if (p.status !== undefined && p.status !== null && p.status !== '') {
    q.push('status=' + encodeURIComponent(p.status));
  }
  q.push('page=' + (p.page || 1));
  q.push('size=' + (p.size || 12));
  return q.join('&');
}

/** 后端 Product → 视图对象；顺带把占位图标/主色记进 pmeta 供购物车与订单行复用 */
function adapt(p) {
  if (!p) return null;
  var cid = p.categoryId !== undefined && p.categoryId !== null ? p.categoryId : p.cat;
  var meta = S().catMeta[cid];
  var out = {
    id: p.id,
    name: p.name || '未命名商品',
    sub: p.subtitle || p.sub || '',
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    sales: Number(p.sales) || 0,
    status: p.status === undefined || p.status === null ? 1 : Number(p.status),
    mainImage: p.mainImage || '',
    images: Array.isArray(p.images) && p.images.length
      ? p.images.slice()
      : (p.mainImage ? [p.mainImage] : []),
    detail: p.detail || '',
    cat: cid,
    /* emoji/hue 是纯前端的占位样式；后端若回传同名字段则优先使用 */
    emoji: p.emoji || (meta ? meta.emoji : '🛍️'),
    hue: p.hue !== undefined && p.hue !== null
      ? Number(p.hue) : (meta ? meta.hue : (Number(cid) || 0) * 67 % 360)
  };
  S().pmeta[out.id] = { name: out.name, emoji: out.emoji, hue: out.hue, mainImage: out.mainImage };
  return out;
}

/** 后端 CartItemVO → 视图对象（checked 归一成 0/1，quantity 至少为 1） */
function adaptCart(it) {
  var m = S().pmeta[it.productId] || {};
  return {
    id: it.id,
    productId: it.productId,
    productName: it.productName || m.name || '商品',
    mainImage: it.mainImage || m.mainImage || '',
    price: Number(it.price) || 0,
    stock: Number(it.stock) || 0,
    quantity: Math.max(1, Number(it.quantity) || 1),
    checked: Number(it.checked) === 1 ? 1 : 0,
    emoji: m.emoji || '🛍️',
    hue: m.hue !== undefined ? m.hue : 210
  };
}

/** 分类只拉一次；后续调用直接复用缓存 */
function loadCats(force) {
  if (S().cats.length && !force) return Promise.resolve(S().cats);
  return api('GET', '/categories').then(function (list) {
    S().cats = U.listOf(list).map(function (c) {
      var m = DH.data.catMeta(c);
      S().catMeta[c.id] = m;
      return { id: c.id, name: c.name || ('分类 ' + c.id), icon: c.icon || '',
               emoji: m.emoji, hue: m.hue, count: Number(c.count) || 0, productCount: Number(c.productCount) || 0 };
    });
    /* 分类拿到后，早先加载的商品重新着色 */
    (S().homeProducts || []).forEach(function (p) { if (p) adapt(p); });
    return S().cats;
  }, function (e) {
    if (e === U.HANDLED) return S().cats;
    throw e;
  });
}

function loadProducts(params) {
  return api('GET', '/products?' + buildQuery(params));
}

/* ------------------------------------------------------------ 图片上传 */

var MAX_IMAGE_SIZE = 5 * 1024 * 1024;
var IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** 前端预校验：格式 + 大小；返回错误文案，通过则返回空串 */
function checkImage(file) {
  if (!file) return '请选择图片';
  if (!IMAGE_EXT.test(file.name || '')) return '仅支持 JPG、JPEG、PNG、WEBP 格式';
  if (file.size > MAX_IMAGE_SIZE) return '单张图片大小不能超过5MB';
  return '';
}

/** 上传单张图片，resolve 图片 URL */
function uploadImage(file) {
  var err = checkImage(file);
  if (err) return Promise.reject({ code: -2, message: err });

  var fd = new FormData();
  fd.append('file', file);
  var headers = {};
  var t = DH.api.getToken();
  if (t) headers.Authorization = 'Bearer ' + t;

  return fetch(DH.api.BASE + '/common/upload', { method: 'POST', headers: headers, body: fd })
    .then(function (res) {
      return res.text().then(function (txt) {
        var j = null;
        try { j = JSON.parse(txt); } catch (e) { /* 非 JSON */ }
        if (j && typeof j.code === 'number') {
          if (j.code === 200) return j.data;
          if (j.code === 401) {
            DH.api.clearSession();
            DH.toast('登录已过期，请重新登录', '🔒');
            DH.router.go('/user?tab=login');
            throw U.HANDLED;
          }
          throw { code: j.code, message: j.message || '上传失败' };
        }
        throw { code: res.status || 500, message: '图片上传失败，请重试' };
      });
    }, function () {
      throw { code: -1, message: '图片上传失败，请检查网络后重试' };
    });
}

/* ------------------------------------------------------------- 二、认证 */

/** 登录并换回用户信息（含 role）；失败时 reject，由表单自行提示 */
function login(username, password) {
  return api('POST', '/auth/login', { username: username, password: password })
    .then(function (d) {
      if (!d || !d.token) throw { code: -1, message: '登录响应缺少 token 字段' };
      U.LS.set('dh_token', d.token);
      return api('GET', '/users/me');
    }).then(function (me) {
      S().user = me;
      U.LS.set('dh_user', me);
      return me;
    });
}

/** 注册：若后端直接返回 token 则自动登录，否则用刚注册的账号登录一次 */
function register(payload) {
  return api('POST', '/auth/register', payload).then(function (d) {
    if (d && d.token) {
      U.LS.set('dh_token', d.token);
      return api('GET', '/users/me');
    }
    return api('POST', '/auth/login', { username: payload.username, password: payload.password })
      .then(function (r) {
        if (!r || !r.token) throw { code: -1, message: '注册成功，但自动登录失败，请手动登录' };
        U.LS.set('dh_token', r.token);
        return api('GET', '/users/me');
      });
  }).then(function (me) {
    S().user = me;
    U.LS.set('dh_user', me);
    return me;
  });
}

function logout() {
  DH.api.clearSession();
  DH.toast('已退出登录', '👋');
  DH.router.go('/');
}

/** 拉取当前会话的购物车/订单/地址/待处理数（登录后调用） */
function warmUp() {
  return Promise.all([
    loadCart().catch(function () {}),
    loadOrders().catch(function () {}),
    loadAddresses().catch(function () {}),
    loadPending().catch(function () {})
  ]);
}

/* ----------------------------------------------------------- 三、购物车 */

function loadCart() {
  return api('GET', '/cart').then(function (d) {
    S().cart = U.listOf(d).map(adaptCart);
    return S().cart;
  });
}

/** 未登录就地拦截，省掉一次注定 401 的请求 */
function requireLogin() {
  if (S().user) return true;
  DH.toast('请先登录', '🔒');
  DH.router.go('/user?tab=login');
  return false;
}

/** 加入购物车。始终 resolve(boolean)，视图无需 catch */
function addCart(productId, qty, silent) {
  if (!requireLogin()) return Promise.resolve(false);
  var n = Math.max(1, Math.floor(Number(qty) || 1));
  return api('POST', '/cart', { productId: Number(productId), quantity: n }).then(function () {
    if (!silent) DH.toast('已加入购物车', '🛒');
    return loadCart().then(function () { return true; }, function () { return true; });
  }, function (e) {
    if (e !== U.HANDLED && !silent) DH.toast(U.errMsg(e), '⚠️');
    return false;
  });
}

function removeCart(line) {
  if (!line) return Promise.resolve(false);
  S().busy = true;
  return api('DELETE', '/cart/' + line.id).then(function () {
    DH.toast('已移出购物车', '🗑️');
    return loadCart().then(function () { return true; }, function () { return false; });
  }, function (e) {
    if (e !== U.HANDLED) DH.toast(U.errMsg(e), '⚠️');
    return false;
  }).then(function (r) { S().busy = false; return r; },
          function () { S().busy = false; return false; });
}

/** 后端 PUT /cart/{id} 可能整行覆盖，因此把当前 checked 一起回传 */
function setCartQty(line, v) {
  if (!line) return Promise.resolve(false);
  var n = Math.floor(Number(v) || 1);
  if (n < 1) n = 1;
  if (line.stock > 0 && n > line.stock) {
    n = line.stock;
    DH.toast('库存仅剩 ' + line.stock + ' 件', '⚠️');
  }
  if (n === line.quantity) { line.quantity = n; return Promise.resolve(true); }
  S().busy = true;
  return api('PUT', '/cart/' + line.id, { quantity: n, checked: line.checked }).then(function () {
    return loadCart().then(function () { return true; }, function () { return false; });
  }, function (e) {
    if (e !== U.HANDLED) DH.toast(U.errMsg(e), '⚠️');
    return false;
  }).then(function (r) { S().busy = false; return r; },
          function () { S().busy = false; return false; });
}

function toggleCartLine(line, checked) {
  return api('PUT', '/cart/' + line.id, { quantity: line.quantity, checked: checked ? 1 : 0 })
    .then(function () { return loadCart(); }, function (e) {
      if (e !== U.HANDLED) DH.toast(U.errMsg(e), '⚠️');
    });
}

/** 全选 / 全不选；后端无批量接口，逐行并发提交后重拉 */
function setAllChecked(checked) {
  var lines = S().cart.slice();
  if (!lines.length) return Promise.resolve(false);
  S().busy = true;
  return Promise.all(lines.map(function (it) {
    if ((it.checked === 1) === !!checked) return null;
    return api('PUT', '/cart/' + it.id, { quantity: it.quantity, checked: checked ? 1 : 0 })
      .then(function () { it.checked = checked ? 1 : 0; }, function () {});
  })).then(function () {
    return loadCart().catch(function () {});
  }).then(function () { S().busy = false; return true; },
          function () { S().busy = false; return false; });
}

function clearChecked() {
  var lines = S().cart.filter(function (i) { return i.checked === 1; });
  if (!lines.length) return Promise.resolve(false);
  S().busy = true;
  return Promise.all(lines.map(function (it) {
    return api('DELETE', '/cart/' + it.id).catch(function () {});
  })).then(function () {
    DH.toast('已删除 ' + lines.length + ' 项', '🗑️');
    return loadCart().catch(function () {});
  }).then(function () { S().busy = false; return true; },
          function () { S().busy = false; return false; });
}

/* ------------------------------------------------------------- 四、订单 */

/** 一次取回后在视图里本地分页，避免服务端分页与前端筛选互相打架 */
function loadOrders() {
  return api('GET', '/orders?page=1&size=200').then(function (d) {
    S().orders = U.listOf(d);
    return S().orders;
  });
}

/** 拉取当前角色的待处理数量，写入 store.pending（管理员=待发货，用户=待收货） */
function loadPending() {
  var s = S();
  if (!s.user) { s.pending = 0; return Promise.resolve(0); }
  var isAdmin = Number(s.user.role) === 1;
  var path = isAdmin ? '/admin/orders/summary' : '/orders/summary';
  var key = isAdmin ? 'pendingShipment' : 'pendingReceipt';
  return api('GET', path).then(function (d) {
    s.pending = Number(d && d[key]) || 0;
    return s.pending;
  }, function () { return s.pending; });
}

function createOrder(addressId, payment, remark) {
  return api('POST', '/orders', { addressId: addressId, payment: payment, remark: remark || '' });
}

function payOrder(o) {
  return act('/orders/' + o.orderNo + '/pay', '支付成功', '💰');
}

function cancelOrder(o) {
  return act('/orders/' + o.orderNo + '/cancel', '订单已取消', '🚫');
}

/** 2→3 确认收货：契约接口，后端未实现时降级提示 */
function confirmOrder(o) {
  return act('/orders/' + o.orderNo + '/confirm', '已确认收货', '✅', '后端暂未提供确认收货接口');
}

/** 再次购买：把订单里的商品逐项加回购物车 */
function rebuyOrder(o) {
  var items = (o.items || []).filter(function (g) { return Number(g.quantity) > 0; });
  if (!items.length) { DH.toast('该订单没有可购买的商品', '⚠️'); return Promise.resolve(false); }
  S().busy = true;
  return Promise.all(items.map(function (g) {
    return api('POST', '/cart', { productId: g.productId, quantity: Number(g.quantity) || 1 })
      .catch(function () {});
  })).then(function () {
    DH.toast('已加入购物车', '🛒');
    return loadCart().catch(function () {});
  }).then(function () { S().busy = false; return true; },
          function () { S().busy = false; return false; });
}

/** 订单类动作的公共外壳：置忙、成功提示并刷新、失败提示、必定复位 */
function act(path, okMsg, icon, unsupportedMsg) {
  S().busy = true;
  return api('POST', path).then(function () {
    DH.toast(okMsg, icon);
    return Promise.all([loadOrders(), loadPending()]).catch(function () {});
  }, function (e) {
    if (e === U.HANDLED) return;
    DH.toast(U.isUnsupported(e) && unsupportedMsg ? unsupportedMsg : U.errMsg(e), '⚠️');
  }).then(function () { S().busy = false; return true; },
          function () { S().busy = false; return false; });
}

/* ------------------------------------------------------------- 五、地址 */

function loadAddresses() {
  return api('GET', '/addresses').then(function (d) {
    S().addresses = U.listOf(d);
    return S().addresses;
  });
}

/** 新增或修改；传 id 走 PUT，否则 POST */
function saveAddress(body, id) {
  return api(id ? 'PUT' : 'POST', id ? '/addresses/' + id : '/addresses', body);
}

function setDefaultAddress(a) {
  S().busy = true;
  return api('PUT', '/addresses/' + a.id + '/default').then(function () {
    DH.toast('已设为默认地址', '📍');
    return loadAddresses();
  }, function (e) {
    if (e !== U.HANDLED) DH.toast(U.errMsg(e), '⚠️');
  }).then(function () { S().busy = false; return true; },
          function () { S().busy = false; return false; });
}

function deleteAddress(a) {
  S().busy = true;
  return api('DELETE', '/addresses/' + a.id).then(function () {
    DH.toast('地址已删除', '🗑️');
    return loadAddresses();
  }, function (e) {
    if (e !== U.HANDLED) DH.toast(U.errMsg(e), '⚠️');
  }).then(function () { S().busy = false; return true; },
          function () { S().busy = false; return false; });
}

/* ------------------------------------------------------------- 六、后台 */

/** 看板统计（契约接口）。resolve 的第二个分支由视图决定是降级还是报错 */
function loadStats(range) {
  return api('GET', '/admin/stats?range=' + range);
}

function loadAdminOrders(status) {
  var q = 'page=1&size=100';
  if (status !== '' && status !== undefined && status !== null) q += '&status=' + status;
  return api('GET', '/admin/orders?' + q);
}

/** 1→2 发货（契约接口，管理员） */
function shipOrder(o) {
  S().busy = true;
  return api('POST', '/orders/' + o.orderNo + '/ship').then(function () {
    DH.toast('订单 ' + o.orderNo + ' 已发货', '🚚');
  }, function (e) {
    if (e === U.HANDLED) return;
    DH.toast(U.isUnsupported(e) ? '后端暂未提供发货接口' : U.errMsg(e), '⚠️');
  }).then(function () { S().busy = false; return true; },
          function () { S().busy = false; return false; });
}

/** 商品增改（契约接口，管理员）。g.id 为 0 表示新增 */
function saveProduct(g) {
  var body = {
    name: g.name,
    subtitle: g.sub || '',
    categoryId: Number(g.cat) || null,
    price: Number(g.price) || 0,
    stock: Number(g.stock) || 0,
    sales: Number(g.sales) || 0,
    status: Number(g.status),
    mainImage: g.mainImage || '',
    images: Array.isArray(g.images) ? g.images : [],
    detail: g.detail || '',
    /* emoji/hue 是前端占位样式字段，后端可忽略 */
    emoji: g.emoji || '',
    hue: Number(g.hue) || 0
  };
  return api(g.id ? 'PUT' : 'POST', g.id ? '/products/' + g.id : '/products', body);
}

function deleteProduct(id) {
  return api('DELETE', '/products/' + id);
}

/* ------------------------------------------------- 七、商品发布申请 */

/** 提交商品发布申请 */
function applyProduct(payload) {
  return api('POST', '/product-apply', payload);
}

/** 我的商品发布申请 */
function loadMyApplies() {
  return api('GET', '/product-apply/my').then(function (d) {
    return U.listOf(d);
  });
}

/** 管理端商品发布申请列表（可按状态筛选） */
function loadApplies(status) {
  var q = (status === '' || status === undefined || status === null) ? '' : ('?status=' + status);
  return api('GET', '/admin/product-apply' + q).then(function (d) {
    return U.listOf(d);
  });
}

/** 审核通过 */
function approveApply(id) {
  return api('POST', '/admin/product-apply/' + id + '/approve');
}

/** 审核拒绝（需填原因） */
function rejectApply(id, reason) {
  return api('POST', '/admin/product-apply/' + id + '/reject', { reason: reason });
}

/* ------------------------------------------------- 八、首页轮播图 */

/** 后端 Banner → 视图对象；地址为空时标记为占位，视图层统一渲染 */
function adaptBanner(b) {
  var url = (b && (b.imageUrl || b.image)) || '';
  return {
    id: b && b.id ? b.id : null,
    imageUrl: url,
    sort: b ? b.sort : 0,
    placeholder: !url
  };
}

/** 前台读取轮播图（公开接口），同时写入全局 store 供首页复用 */
function loadBanners() {
  return api('GET', '/banners').then(function (d) {
    S().banners = U.listOf(d).map(adaptBanner);
    return S().banners;
  });
}

/** 后台读取全部轮播图（含未启用项） */
function loadAdminBanners() {
  return api('GET', '/admin/banners').then(function (d) {
    return U.listOf(d).map(adaptBanner);
  });
}

/** 新增（无 id）或替换（有 id）轮播图，参数为已上传成功的图片地址 */
function saveBanner(imageUrl, id) {
  return id
    ? api('PUT', '/admin/banners/' + id, { imageUrl: imageUrl })
    : api('POST', '/admin/banners', { imageUrl: imageUrl });
}

function deleteBanner(id) {
  return api('DELETE', '/admin/banners/' + id);
}

/* ------------------------------------------------- 九、首页促销位 */

/** 读取两个促销位的图片地址（公开接口），未配置时返回空串 */
function loadPromos() {
  return api('GET', '/home/promos').then(function (d) {
    S().promoImages = { all: (d && d.all) || '', newUser: (d && d.newUser) || '' };
    return S().promoImages;
  });
}

/** 管理员保存促销位图片；传空串表示清除图片、回到默认渐变卡片 */
function savePromos(body) {
  return api('PUT', '/admin/home/promos', body).then(function (d) {
    S().promoImages = { all: (d && d.all) || '', newUser: (d && d.newUser) || '' };
    return S().promoImages;
  });
}

/** 上传失败的提示文案：把后端业务码翻译成可执行的说明 */
function uploadMsg(e) {
  if (!e || e === U.HANDLED) return '';
  if (e.code === -2) return e.message || '图片不符合要求';
  if (e.code === 2006) return '图片大小超过 5MB，请压缩后重试';
  if (e.code === 2007) return '仅支持 JPG / PNG / WEBP 格式的图片';
  if (e.code === 2009) return '图片上传失败，请检查网络后重试';
  if (e.code === 2010) return '图片存储未配置，请联系管理员';
  return e.message || '上传失败，请重试';
}

/* ------------------------------------------------- 十、分类管理（后台） */

/** 后台分类列表：带每个分类下的商品数量 */
function loadAdminCats() {
  return api('GET', '/admin/categories').then(function (d) {
    return U.listOf(d).map(function (c) {
      return { id: c.id, name: c.name || '', sort: c.sort, status: c.status,
               icon: c.icon || '', productCount: Number(c.productCount) || 0 };
    });
  });
}

/** 新增（无 id）或编辑（有 id）分类；icon 传空串表示清除图标 */
function saveCategory(body, id) {
  return id ? api('PUT', '/admin/categories/' + id, body) : api('POST', '/admin/categories', body);
}

/** 删除分类；分类下仍有商品时后端返回 2012 */
function deleteCategory(id) {
  return api('DELETE', '/admin/categories/' + id);
}

/* ------------------------------------------------- 十一、限时秒杀位 */

/** 秒杀行 → 视图对象；id 用商品 id（跳详情），slotId 用秒杀位 id（后台增删改） */
function adaptFlash(d) {
  var meta = S().catMeta[d.categoryId] || {};
  return {
    slotId: d.id,
    id: d.productId,
    productId: d.productId,
    sort: d.sort,
    name: d.name || ('商品 ' + d.productId),
    subtitle: d.subtitle || '',
    price: Number(d.price) || 0,
    stock: Number(d.stock) || 0,
    sales: Number(d.sales) || 0,
    status: d.status,
    mainImage: d.mainImage || '',
    hue: meta.hue === undefined ? 210 : meta.hue
  };
}

/** 前台读取（后端只返回在售商品），结果写入 store 供首页复用 */
function loadFlashSale() {
  return api('GET', '/flash-sale').then(function (d) {
    S().flashSale = U.listOf(d).map(adaptFlash);
    return S().flashSale;
  });
}

/** 后台读取（含已下架商品） */
function loadAdminFlashSale() {
  return api('GET', '/admin/flash-sale').then(function (d) {
    return U.listOf(d).map(adaptFlash);
  });
}

function addFlashSale(productId) {
  return api('POST', '/admin/flash-sale', { productId: productId })
    .then(function () { return loadFlashSale(); });
}

function replaceFlashSale(slotId, productId) {
  return api('PUT', '/admin/flash-sale/' + slotId, { productId: productId })
    .then(function () { return loadFlashSale(); });
}

function removeFlashSale(slotId) {
  return api('DELETE', '/admin/flash-sale/' + slotId)
    .then(function () { return loadFlashSale(); });
}

DH.services = {
  /* 商品与分类 */
  buildQuery: buildQuery, adapt: adapt, adaptCart: adaptCart,
  loadCats: loadCats, loadProducts: loadProducts,
  /* 图片 */
  uploadImage: uploadImage, checkImage: checkImage,
  /* 认证 */
  login: login, register: register, logout: logout, warmUp: warmUp,
  /* 购物车 */
  loadCart: loadCart, requireLogin: requireLogin, addCart: addCart,
  removeCart: removeCart, setCartQty: setCartQty, toggleCartLine: toggleCartLine,
  setAllChecked: setAllChecked, clearChecked: clearChecked,
  /* 订单 */
  loadOrders: loadOrders, loadPending: loadPending, createOrder: createOrder, payOrder: payOrder,
  cancelOrder: cancelOrder, confirmOrder: confirmOrder, rebuyOrder: rebuyOrder,
  /* 地址 */
  loadAddresses: loadAddresses, saveAddress: saveAddress,
  setDefaultAddress: setDefaultAddress, deleteAddress: deleteAddress,
  /* 后台 */
  loadStats: loadStats, loadAdminOrders: loadAdminOrders,
  shipOrder: shipOrder, saveProduct: saveProduct, deleteProduct: deleteProduct,
  /* 商品发布申请 */
  applyProduct: applyProduct, loadMyApplies: loadMyApplies,
  loadApplies: loadApplies, approveApply: approveApply, rejectApply: rejectApply,
  /* 首页轮播图 */
  adaptBanner: adaptBanner, loadBanners: loadBanners, loadAdminBanners: loadAdminBanners,
  saveBanner: saveBanner, deleteBanner: deleteBanner,
  /* 首页促销位与上传提示 */
  loadPromos: loadPromos, savePromos: savePromos, uploadMsg: uploadMsg,
  /* 分类管理 */
  loadAdminCats: loadAdminCats, saveCategory: saveCategory, deleteCategory: deleteCategory,
  /* 限时秒杀位 */
  loadFlashSale: loadFlashSale, loadAdminFlashSale: loadAdminFlashSale,
  addFlashSale: addFlashSale, replaceFlashSale: replaceFlashSale, removeFlashSale: removeFlashSale
};

})(window.DH);
