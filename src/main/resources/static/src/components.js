/* ==========================================================================
   components.js — 全站复用组件：页头 / 页脚 / 商品卡片
   命名空间：DH.components（对象的键就是组件名，由 main.js 统一注册）
   模板写成模板字符串而非 <script type="text/x-template">，让"结构 + 行为"
   留在同一个文件里，改一处不用跳两个地方。
   ========================================================================== */
window.DH = window.DH || {};

(function (DH) {
'use strict';

var SVC = DH.services;

/* ---------------------------------------------------------------- 页头 */

DH.components = {};

/* 全站线性图标：与首页服务承诺条同一视觉语言（24 网格 / 1.7 描边 / 圆角端点 / currentColor）。
   颜色继承父级 color，深色侧栏与白底菜单都能自适应，不再依赖系统 emoji 的彩色字形。 */
DH.icons = {
  user: '<circle cx="12" cy="8.2" r="3.6"/><path d="M4.9 20c0-3.6 3.2-5.8 7.1-5.8s7.1 2.2 7.1 5.8"/>',
  box: '<path d="M12 3 3.8 7.4v9.2L12 21l8.2-4.4V7.4L12 3Z"/><path d="M3.8 7.4 12 11.8l8.2-4.4"/><path d="M12 11.8V21"/>',
  pin: '<path d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10.6" r="2.4"/>',
  gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5"/>',
  logout: '<path d="M14.5 4.5H19a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4.5"/><path d="M10 8.5 6 12l4 3.5"/><path d="M6 12h9"/>',
  pencil: '<path d="M4 20h4L18 10l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
  key: '<circle cx="8.5" cy="12" r="3.5"/><path d="M12 12h8.5"/><path d="M16.8 12v3M19.6 12v2"/>',
  cart: '<circle cx="9.5" cy="19" r="1.4"/><circle cx="17.5" cy="19" r="1.4"/><path d="M2.8 4h2.4l2.3 10.2h10.6l2-7.2H6.2"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.6 15.6 20.5 20.5"/>',
  chart: '<path d="M4 20h16"/><path d="M7.5 20v-6.4M12 20V7.6M16.5 20v-9.4"/>',
  folder: '<path d="M3.5 7.2a1.7 1.7 0 0 1 1.7-1.7h4l2 2.4h6.6a1.7 1.7 0 0 1 1.7 1.7v7.7a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.2Z"/>',
  receipt: '<path d="M6 3.6h12v16.8l-3-1.8-3 1.8-3-1.8-3 1.8V3.6Z"/><path d="M9 8h6M9 12h6"/>',
  file: '<path d="M13.5 3.5H7A1.6 1.6 0 0 0 5.4 5.1v13.8A1.6 1.6 0 0 0 7 20.5h10a1.6 1.6 0 0 0 1.6-1.6V8.6L13.5 3.5Z"/><path d="M13.5 3.5v5.1h5.1"/><path d="M8.8 13h6.4M8.8 16.4h4.4"/>',
  image: '<rect x="3.6" y="5" width="16.8" height="14" rx="2"/><circle cx="8.6" cy="10" r="1.6"/><path d="M4.4 17.2l4.6-4.4 3.2 3 3-2.6 4.4 4"/>',
  card: '<rect x="2.8" y="5.6" width="18.4" height="12.8" rx="2"/><path d="M2.8 10h18.4"/><path d="M6.4 14.6h3.6"/>',
  cash: '<rect x="2.8" y="6.4" width="18.4" height="11.2" rx="1.8"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  bolt: '<path d="M13.2 2.8 5.6 13.4h5.2l-1 7.8 7.6-10.6h-5.2l1-7.8Z"/>',
  truck: '<path d="M2.6 8.4h9.4v8.2H2.6z"/><path d="M12 11h3.6l3.4 3.6v2h-7"/><circle cx="6.4" cy="18.6" r="1.6"/><circle cx="16" cy="18.6" r="1.6"/>',
  shield: '<path d="M12 2.8 4.9 5.7v5.2c0 4.5 3 7.8 7.1 9.5 4.1-1.7 7.1-5 7.1-9.5V5.7L12 2.8Z"/><path d="M8.9 11.9l2.2 2.2 4-4.2"/>',
  check: '<circle cx="12" cy="12" r="8.6"/><path d="M8.4 12.2l2.5 2.5 4.7-5"/>',
  rotate: '<path d="M19.6 12a7.6 7.6 0 1 1-2.2-5.4"/><path d="M19.8 3.9v4.3h-4.3"/>',
  flame: '<path d="M12 21c3.6 0 6.2-2.4 6.2-5.6 0-4.2-4.2-5.6-4.2-9.6 0 0-3.4 1.6-3.4 5 0 1.2.5 2 .5 2s-2.6-.8-2.6-3.4C6.6 12.6 5.8 13.9 5.8 15.4 5.8 18.6 8.4 21 12 21Z"/>',
  gift: '<rect x="3.6" y="9.4" width="16.8" height="10.6" rx="1.8"/><path d="M2.8 9.4h18.4"/><path d="M12 9.4V20"/><path d="M12 9.4C10.6 6 8.6 5.2 7.4 6.2c-1.4 1.2.2 3.2 4.6 3.2Zm0 0c1.4-3.4 3.4-4.2 4.6-3.2 1.4 1.2-.2 3.2-4.6 3.2Z"/>',
  diamond: '<path d="M7.6 3.8h8.8l3.6 4.8L12 20.2 4 8.6l3.6-4.8Z"/><path d="M4 8.6h16"/><path d="M9.8 8.6 12 20.2l2.2-11.6L12 3.8 9.8 8.6Z"/>',
  compass: '<circle cx="12" cy="12" r="8.8"/><path d="M15.2 8.8 13.4 13.4 8.8 15.2 10.6 10.6 15.2 8.8Z"/>',
  lock: '<rect x="4.6" y="10" width="14.8" height="10.4" rx="2"/><path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10"/>',
  cloudOff: '<path d="M6.4 17.4h9.2a4 4 0 0 0 .6-7.9A5.6 5.6 0 0 0 7.4 8.2"/><path d="M4.4 4.4l15.2 15.2"/>',
  bag: '<path d="M5.4 8.2h13.2l1 11.2a1.6 1.6 0 0 1-1.6 1.8H6a1.6 1.6 0 0 1-1.6-1.8l1-11.2Z"/><path d="M8.8 8.2V6.6a3.2 3.2 0 0 1 6.4 0v1.6"/>',
  alert: '<path d="M12 3.6 21 19.2H3L12 3.6Z"/><path d="M12 9.6v4.2"/><path d="M12 16.8h.01"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.6V12l3.1 1.8"/>',
  close: '<circle cx="12" cy="12" r="8.6"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
  trash: '<path d="M4.6 6.6h14.8"/><path d="M9.4 6.6V4.8h5.2v1.8"/><path d="M6.6 6.6 7.6 19.8A1.6 1.6 0 0 0 9.2 21.3h5.6a1.6 1.6 0 0 0 1.6-1.5l1-13.2"/><path d="M10.4 10.4v6.6M13.6 10.4v6.6"/>',
  sparkle: '<path d="M12 3.2 13.9 9l5.8 1.9-5.8 1.9L12 18.6 10.1 12.8 4.3 10.9 10.1 9 12 3.2Z"/>',
  arrowRight: '<path d="M4.6 12h14"/><path d="M13 6.4l5.6 5.6-5.6 5.6"/>',
  grid: '<rect x="3.6" y="3.6" width="7" height="7" rx="1.4"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.4"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.4"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.4"/>',
  wallet: '<path d="M3.5 7.2h16.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V5.7A1.5 1.5 0 0 1 4 4.2h12.5"/><path d="M15.5 13h4"/><circle cx="16.5" cy="13.5" r=".4"/>',
  dot: '<circle cx="12" cy="12" r="7"/>'
};

/* 图标组件：内联 SVG，颜色跟随父级 color，尺寸由 size 控制 */
DH.components['ui-icon'] = {
  props: {
    name: { type: String, default: 'dot' },
    size: { type: Number, default: 18 }
  },
  template: '<svg class="ui-ic" :width="size" :height="size" viewBox="0 0 24 24" fill="none" '
          + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '
          + 'aria-hidden="true" v-html="d"></svg>',
  computed: {
    d: function () { return DH.icons[this.name] || DH.icons.dot; }
  }
};

/* 分类图标：全站唯一的分类视觉出口。
   有配置图片时显示图片，没有时回落到按名称匹配的内置图形；
   尺寸与圆角由 size 决定，保证首页大卡、列表侧栏、面包屑三处视觉一致。 */
DH.components['cat-icon'] = {
  props: {
    cat: { type: Object, default: null },
    size: { type: Number, default: 22 },
    /* plain = 不铺底色，用于窄行内（列表筛选、面包屑） */
    plain: { type: Boolean, default: false }
  },
  template: `
<span class="ci" :class="{ 'ci-img': !!icon, plain: plain }" :style="{ '--s': size + 'px', '--h': hue }">
  <img v-if="icon" :src="icon" :alt="name">
  <ui-icon v-else name="bag" :size="size * 0.62"></ui-icon>
</span>`,
  computed: {
    icon: function () { return (this.cat && this.cat.icon) || ''; },
    name: function () { return (this.cat && this.cat.name) || ''; },
    emoji: function () { return (this.cat && this.cat.emoji) || '🛍️'; },
    hue: function () { return this.cat && this.cat.hue !== undefined ? this.cat.hue : 210; }
  }
};

DH.components['app-header'] = {
  template: [
    '<header class="header">',
    '  <div class="wrap">',
    '    <a class="logo" href="#/" @click.prevent="go(\'/\')"><img class="mark" src="/assets/img/school-logo.jpg" alt="东华大学">东华<em>购物</em></a>',

    '    <nav class="nav">',
    '      <a v-for="n in navs" :key="n.p" :class="{on:route.name===n.n}" :href="\'#\'+n.p"',
    '         @click.prevent="go(n.p)">{{ n.t }}</a>',
    '    </nav>',

    '    <div class="search">',
    '      <span class="ico"><ui-icon name="search" :size="16"></ui-icon></span>',
    '      <input class="field" v-model="kw" placeholder="搜索商品，如：手机 / 咖啡 / 跑步鞋"',
    '             @keyup.enter="submit" @focus="pop=true" @input="pop=true" @blur="closePop">',
    '      <ul class="search-pop" v-if="pop && kw.trim()">',
    '        <li v-for="p in sug" :key="p.id" @mousedown.prevent="open(p)">',
    '          <span class="thumb" :style="{\'--h\':p.hue,\'--fs\':\'17px\',width:\'32px\',\'border-radius\':\'6px\'}">',
    '            <ui-icon name="box"></ui-icon>',
    '            <img v-if="p.mainImage" :src="p.mainImage" alt="" class="gone" @load="$event.target.classList.remove(\'gone\')" @error="$event.target.classList.add(\'gone\')">',
    '          </span>',
    '          <span class="t">{{ p.name }}</span>',
    '          <span class="price">¥{{ money(p.price) }}</span>',
    '        </li>',
    '        <li v-if="searching" style="justify-content:center;color:var(--ink-3);font-size:12.5px">搜索中…</li>',
    '        <li v-else-if="!sug.length" style="justify-content:center;color:var(--ink-3);font-size:12.5px">没有匹配的商品</li>',
    '      </ul>',
    '    </div>',

    '    <div class="hd-act">',
    '      <a class="icon-btn" href="#/cart" @click.prevent="go(\'/cart\')">',
    '        <span class="g"><ui-icon name="cart" :size="19"></ui-icon></span><span>购物车</span>',
    '        <span class="badge" v-if="cartCount">{{ cartCount > 99 ? \'99+\' : cartCount }}</span>',
    '      </a>',

    '      <div style="position:relative">',
    '        <button class="icon-btn" @click.stop="menu=!menu">',
    '          <template v-if="store.user">',
    '            <img v-if="store.user.avatar" class="avatar" :src="store.user.avatar" :alt="store.user.nickname || store.user.username">',
    '            <span v-else class="avatar">{{ (store.user.nickname || store.user.username).charAt(0) }}</span>',
    '            <span>{{ store.user.nickname || store.user.username }}</span>',
    '          </template>',
    '          <template v-else><span class="g"><ui-icon name="user" :size="18"></ui-icon></span><span>登录 / 注册</span></template>',
    '          <span class="badge" v-if="showAvatarBadge">{{ pendingCount }}</span>',
    '        </button>',
    '        <div class="drop" v-if="menu" @click="menu=false">',
    '          <template v-if="store.user">',
    '            <a href="#/user" @click.prevent="go(\'/user\')"><ui-icon name="user" :size="16"></ui-icon>个人中心</a>',
    '            <a href="#/orders" @click.prevent="go(\'/orders\')"><ui-icon name="box" :size="16"></ui-icon>我的订单<b class="cnt" v-if="!isAdmin && pendingCount>0">{{ pendingCount }}</b></a>',
    '            <a href="#/user" @click.prevent="go(\'/user\',\'tab=addr\')"><ui-icon name="pin" :size="16"></ui-icon>收货地址</a>',
    '            <template v-if="store.user.role===1">',
    '              <div class="hr"></div>',
    '              <a href="#/admin" @click.prevent="go(\'/admin\')"><ui-icon name="gear" :size="16"></ui-icon>后台管理<b class="cnt" v-if="isAdmin && pendingCount>0">{{ pendingCount }}</b></a>',
    '            </template>',
    '            <div class="hr"></div>',
    '            <a href="#" @click.prevent="logout"><ui-icon name="logout" :size="16"></ui-icon>退出登录</a>',
    '          </template>',
    '          <template v-else>',
    '            <a href="#/user" @click.prevent="go(\'/user\')"><ui-icon name="key" :size="16"></ui-icon>登录</a>',
    '            <a href="#/user" @click.prevent="go(\'/user\',\'tab=reg\')"><ui-icon name="pencil" :size="16"></ui-icon>注册新账号</a>',
    '          </template>',
    '        </div>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</header>'
  ].join('\n'),

  data: function () {
    return { kw: '', pop: false, menu: false, sug: [], searching: false, _t: 0, _seq: 0 };
  },
  computed: {
    navs: function () {
      return [
        { n: 'home', t: '首页', p: '/' },
        { n: 'list', t: '全部商品', p: '/list' },
        { n: 'orders', t: '我的订单', p: '/orders' },
        { n: 'user', t: '个人中心', p: '/user' }
      ];
    },
    pendingCount: function () { return DH.store.pending || 0; },
    isAdmin: function () { return !!(this.store.user && Number(this.store.user.role) === 1); },
    showAvatarBadge: function () {
      if (!this.pendingCount) return false;
      return this.isAdmin ? this.route.name !== 'admin' : this.route.name !== 'orders';
    }
  },
  methods: {
    submit: function () {
      var v = this.kw.trim();
      if (!v) return;
      this.pop = false;
      this.go('/list?kw=' + encodeURIComponent(v));
    },
    open: function (p) { this.pop = false; this.go('/detail/' + p.id); },
    /* 用延时关闭，给下拉项的 mousedown/click 留出时间 */
    closePop: function () {
      var self = this;
      setTimeout(function () { self.pop = false; }, 180);
    }
  },
  beforeUnmount: function () { clearTimeout(this._t); },
  watch: {
    /* 输入防抖；_seq 丢弃过期响应，避免慢请求盖掉新结果 */
    kw: function (v) {
      var self = this;
      clearTimeout(this._t);
      v = (v || '').trim();
      if (!v) { this.sug = []; this.searching = false; return; }
      this._t = setTimeout(function () {
        var seq = ++self._seq;
        self.searching = true;
        SVC.loadProducts({ keyword: v, page: 1, size: 6 }).then(function (d) {
          if (seq !== self._seq) return;
          self.sug = DH.util.listOf(d).map(SVC.adapt);
          self.searching = false;
        }, function () {
          if (seq !== self._seq) return;
          self.sug = [];
          self.searching = false;
        });
      }, 260);
    }
  }
};

/* ---------------------------------------------------------------- 页脚 */

DH.components['app-footer'] = {
  template: [
    '<footer class="footer">',
    '  <div class="wrap">',
    '    <div class="cols">',
    '      <div>',
    '        <div class="logo" style="color:#fff;margin-bottom:12px"><img class="mark" src="/assets/img/school-logo.jpg" alt="东华大学">东华购物</div>',
    '        <p style="line-height:1.8;max-width:300px">东华购物 · 一站式品质生活商城。正品保障、极速配送，让每一次下单都省心。</p>',
    '        <p style="margin-top:14px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-.5px">400-800-9527</p>',
    '        <p style="font-size:12px">客服热线 7×24 小时</p>',
    '      </div>',
    '      <div>',
    '        <h4>购物指南</h4>',
    '        <ul>',
    '          <li><a href="#/list" @click.prevent="go(\'/list\')">全部商品</a></li>',
    '          <li><a href="#" @click.prevent>会员权益</a></li>',
    '          <li><a href="#" @click.prevent>常见问题</a></li>',
    '          <li><a href="#" @click.prevent>联系客服</a></li>',
    '        </ul>',
    '      </div>',
    '      <div>',
    '        <h4>配送与售后</h4>',
    '        <ul>',
    '          <li><a href="#" @click.prevent>配送方式</a></li>',
    '          <li><a href="#" @click.prevent>7 天无理由退货</a></li>',
    '          <li><a href="#" @click.prevent>价格保护</a></li>',
    '          <li><a href="#" @click.prevent>正品承诺</a></li>',
    '        </ul>',
    '      </div>',
    '      <div>',
    '        <h4>关于我们</h4>',
    '        <ul>',
    '          <li><a href="#" @click.prevent>公司简介</a></li>',
    '          <li><a href="#" @click.prevent>加入我们</a></li>',
    '          <li><a href="#" @click.prevent>隐私政策</a></li>',
    '          <li><a href="#" @click.prevent>用户协议</a></li>',
    '        </ul>',
    '      </div>',
    '    </div>',
    '    <div class="bottom">',
    '      <span>© 2026 东华购物有限公司　京ICP备 2026000000 号　食品经营许可证 JY10000000000</span>',
    '      <span>前端界面演示项目，数据来自本地后端服务</span>',
    '    </div>',
    '  </div>',
    '</footer>'
  ].join('\n')
};

/* ------------------------------------------------------------ 商品卡片 */

DH.components['goods-card'] = {
  template: [
    '<div class="gcard" :class="{\'is-soldout\': p.stock<=0}" @click="go(\'/detail/\'+p.id)">',
    '  <div class="fig">',
    '    <div class="thumb" :style="{\'--h\':p.hue}">',
    '      <ui-icon name="box"></ui-icon>',
    '      <img v-if="p.mainImage" :src="p.mainImage" alt="" class="gone"',
    '           @load="$event.target.classList.remove(\'gone\')" @error="$event.target.classList.add(\'gone\')">',
    '    </div>',
    '    <span class="corner corner-mute" v-if="p.stock<=0">暂时缺货</span>',
    '    <span class="corner corner-low" v-else-if="p.stock<30">仅剩 {{ p.stock }} 件</span>',
    '    <button class="cart-mini" title="加入购物车" :disabled="p.stock<=0 || busy"',
    '            @click.stop="addCart(p.id,1)"><ui-icon name="cart" :size="16"></ui-icon></button>',
    '  </div>',
    '  <div class="bd">',
    '    <div class="nm">{{ p.name }}</div>',
    '    <div class="sub" v-if="p.sub">{{ p.sub }}</div>',
    '    <div class="row">',
    '      <span class="price"><span class="cur">¥</span>{{ money(p.price) }}</span>',
    '      <span class="sold">{{ p.sales || 0 }} 人已购</span>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('\n'),
  props: { p: { type: Object, required: true } }
};

})(window.DH);
