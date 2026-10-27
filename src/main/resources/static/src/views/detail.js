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
    <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div>
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
      <a :href="'#/list?cat='+p.cat" @click.prevent="go('/list?cat='+p.cat)"><cat-icon :cat="catOf(p.cat)" :size="16" plain></cat-icon>{{ catName(p.cat) }}</a>
      <span class="sp">/</span><span>{{ p.name }}</span>
    </div>

    <div class="detail">
      <!-- 图区 -->
      <div>
        <div class="fig">
          <div class="thumb" :style="{'--h':p.hue}">
            <ui-icon name="box"></ui-icon>
            <img v-if="gallery[viewIdx]" :src="gallery[viewIdx]" alt="" class="gone"
                 @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
          </div>
        </div>
        <div class="thumbs" v-if="gallery.length > 1">
          <div class="t" v-for="(v,i) in gallery" :key="i" :class="{on:i===viewIdx}" @click="viewIdx=i">
            <div class="thumb" :style="{'--h':(p.hue+i*26)%360}">
              <ui-icon name="box"></ui-icon>
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
            <span class="tag tag-ok" v-if="p.stock>0"><ui-icon name="truck" :size="14"></ui-icon> 现货 · 48 小时内发出</span>
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
            <ui-icon name="cart" :size="17"></ui-icon> {{ busy ? '处理中…' : '加入购物车' }}
          </button>
          <button class="btn btn-lg btn-dark" style="flex:1" :disabled="busy || p.stock<=0"
                  @click="buyNow"><ui-icon name="bolt" :size="17"></ui-icon> 立即购买</button>
        </div>

        <div style="display:flex;gap:20px;margin-top:16px;font-size:12.5px;color:var(--ink-3);flex-wrap:wrap">
          <span><ui-icon name="check" :size="14"></ui-icon> 正品保障</span><span><ui-icon name="rotate" :size="14"></ui-icon> 7 天无理由</span><span><ui-icon name="shield" :size="14"></ui-icon> 全国联保</span><span><ui-icon name="truck" :size="14"></ui-icon> 满 99 包邮</span>
        </div>
      </div>
    </div>

    <!-- 发布者：用户商品可关注/私信；平台自营整卡可点，点击进入与官方账号的会话 -->
    <div class="card seller-card" v-if="seller" :class="{ 'is-link': seller.platform && !seller.self }"
         @click="seller.platform && contactOfficial()">
      <div class="seller-av" :class="{ img: !!seller.avatar }">
        <img v-if="seller.avatar" :src="seller.avatar" :alt="seller.nickname">
        <span v-else>{{ (seller.nickname || '店').charAt(0) }}</span>
      </div>
      <div class="seller-tx">
        <div class="seller-nm">
          {{ seller.nickname }}
          <span class="tag tag-brand" v-if="!seller.platform && seller.role===1">管理员</span>
          <span class="tag" v-if="seller.platform">官方</span>
        </div>
        <div class="seller-sub" v-if="seller.platform">
          由东华购物官方发货并提供售后<span v-if="seller.self" class="seller-me">当前登录的正是官方账号</span>
        </div>
        <div class="seller-sub" v-else>
          <b>{{ seller.followerCount }}</b> 位用户收藏<span v-if="seller.self" class="seller-me">这是你自己发布的商品</span>
        </div>
      </div>
      <div class="seller-acts" v-if="!seller.platform && !seller.self">
        <button class="btn btn-sm" :class="{ 'btn-primary': !seller.following }"
                :disabled="following" @click="toggleFollowSeller">
          <ui-icon :name="seller.following ? 'check' : 'plus'" :size="14"></ui-icon>
          {{ seller.following ? '已收藏' : '收藏店铺' }}
        </button>
        <button class="btn btn-sm btn-dark" @click="openChat">
          <ui-icon name="chat" :size="14"></ui-icon> 发消息
        </button>
      </div>
      <span class="seller-go" v-else-if="seller.platform && !seller.self">
        联系官方客服<ui-icon name="arrowRight" :size="14"></ui-icon>
      </span>
    </div>

    <!-- 商品详情 -->
    <div class="card" style="margin-top:20px;padding:22px 24px">
      <div class="sec-title" style="font-size:16px;margin-bottom:14px">商品详情</div>
      <p class="detail-rich" v-if="p.detail">{{ p.detail }}</p>
      <p v-else style="font-size:13.5px;color:var(--ink-3);line-height:1.9">
        暂无商品详情。商家暂未补充图文介绍，可先通过上方图片与规格了解商品。
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
    <div class="ico"><ui-icon name="box" :size="34"></ui-icon></div><div>商品不存在或已下架</div>
    <button class="btn btn-primary" @click="go('/list')">去逛逛其他商品</button>
  </div>
</div>`,

  props: { pid: { type: String, default: '' } },
  data: function () {
    return { p: null, seller: null, following: false, related: [], qty: 1, viewIdx: 0, loading: false, err: '' };
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
      this.seller = null;
      this.related = [];
      SVC.loadCats().catch(function () {});
      /* 发布者摘要在商品加载后单独拉取：平台自营时返回 platform=true，不由商品实体携带 */
      SVC.loadSeller(id).then(function (s) {
        if (String(self.pid) !== String(id)) return;
        self.seller = s;
      }, function () { if (String(self.pid) === String(id)) self.seller = null; });
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
    /* 立即购买 = 直购结算：只结算当前商品，不写入购物车，也不受购物车勾选影响 */
    buyNow: function () {
      this.fixQty();
      if (this.p.stock <= 0) return this.toast('该商品暂时缺货', '⚠️');
      if (!SVC.requireLogin()) return;
      this.go('/checkout', 'buy=' + this.p.id + '&qty=' + this.qty);
    },
    /* 收藏 / 取消收藏店铺：未登录先引导登录（底层复用关注关系，仅在商品详情语境呈现为「收藏」） */
    toggleFollowSeller: function () {
      if (!this.store.user) return this.go('/user?tab=login');
      if (!this.seller || this.seller.platform || this.seller.self) return;
      var self = this;
      this.following = true;
      SVC.toggleFollow(this.seller).then(function (next) {
        self.following = false;
        /* 覆盖共享关注方法的通用提示，商品详情语境下统一为「收藏」语义 */
        self.toast(next ? '已收藏该店铺' : '已取消收藏', next ? '✅' : '👋');
      });
    },
    /* 发消息：带入卖家 id，个人中心消息页据此直接打开会话 */
    openChat: function () {
      if (!this.store.user) return this.go('/user?tab=login');
      if (!this.seller || !this.seller.id) return;
      this.go('/user?tab=msg&to=' + this.seller.id);
    },
    /**
     * 东华自营：没有真实卖家，私信入口指向平台官方账号（后端 role=1 的第一个账号）。
     * 三种边界：未登录先登录；站点无可用管理员时提示；当前登录就是官方账号则不跳转。
     */
    contactOfficial: function () {
      if (!this.seller || !this.seller.platform) return;
      var sid = this.seller.serviceUserId;
      if (!sid) return this.toast('官方客服暂不可用，请稍后再试', '⚠️');
      if (!this.store.user) return this.go('/user?tab=login');
      if (String(this.store.user.id) === String(sid)) {
        return this.toast('当前登录的正是官方账号', '⚠️');
      }
      this.go('/user?tab=msg&to=' + sid);
    }
  }
};

})(window.DH);
