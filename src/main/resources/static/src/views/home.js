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
      <div class="slide media" v-for="(b,i) in banners" :key="b.id" :class="{on:i===idx}">
        <img v-if="b.imageUrl" class="slide-img" :src="b.imageUrl" :alt="'首页轮播图 '+(i+1)">
        <div v-else class="slide-ph">
          <span>暂无轮播图</span>
          <small>管理员可在后台「首页轮播」上传，最多 5 张</small>
        </div>
      </div>
      <button class="car-nav prev" @click="idx=(idx+banners.length-1)%banners.length">‹</button>
      <button class="car-nav next" @click="idx=(idx+1)%banners.length">›</button>
      <div class="car-dots">
        <i v-for="(b,i) in banners" :key="b.id" :class="{on:i===idx}" @click="idx=i"></i>
      </div>
    </div>

    <div class="promos">
      <div class="promo" v-for="p in promos" :key="p.k" :class="{ media: !!p.image }"
           :style="p.image ? null : { background: p.bg }"
           role="link" tabindex="0" :aria-label="p.title"
           @click="go(p.to)" @keyup.enter="go(p.to)">
        <img v-if="p.image" class="promo-img" :src="p.image" :alt="p.title">
        <template v-else>
          <b>{{ p.title }}</b><small>{{ p.sub }}</small>
          <span class="go">{{ p.cta }} →</span><span class="g"><ui-icon :name="p.ic" :size="64"></ui-icon></span>
        </template>
      </div>
    </div>
  </section>

  <!-- 服务承诺 -->
  <section class="promise sec">
    <div v-for="s in promises" :key="s.t">
      <span class="ic"><img :src="s.icon" :alt="s.t"></span>
      <div class="tx"><b>{{ s.t }}</b><small>{{ s.d }}</small></div>
    </div>
  </section>

  <!-- 分类入口：整块收进白色曲面，与上方服务承诺条同一语言 -->
  <section class="sec sec-card">
    <div class="sec-hd">
      <div><div class="sec-title">全部分类</div>
        <div class="sec-sub">{{ store.cats.length }} 个分类 · {{ totalOnline }} 件商品在售</div></div>
      <a class="sec-link" href="#/list" @click.prevent="go('/list')">
        查看全部商品<ui-icon name="arrowRight" :size="13"></ui-icon></a>
    </div>
    <div class="cats-wrap" :class="{ clip: catsNeedClip && !catsExpanded }" :style="catsWrapStyle">
      <div class="cats" ref="catsGrid" v-if="store.cats.length" :style="catsMaskStyle">
        <a class="cat" v-for="c in store.cats" :key="c.id" :href="'#/list?cat='+c.id"
           :class="{ 'has-img': !!c.cover }" @click.prevent="go('/list?cat='+c.id)">
          <span class="cat-fig" :style="{ '--h': c.hue }">
            <img v-if="c.cover" :src="c.cover" :alt="c.name" loading="lazy"
                 @error="c.cover = ''">
            <cat-icon v-else :cat="c" :size="38"></cat-icon>
          </span>
          <span class="cat-shade"></span>
          <span class="cat-tx">
            <b>{{ c.name }}</b>
            <small :class="{ dim: !c.onlineCount }">{{ c.onlineCount ? c.onlineCount + ' 件在售' : '暂无在售' }}</small>
          </span>
        </a>
      </div>
      <div v-else class="skel" style="height:118px"></div>

      <!-- 收起态：按钮压在第三排可见区域的中线上 -->
      <div class="cats-more" v-if="catsNeedClip && !catsExpanded" :style="{ top: catsBtnTop + 'px' }">
        <button class="btn cats-btn" @click="toggleCats">
          展示全部<span class="cnt">共 {{ store.cats.length }} 个分类</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
               stroke-width="1.6" stroke-linecap="round"><path d="M2 4l3 3 3-3"/></svg>
        </button>
      </div>
    </div>

    <!-- 展开态：按钮移到列表下方，不再遮挡任何卡片 -->
    <div class="cats-foot" v-if="catsNeedClip && catsExpanded">
      <button class="btn cats-btn" @click="toggleCats">
        收起
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round"><path d="M2 6l3-3 3 3"/></svg>
      </button>
    </div>
  </section>

  <!-- 限时秒杀 -->
  <section class="flash sec" v-if="flashGoods.length">
    <div class="flash-hd">
      <h3><ui-icon name="bolt" :size="17"></ui-icon> 限时秒杀</h3>
      <span class="sub">每日 10:00 / 20:00 两场 · 抢完即止</span>
      <div class="clock">
        <span style="font-size:12px;color:var(--ink-3)">距本场结束</span>
        <i>{{ clock.h }}</i><s>:</s><i>{{ clock.m }}</i><s>:</s><i>{{ clock.s }}</i>
      </div>
    </div>
    <div class="flash-grid">
      <div class="fcard" v-for="p in flashGoods" :key="p.id" @click="go('/detail/'+p.id)">
        <span class="hot"><span>{{ p.stock > 0 ? '爆价' : '售罄' }}</span></span>
        <div class="thumb" :style="{'--h':p.hue,'--fs':'64px'}">
          <ui-icon name="box"></ui-icon>
          <img v-if="p.mainImage" :src="p.mainImage" alt="" class="gone"
               @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
        </div>
        <div class="bd">
          <div class="nm">{{ p.name }}</div>
          <div class="row" style="margin-top:6px">
            <span class="f-price"><span class="cur">¥</span>{{ money(p.price) }}</span>
          </div>
          <div class="progress"><i :style="{width: p.progress+'%'}"></i></div>
          <div class="progress-txt">
            <span>已售 {{ p.progress }}%</span>
            <span v-if="p.stock > 0">仅剩 {{ p.stock }} 件</span>
            <span v-else class="out">已售罄</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 商品列表：同样收进白色曲面，标题与卡片带成为一个视觉单元 -->
  <section class="sec sec-card">
    <div class="sec-hd">
      <div><div class="sec-title">为你推荐</div><div class="sec-sub">按热度与库存精选，随时可下单</div></div>
      <a class="sec-link" href="#/list" @click.prevent="go('/list')">
        更多<ui-icon name="arrowRight" :size="13"></ui-icon></a>
    </div>

    <div v-if="err" class="state card">
      <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div>
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
      <div class="ico"><ui-icon name="box" :size="34"></ui-icon></div>
      <div class="t">暂无在售商品</div>
      <div class="d">后端商品表还没有上架商品，登录管理后台添加，或向 <code>product</code> 表插入数据。</div>
    </div>
  </section>
</div>`,

  data: function () {
    return {
      loading: false, err: '', idx: 0, clock: { h: '00', m: '00', s: '00' }, _t: 0, _ct: 0,
      /* 分类区折叠：两排半可见 + 第三排渐变淡出；数值全部按实际布局测量，不写死 */
      catsExpanded: false, catsNeedClip: false,
      catsClipH: 0, catsFullH: 0, catsFadeStart: 0, catsBtnTop: 0, _catsT: 0
    };
  },
  computed: {
    /* 促销位：静态文案来自 DH.data.promos，图片来自后台配置；有图则整卡变图片，跳转不变 */
    promos: function () {
      var imgs = this.store.promoImages || {};
      return DH.data.promos.map(function (p) {
        return { k: p.k, to: p.to, title: p.title, sub: p.sub, cta: p.cta,
                 bg: p.bg, ic: p.ic, image: imgs[p.k] || '' };
      });
    },
    /* 各分类在售数之和：分类区副标题用它给出真实规模，替代空泛文案 */
    totalOnline: function () {
      return (this.store.cats || []).reduce(function (n, c) {
        return n + (Number(c.onlineCount) || 0);
      }, 0);
    },
    /* 折叠态的容器高度：展开用完整高度，收起用「两排 + 半排」 */
    catsWrapStyle: function () {
      if (!this.catsNeedClip) return {};
      return { maxHeight: (this.catsExpanded ? this.catsFullH : this.catsClipH) + 'px' };
    },
    /* 只在收起态下加遮罩：前两排不透明，第三排从其上边缘线性淡到裁切边缘 */
    catsMaskStyle: function () {
      if (!this.catsNeedClip || this.catsExpanded || !this.catsClipH) return {};
      /* 第三排前 45% 保持不透明，之后才淡出：这样“半排可见”是真的看得见，
         不会因为整段线性淡出而在裁切线前就消失 */
      var solidEnd = this.catsFadeStart + (this.catsClipH - this.catsFadeStart) * 0.45;
      var g = 'linear-gradient(to bottom, #000 0px, #000 ' + solidEnd +
              'px, transparent ' + this.catsClipH + 'px)';
      return { maskImage: g, WebkitMaskImage: g };
    },
    /* 秒杀位优先用后台配置；未配置时回落到按库存自动取前 4 件。
       进度 = 已售 /（已售+库存），是真实比例 */
    flashGoods: function () {
      var list = (this.store.flashSale || []).slice(0, 4);
      if (!list.length) {
        list = this.store.homeProducts.filter(function (p) { return p && p.stock > 0; });
      }
      return list.slice(0, 4).map(function (p) {
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
    /* 分类卡片渲染完才能量高度；窗口尺寸变化后（栅格列数变了）需要重算 */
    this.$nextTick(this.measureCats);
    window.addEventListener('resize', this.onCatsResize);
  },
  beforeUnmount: function () {
    this.stopCarousel();
    clearInterval(this._ct);
    window.removeEventListener('resize', this.onCatsResize);
    clearTimeout(this._catsT);
  },
  methods: {
    load: function () {
      var self = this;
      this.loading = true;
      this.err = '';
      SVC.loadCats().then(function () { self.$nextTick(self.measureCats); }).catch(function () {});
      /* 轮播图来自后台；请求失败时保持占位，不阻塞首页其余内容 */
      SVC.loadBanners().catch(function () {});
      /* 促销位图片来自后台；失败时回落到内置渐变卡片 */
      SVC.loadPromos().catch(function () {});
      /* 秒杀位来自后台配置；失败时由上面的计算属性回落到自动取件 */
      SVC.loadFlashSale().catch(function () {});
      SVC.loadProducts({ page: 1, size: 16 }).then(function (d) {
        self.store.homeProducts = U.listOf(d).map(SVC.adapt);
        self.loading = false;
      }, function (e) {
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
    },
    /* 量出单行高度与列数：只需露出前两整排 + 第三排上半，故裁切高度 = 2 行 + 2 间隙 + 0.5 行 */
    measureCats: function () {
      var el = this.$refs.catsGrid;
      if (!el || !el.children.length) { this.catsNeedClip = false; return; }
      var first = el.children[0];
      var gap = parseFloat(getComputedStyle(el).rowGap) || 12;
      var rowH = first.offsetHeight;
      var cols = 0;
      for (var i = 0; i < el.children.length; i++) {
        if (Math.abs(el.children[i].offsetTop - first.offsetTop) < 2) cols++; else break;
      }
      if (cols < 1) cols = 1;

      /* 不超过两排就不折叠，也不出按钮 */
      this.catsNeedClip = el.children.length > cols * 2;
      if (!this.catsNeedClip) {
        this.catsClipH = 0; this.catsFullH = 0; this.catsExpanded = false;
        return;
      }
      var fadeStart = 2 * rowH + 2 * gap;      /* 第三排上边缘 */
      var clipH = fadeStart + rowH * 0.5;      /* 露出第三排的上半 */
      this.catsFadeStart = fadeStart;
      this.catsClipH = clipH;
      this.catsFullH = Math.max(clipH, el.scrollHeight + 2);
      this.catsBtnTop = fadeStart + rowH * 0.25; /* 第三排可见区域的中线 */
    },
    toggleCats: function () {
      this.catsExpanded = !this.catsExpanded;
      if (!this.catsExpanded) {
        /* 收起后重算一次，防止展开期间容器宽度变化导致裁切高度过期 */
        var self = this;
        this.$nextTick(function () { self.measureCats(); });
      }
    },
    onCatsResize: function () {
      var self = this;
      clearTimeout(this._catsT);
      this._catsT = setTimeout(function () { self.measureCats(); }, 120);
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
