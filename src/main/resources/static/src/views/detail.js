/* ==========================================================================
   views/detail.js — 商品详情
   detail 字段按纯文本渲染（CSS white-space:pre-wrap），不用 v-html —— 商品详情
   由后台录入，直接注入 HTML 等于把 XSS 入口开给管理员账号。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;

DH.views['detail-view'] = {
  template: `
<div>
  <!-- 加载中 -->
  <div v-if="loading" class="state card" style="margin-top:20px">
    <div class="spin"></div><div class="d">正在加载商品…</div>
  </div>

  <!-- 加载失败 -->
  <div v-else-if="err" class="state card" style="margin-top:20px">
    <div class="ico">📡</div>
    <div class="t">加载失败</div>
    <div class="d">{{ err }}</div>
    <div class="acts">
      <button class="btn btn-primary" @click="load">重新加载</button>
      <button class="btn" @click="go('/list')">去逛逛其他商品</button>
    </div>
  </div>

  <template v-else-if="p">
    <div class="crumb">
      <a href="#/" @click.prevent="go('/')">首页</a><span class="sp">/</span>
      <a :href="'#/list?cat='+p.cat" @click.prevent="go('/list?cat='+p.cat)">{{ catName(p.cat) }}</a>
      <span class="sp">/</span><span>{{ p.name }}</span>
    </div>

    <div class="detail">
      <!-- 图区 -->
      <div>
        <div class="fig">
          <div class="thumb" :style="{'--h':p.hue}">
            <span>{{ p.emoji }}</span>
            <img v-if="gallery[viewIdx]" :src="gallery[viewIdx]" alt="" class="gone"
                 @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
          </div>
        </div>
        <div class="thumbs" v-if="gallery.length > 1">
          <div class="t" v-for="(v,i) in gallery" :key="i" :class="{on:i===viewIdx}" @click="viewIdx=i">
            <div class="thumb" :style="{'--h':(p.hue+i*26)%360}">
              <span>{{ p.emoji }}</span>
              <img v-if="v" :src="v" alt="" class="gone"
                   @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
            </div>
          </div>
        </div>
      </div>

      <!-- 信息区 -->
      <div>
        <h1 class="d-title">{{ p.name }}</h1>
        <div class="d-sub" v-if="p.sub">{{ p.sub }}</div>

        <div class="price-box">
          <div class="big"><span class="cur">¥</span>{{ money(p.price) }}</div>
          <div class="meta">
            <span>累计销量 <b>{{ p.sales || 0 }}</b> 件</span>
            <span>库存 <b>{{ p.stock }}</b> 件</span>
            <span>商品编号 <b>DH{{ String(p.id).padStart(6,'0') }}</b></span>
          </div>
        </div>

        <div class="opt-row">
          <div class="k">服务</div>
          <div class="opt" style="align-items:center;gap:10px">
            <span class="tag tag-ok" v-if="p.stock>0">🚚 现货 · 48 小时内发出</span>
            <span class="tag tag-warn" v-else>⏳ 暂时缺货</span>
          </div>
        </div>

        <div class="opt-row">
          <div class="k">数量</div>
          <div class="opt" style="align-items:center;gap:12px">
            <div class="qty">
              <button :disabled="qty<=1" @click="qty--">−</button>
              <input v-model.number="qty" @change="fixQty">
              <button :disabled="qty>=p.stock" @click="qty++">＋</button>
            </div>
            <span style="font-size:12.5px;color:var(--ink-3)">最多可购 {{ p.stock }} 件</span>
          </div>
        </div>

        <div class="buy-row">
          <button class="btn btn-lg btn-primary" style="flex:1" :disabled="busy || p.stock<=0"
                  @click="addToCart">
            🛒 {{ busy ? '处理中…' : '加入购物车' }}
          </button>
          <button class="btn btn-lg btn-dark" style="flex:1" :disabled="busy || p.stock<=0"
                  @click="buyNow">⚡ 立即购买</button>
        </div>

        <div style="display:flex;gap:20px;margin-top:16px;font-size:12.5px;color:var(--ink-3);flex-wrap:wrap">
          <span>✅ 正品保障</span><span>↩️ 7 天无理由</span><span>🛡️ 全国联保</span><span>🚚 满 99 包邮</span>
        </div>
      </div>
    </div>

    <!-- 商品详情 -->
    <div class="card" style="margin-top:20px;padding:22px 24px">
      <div class="sec-title" style="font-size:16px;margin-bottom:14px">商品详情</div>
      <p class="detail-rich" v-if="p.detail">{{ p.detail }}</p>
      <p v-else style="font-size:13.5px;color:var(--ink-3);line-height:1.9">
        该商品尚未填写详情描述。可在管理后台编辑商品补充 <code>detail</code> 字段。
      </p>
    </div>

    <!-- 相关推荐 -->
    <section class="sec" v-if="related.length">
      <div class="sec-hd"><div class="sec-title">相关推荐</div></div>
      <div class="goods"><goods-card v-for="r in related" :key="r.id" :p="r"></goods-card></div>
    </section>
  </template>

  <!-- 商品不存在 -->
  <div v-else class="empty card" style="margin-top:20px">
    <div class="ico">📦</div><div>商品不存在或已下架</div>
    <button class="btn btn-primary" @click="go('/list')">去逛逛其他商品</button>
  </div>
</div>`,

  props: { pid: { type: String, default: '' } },
  data: function () {
    return { p: null, related: [], qty: 1, viewIdx: 0, loading: false, err: '' };
  },
  computed: {
    /* 多图：images 按 sort 返回，第一张为主图；无 images 时回退主图 */
    gallery: function () {
      if (!this.p) return [];
      if (Array.isArray(this.p.images) && this.p.images.length) return this.p.images;
      return this.p.mainImage ? [this.p.mainImage] : [];
    }
  },
  mounted: function () { this.load(); },
  watch: {
    pid: function () {
      this.qty = 1;
      this.viewIdx = 0;
      this.load();
    }
  },
  methods: {
    load: function () {
      var self = this, id = this.pid;
      if (!id) { this.p = null; this.err = ''; this.loading = false; return; }
      this.loading = true;
      this.err = '';
      this.p = null;
      this.related = [];
      SVC.loadCats().catch(function () {});
      DH.api.request('GET', '/products/' + id).then(function (d) {
        if (String(self.pid) !== String(id)) return;
        self.p = SVC.adapt(d);
        self.loading = false;
        self.loadRelated(d);
      }, function (e) {
        if (String(self.pid) !== String(id)) return;
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
    },
    /* 相关推荐 = 同分类下的其他商品 */
    loadRelated: function (d) {
      var self = this;
      if (!d || d.categoryId === undefined || d.categoryId === null) return;
      SVC.loadProducts({ categoryId: d.categoryId, page: 1, size: 6 }).then(function (r) {
        self.related = U.listOf(r).map(SVC.adapt).filter(function (x) {
          return String(x.id) !== String(d.id);
        }).slice(0, 4);
      }, function () { self.related = []; });
    },
    fixQty: function () {
      if (!this.p) return;
      var v = Math.floor(Number(this.qty) || 1);
      if (v < 1) v = 1;
      if (this.p.stock > 0 && v > this.p.stock) {
        v = this.p.stock;
        this.toast('库存仅剩 ' + this.p.stock + ' 件', '⚠️');
      } else if (this.p.stock <= 0) {
        v = 1;
      }
      this.qty = v;
    },
    addToCart: function () {
      var self = this;
      this.fixQty();
      if (this.p.stock <= 0) return this.toast('该商品暂时缺货', '⚠️');
      SVC.addCart(this.p.id, this.qty).then(function (ok) { if (ok) self.go('/cart'); });
    },
    /* 立即购买 = 加购后直达结算（静默，不重复提示） */
    buyNow: function () {
      var self = this;
      this.fixQty();
      if (this.p.stock <= 0) return this.toast('该商品暂时缺货', '⚠️');
      SVC.addCart(this.p.id, this.qty, true).then(function (ok) { if (ok) self.go('/checkout'); });
    }
  }
};

})(window.DH);
