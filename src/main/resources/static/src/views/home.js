/* ==========================================================================
   views/home.js — 首页：轮播 / 服务承诺 / 分类入口 / 限时秒杀 / 为你推荐
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;

DH.views['home-view'] = {
  template: `
<div>
  <!-- 轮播 + 促销位 -->
  <section class="banner">
    <div class="carousel" @mouseenter="stop" @mouseleave="start">
      <div class="slide" v-for="(b,i) in banners" :key="b.id"
           :class="{on:i===idx}" :style="{background:b.bg,color:'#fff'}">
        <div class="txt">
          <span class="kicker">{{ b.kicker }}</span>
          <h2>{{ b.title }}</h2>
          <p>{{ b.desc }}</p>
          <button class="btn" style="background:#fff;border-color:#fff;color:#1a1d23;font-weight:600"
                  @click="go(b.to)">{{ b.btn }} →</button>
        </div>
        <div class="g">{{ b.goo }}</div>
      </div>
      <button class="car-nav prev" @click="idx=(idx+banners.length-1)%banners.length">‹</button>
      <button class="car-nav next" @click="idx=(idx+1)%banners.length">›</button>
      <div class="car-dots">
        <i v-for="(b,i) in banners" :key="b.id" :class="{on:i===idx}" @click="idx=i"></i>
      </div>
    </div>

    <div class="promos">
      <div class="promo" style="background:linear-gradient(140deg,#2a78d6,#5aa9f5)" @click="go('/list')">
        <b>全部商品</b><small>分类浏览，一站买齐</small>
        <span class="go">立即查看 →</span><span class="g">🔥</span>
      </div>
      <div class="promo" style="background:linear-gradient(140deg,#eb6834,#ffa06b)" @click="go('/user','tab=reg')">
        <b>新人礼包</b><small>注册即领新人优惠</small>
        <span class="go">马上领取 →</span><span class="g">🎁</span>
      </div>
    </div>
  </section>

  <!-- 服务承诺 -->
  <section class="promise sec">
    <div v-for="s in promises" :key="s.t"><span class="g">{{ s.g }}</span>
      <div><b>{{ s.t }}</b><small>{{ s.d }}</small></div></div>
  </section>

  <!-- 分类入口 -->
  <section class="sec">
    <div class="sec-hd">
      <div><div class="sec-title">全部分类</div><div class="sec-sub">按需选购，快速直达</div></div>
      <a class="btn btn-sm" href="#/list" @click.prevent="go('/list')">查看全部商品 →</a>
    </div>
    <div class="cats" v-if="store.cats.length">
      <a class="cat" v-for="c in store.cats" :key="c.id" :href="'#/list?cat='+c.id"
         @click.prevent="go('/list?cat='+c.id)">
        <div class="g" :style="{'--h':c.hue}">{{ c.emoji }}</div>
        <b>{{ c.name }}</b>
        <small v-if="c.count">{{ c.count }} 件在售</small>
        <small v-else>点击选购</small>
      </a>
    </div>
    <div v-else class="skel" style="height:118px"></div>
  </section>

  <!-- 限时秒杀 -->
  <section class="flash sec" v-if="flashGoods.length">
    <div class="flash-hd">
      <h3>⚡ 限时秒杀</h3>
      <span class="sub">每日 10:00 / 20:00 两场 · 抢完即止</span>
      <div class="clock">
        <span style="font-size:12px;color:#9aa0ab">距本场结束</span>
        <i>{{ clock.h }}</i><s>:</s><i>{{ clock.m }}</i><s>:</s><i>{{ clock.s }}</i>
      </div>
    </div>
    <div class="flash-grid">
      <div class="fcard" v-for="p in flashGoods" :key="p.id" @click="go('/detail/'+p.id)">
        <div class="thumb" :style="{'--h':p.hue,'--fs':'64px'}">
          <span>{{ p.emoji }}</span>
          <img v-if="p.mainImage" :src="p.mainImage" alt="" class="gone"
               @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
        </div>
        <div class="bd">
          <div class="nm">{{ p.name }}</div>
          <div class="row" style="margin-top:8px">
            <span class="price" style="font-size:17px"><span class="cur">¥</span>{{ money(p.price) }}</span>
          </div>
          <div class="progress"><i :style="{width: p.progress+'%'}"></i></div>
          <div class="progress-txt">已售 {{ p.progress }}%　仅剩 {{ p.stock }} 件</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 商品列表 -->
  <section class="sec">
    <div class="sec-hd">
      <div><div class="sec-title">为你推荐</div><div class="sec-sub">来自本地后端服务的在售商品</div></div>
      <a class="btn btn-sm" href="#/list" @click.prevent="go('/list')">更多 →</a>
    </div>

    <div v-if="err" class="state card">
      <div class="ico">📡</div>
      <div class="t">商品加载失败</div>
      <div class="d">{{ err }}</div>
      <div class="acts"><button class="btn btn-primary" @click="load">重新加载</button></div>
    </div>

    <div v-else-if="loading" class="skel-grid">
      <div class="skel-card" v-for="n in 8" :key="n">
        <div class="ph skel"></div>
        <div class="ln skel"></div><div class="ln s skel"></div>
      </div>
    </div>

    <div v-else-if="store.homeProducts.length" class="goods">
      <goods-card v-for="p in store.homeProducts" :key="p.id" :p="p"></goods-card>
    </div>

    <div v-else class="state card">
      <div class="ico">📦</div>
      <div class="t">暂无在售商品</div>
      <div class="d">后端商品表还没有上架商品，登录管理后台添加，或向 <code>product</code> 表插入数据。</div>
    </div>
  </section>
</div>`,

  data: function () {
    return { loading: false, err: '', idx: 0, clock: { h: '00', m: '00', s: '00' }, _t: 0, _ct: 0 };
  },
  computed: {
    /* 秒杀位取在售且有库存的前 4 件；进度 = 已售 /（已售+库存），是真实比例 */
    flashGoods: function () {
      return this.store.homeProducts.filter(function (p) { return p && p.stock > 0; }).slice(0, 4).map(function (p) {
        var total = p.sales + p.stock;
        var q = Object.assign({}, p);
        q.progress = total > 0 ? Math.round(p.sales / total * 100) : 0;
        return q;
      });
    }
  },
  mounted: function () {
    this.load();
    this.startCarousel();
    this.startClock();
  },
  beforeUnmount: function () {
    this.stopCarousel();
    clearInterval(this._ct);
  },
  methods: {
    load: function () {
      var self = this;
      this.loading = true;
      this.err = '';
      SVC.loadCats().catch(function () {});
      SVC.loadProducts({ page: 1, size: 16 }).then(function (d) {
        self.store.homeProducts = U.listOf(d).map(SVC.adapt);
        self.loading = false;
      }, function (e) {
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
    },
    startCarousel: function () {
      var self = this;
      this.stopCarousel();
      if (this.banners.length < 2) return;
      this._t = setInterval(function () { self.idx = (self.idx + 1) % self.banners.length; }, 5000);
    },
    stopCarousel: function () {
      if (this._t) clearInterval(this._t);
      this._t = 0;
    },
    startClock: function () {
      var self = this;
      function tick() {
        var now = new Date();
        /* 每天 10:00 与 20:00 两场秒杀，倒计时指向下一场结束 */
        var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
          now.getHours() < 10 ? 10 : (now.getHours() < 20 ? 20 : 23),
          now.getHours() < 10 ? 0 : (now.getHours() < 20 ? 0 : 59),
          now.getHours() < 10 ? 0 : (now.getHours() < 20 ? 0 : 59));
        var s = Math.max(0, Math.floor((end - now) / 1000));
        self.clock = {
          h: U.pad2(Math.floor(s / 3600)),
          m: U.pad2(Math.floor(s % 3600 / 60)),
          s: U.pad2(s % 60)
        };
      }
      tick();
      this._ct = setInterval(tick, 1000);
    }
  }
};

})(window.DH);
