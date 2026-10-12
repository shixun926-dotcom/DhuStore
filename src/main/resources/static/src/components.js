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

DH.components['app-header'] = {
  template: [
    '<header class="header">',
    '  <div class="wrap">',
    '    <a class="logo" href="#/" @click.prevent="go(\'/\')"><span class="mark">东</span>东华<em>购物</em></a>',

    '    <nav class="nav">',
    '      <a v-for="n in navs" :key="n.p" :class="{on:route.name===n.n}" :href="\'#\'+n.p"',
    '         @click.prevent="go(n.p)">{{ n.t }}</a>',
    '    </nav>',

    '    <div class="search">',
    '      <span class="ico">🔍</span>',
    '      <input class="field" v-model="kw" placeholder="搜索商品，如：手机 / 咖啡 / 跑步鞋"',
    '             @keyup.enter="submit" @focus="pop=true" @input="pop=true" @blur="closePop">',
    '      <ul class="search-pop" v-if="pop && kw.trim()">',
    '        <li v-for="p in sug" :key="p.id" @mousedown.prevent="open(p)">',
    '          <span class="thumb" :style="{\'--h\':p.hue,\'--fs\':\'17px\',width:\'32px\',\'border-radius\':\'6px\'}">',
    '            <span>{{ p.emoji }}</span>',
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
    '        <span class="g">🛒</span><span>购物车</span>',
    '        <span class="badge" v-if="cartCount">{{ cartCount > 99 ? \'99+\' : cartCount }}</span>',
    '      </a>',

    '      <div style="position:relative">',
    '        <button class="icon-btn" @click.stop="menu=!menu">',
    '          <template v-if="store.user">',
    '            <span class="avatar">{{ (store.user.nickname || store.user.username).charAt(0) }}</span>',
    '            <span>{{ store.user.nickname || store.user.username }}</span>',
    '          </template>',
    '          <template v-else><span class="g">👤</span><span>登录 / 注册</span></template>',
    '        </button>',
    '        <div class="drop" v-if="menu" @click="menu=false">',
    '          <template v-if="store.user">',
    '            <a href="#/user" @click.prevent="go(\'/user\')">👤 个人中心</a>',
    '            <a href="#/orders" @click.prevent="go(\'/orders\')">📦 我的订单</a>',
    '            <a href="#/user" @click.prevent="go(\'/user\',\'tab=addr\')">📍 收货地址</a>',
    '            <template v-if="store.user.role===1">',
    '              <div class="hr"></div>',
    '              <a href="#/admin" @click.prevent="go(\'/admin\')">⚙️ 后台管理</a>',
    '            </template>',
    '            <div class="hr"></div>',
    '            <a href="#" @click.prevent="logout">↩ 退出登录</a>',
    '          </template>',
    '          <template v-else>',
    '            <a href="#/user" @click.prevent="go(\'/user\')">🔑 登录</a>',
    '            <a href="#/user" @click.prevent="go(\'/user\',\'tab=reg\')">✍️ 注册新账号</a>',
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
    '        <div class="logo" style="color:#fff;margin-bottom:12px"><span class="mark">东</span>东华购物</div>',
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
    '<div class="gcard" @click="go(\'/detail/\'+p.id)">',
    '  <div class="fig">',
    '    <div class="thumb" :style="{\'--h\':p.hue}">',
    '      <span>{{ p.emoji }}</span>',
    '      <img v-if="p.mainImage" :src="p.mainImage" alt="" class="gone"',
    '           @load="$event.target.classList.remove(\'gone\')" @error="$event.target.classList.add(\'gone\')">',
    '    </div>',
    '    <button class="cart-mini" title="加入购物车" :disabled="p.stock<=0 || busy"',
    '            @click.stop="addCart(p.id,1)">＋</button>',
    '  </div>',
    '  <div class="bd">',
    '    <div class="nm">{{ p.name }}</div>',
    '    <div class="sub" v-if="p.sub">{{ p.sub }}</div>',
    '    <div class="meta">',
    '      <span class="tag" v-if="p.stock<=0">暂时缺货</span>',
    '      <span class="tag tag-ok" v-else-if="p.stock<30">仅剩 {{ p.stock }} 件</span>',
    '      <span v-else></span>',
    '      <span>{{ p.sales || 0 }} 人已购</span>',
    '    </div>',
    '    <div class="row">',
    '      <span class="price"><span class="cur">¥</span>{{ money(p.price) }}</span>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('\n'),
  props: { p: { type: Object, required: true } }
};

})(window.DH);
