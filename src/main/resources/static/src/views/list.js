/* ==========================================================================
   views/list.js — 商品列表：侧栏分类 / 已选条件 / 分页
   后端 GET /api/products 只支持 categoryId + keyword + page + size，无排序参数，
   因此这里不提供"销量/价格"排序，避免给出点了没反应的按钮。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;

DH.views['list-view'] = {
  template: `
<div>
  <div class="crumb">
    <a href="#/" @click.prevent="go('/')">首页</a>
    <span class="sp">/</span>
    <span>{{ crumb }}</span>
    <span class="sp" v-if="q">/</span>
    <span v-if="q">搜索“{{ q }}”</span>
  </div>

  <div class="list-lay">
    <!-- 侧栏筛选 -->
    <aside class="side">
      <h4>商品分类</h4>
      <a href="#/list" :class="{on:!cat}" @click.prevent="setCat('')">
        <span>🗂️</span><span>全部商品</span>
      </a>
      <a v-for="c in store.cats" :key="c.id" :href="'#/list?cat='+c.id" :class="{on:String(cat)===String(c.id)}"
         @click.prevent="setCat(c.id)">
        <span>{{ c.emoji }}</span><span>{{ c.name }}</span>
        <span class="cnt" v-if="c.count">{{ c.count }}</span>
      </a>
    </aside>

    <!-- 结果区 -->
    <div>
      <div class="bar">
        <span style="color:var(--ink-3);font-size:13px">共 <b style="color:var(--ink)">{{ total }}</b> 件商品</span>
        <div class="sp"></div>
        <span style="color:var(--ink-3);font-size:13px">按上架时间倒序</span>
      </div>

      <div class="bar" v-if="activeChips.length" style="padding:10px 16px">
        <span style="color:var(--ink-3);font-size:13px">已选</span>
        <div class="chips">
          <span class="chip" v-for="c in activeChips" :key="c.k">{{ c.t }} <b @click="clearOne(c.k)">✕</b></span>
        </div>
        <button class="btn btn-sm btn-ghost" style="margin-left:auto" @click="clearAll">清空筛选</button>
      </div>

      <div v-if="err" class="state card">
        <div class="ico">📡</div>
        <div class="t">加载失败</div>
        <div class="d">{{ err }}</div>
        <div class="acts"><button class="btn btn-primary" @click="load">重新加载</button></div>
      </div>

      <div v-else-if="loading" class="skel-grid">
        <div class="skel-card" v-for="n in 8" :key="n">
          <div class="ph skel"></div>
          <div class="ln skel"></div><div class="ln s skel"></div>
        </div>
      </div>

      <div class="goods" v-else-if="items.length">
        <goods-card v-for="p in items" :key="p.id" :p="p"></goods-card>
      </div>

      <div class="empty card" v-else>
        <div class="ico">🔍</div>
        <div>没有找到符合条件的商品</div>
        <div style="font-size:13px">试试更换关键词或清空筛选条件</div>
        <button class="btn btn-primary" @click="clearAll">清空筛选</button>
      </div>

      <div class="pager" v-if="!loading && !err && pages > 1">
        <button :disabled="page<=1" @click="goto(page-1)">‹</button>
        <button v-for="n in pageList" :key="n" :class="{on:page===n}" @click="goto(n)">{{ n }}</button>
        <button :disabled="page>=pages" @click="goto(page+1)">›</button>
      </div>
    </div>
  </div>
</div>`,

  data: function () {
    return { items: [], total: 0, page: 1, size: 12, pages: 1, loading: false, err: '', _seq: 0 };
  },
  computed: {
    cat: function () { return this.route.query.cat || ''; },
    q: function () { return this.route.query.kw || ''; },
    crumb: function () { return this.q ? '搜索' : this.catName(this.cat); },
    activeChips: function () {
      var a = [];
      if (this.cat) a.push({ k: 'cat', t: '分类：' + this.catName(this.cat) });
      if (this.q) a.push({ k: 'kw', t: '关键词：' + this.q });
      return a;
    },
    /* 页码窗口：始终最多 5 个，当前页居中 */
    pageList: function () {
      var n = this.pages, c = this.page, out = [];
      var s = Math.max(1, c - 2), e = Math.min(n, s + 4);
      s = Math.max(1, e - 4);
      for (var i = s; i <= e; i++) out.push(i);
      return out;
    }
  },
  mounted: function () {
    this.page = Number(this.route.query.page) || 1;
    this.load();
  },
  watch: {
    'route.query': {
      deep: true,
      handler: function () {
        this.page = Number(this.route.query.page) || 1;
        this.load();
      }
    }
  },
  methods: {
    load: function () {
      var self = this, seq = ++this._seq;
      this.loading = true;
      this.err = '';
      SVC.loadCats().catch(function () {});
      SVC.loadProducts({ categoryId: this.cat, keyword: this.q, page: this.page, size: this.size })
        .then(function (d) {
          if (seq !== self._seq) return;
          self.items = U.listOf(d).map(SVC.adapt);
          self.total = U.totalOf(d);
          self.pages = U.pagesOf(d, self.size);
          self.loading = false;
        }, function (e) {
          if (seq !== self._seq) return;
          self.loading = false;
          if (e === U.HANDLED) return;
          self.err = U.errMsg(e);
          self.items = [];
          self.total = 0;
          self.pages = 1;
        });
    },
    setCat: function (id) { this.go(id === '' ? '/list' : '/list?cat=' + id); },
    goto: function (n) {
      if (n < 1 || n > this.pages || n === this.page) return;
      this.page = n;
      this.load();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    clearOne: function (k) {
      var q = Object.assign({}, this.route.query);
      delete q[k];
      delete q.page;
      var s = Object.keys(q).map(function (x) { return x + '=' + encodeURIComponent(q[x]); }).join('&');
      this.go('/list' + (s ? '?' + s : ''));
    },
    clearAll: function () { this.go('/list'); }
  }
};

})(window.DH);
