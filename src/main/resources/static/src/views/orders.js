/* ==========================================================================
   views/orders.js — 我的订单：状态筛选 / 付款 / 取消 / 确认收货 / 再次购买
   订单一次取回后在本地分页与筛选：服务端排序固定为 id DESC，前端筛选再叠加
   服务端分页会互相打架，索性一次取够（size=200）在本地切。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;

DH.views['orders-view'] = {
  template: `
<div>
  <div class="sec-hd" style="margin-top:22px">
    <div><div class="sec-title">我的订单</div><div class="sec-sub">共 {{ store.orders.length }} 笔订单</div></div>
  </div>

  <div v-if="!store.user" class="state card">
    <div class="ico"><ui-icon name="lock" :size="34"></ui-icon></div><div class="t">请先登录</div>
    <div class="d">登录后可查看你的订单记录。</div>
    <div class="acts"><button class="btn btn-primary" @click="go('/user','tab=login')">去登录</button></div>
  </div>

  <template v-else>
    <div class="bar">
      <button v-for="t in tabs" :key="t.k" class="pill" :class="{on:tab===t.k}" @click="tab=t.k">
        <ui-icon :name="t.ic" :size="16"></ui-icon>{{ t.t }}
        <span v-if="t.k==='2' && store.pending>0" class="pill-badge">{{ store.pending }}</span>
        <span v-else-if="cntOf(t.k)" style="opacity:.7">{{ cntOf(t.k) }}</span>
      </button>
    </div>

    <div v-if="loading" class="state card"><div class="spin"></div><div class="d">正在加载订单…</div></div>

    <div v-else-if="err" class="state card">
      <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">加载失败</div><div class="d">{{ err }}</div>
      <div class="acts"><button class="btn btn-primary" @click="load">重新加载</button></div>
    </div>

    <template v-else-if="list.length">
      <div class="order" v-for="o in list" :key="o.id">
        <div class="order-hd">
          <span>订单号 <span class="no">{{ o.orderNo }}</span></span>
          <span>{{ fmt(o.createTime) }}</span>
          <span class="st" :style="{color:status(o.status).color}">{{ status(o.status).icon }} {{ status(o.status).text }}</span>
        </div>
        <div class="order-bd">
          <div class="order-goods">
            <div class="og" v-for="(g,i) in o.items" :key="i" style="cursor:pointer" @click="go('/detail/'+g.productId)">
              <div class="thumb" :style="{'--h':hueOf(g.productId)}">
                <ui-icon name="box"></ui-icon>
                <img v-if="g.productImage" :src="g.productImage" alt="" class="gone"
                     @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
              </div>
              <div class="nm">{{ g.productName }}</div>
              <div class="pr">¥{{ money(g.unitPrice) }} × {{ g.quantity }}</div>
            </div>
          </div>
          <div style="width:190px;flex:none;text-align:right">
            <div style="font-size:12px;color:var(--ink-3)">共 {{ itemCount(o) }} 件商品</div>
            <div style="margin-top:8px;font-size:13px;color:var(--ink-2)">实付</div>
            <div style="font-size:24px;font-weight:800;color:var(--brand);letter-spacing:-.6px;font-variant-numeric:tabular-nums">
              ¥{{ money(o.totalPrice) }}</div>
          </div>
        </div>
        <div class="order-ft">
          <span class="amt">{{ payText(o.payment) }}</span>
          <button class="btn btn-sm" @click="detail(o)">订单详情</button>
          <button class="btn btn-sm" v-if="o.status===0" :disabled="busy" @click="cancel(o)">取消订单</button>
          <button class="btn btn-sm btn-primary" v-if="o.status===0" :disabled="busy" @click="payNow(o)">立即付款</button>
          <button class="btn btn-sm btn-primary" v-if="o.status===2" :disabled="busy" @click="receive(o)">确认收货</button>
          <button class="btn btn-sm btn-ghost" v-if="o.status===3||o.status===4" :disabled="busy" @click="rebuy(o)">再次购买</button>
        </div>
      </div>
      <div class="pager" v-if="pages>1">
        <button :disabled="page<=1" @click="page--">‹</button>
        <button v-for="n in pages" :key="n" :class="{on:page===n}" @click="page=n">{{ n }}</button>
        <button :disabled="page>=pages" @click="page++">›</button>
      </div>
    </template>

    <div v-else class="empty card">
      <div class="ico"><ui-icon name="box" :size="34"></ui-icon></div><div>暂无相关订单</div>
      <button class="btn btn-primary" @click="go('/list')">去逛逛</button>
    </div>
  </template>

  <!-- 订单详情 -->
  <div class="mask" v-if="cur" @click.self="cur=null">
    <div class="modal">
      <div class="modal-hd"><h3>订单详情</h3><button class="close" @click="cur=null">✕</button></div>
      <div class="modal-bd">
        <div style="background:#fafbfc;border-radius:var(--r);padding:16px;margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:9px;gap:12px">
            <span style="color:var(--ink-3);flex:none">订单编号</span><span class="num">{{ cur.orderNo }}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:9px;gap:12px">
            <span style="color:var(--ink-3);flex:none">下单时间</span><span>{{ fmt(cur.createTime) }}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:9px;gap:12px">
            <span style="color:var(--ink-3);flex:none">订单状态</span>
            <span :style="{color:status(cur.status).color,fontWeight:600}">{{ status(cur.status).icon }} {{ status(cur.status).text }}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13.5px;gap:12px">
            <span style="color:var(--ink-3);flex:none">支付方式</span><span>{{ payText(cur.payment) }}</span></div>
          <div v-if="cur.paymentTime" style="display:flex;justify-content:space-between;font-size:13.5px;margin-top:9px;gap:12px">
            <span style="color:var(--ink-3);flex:none">付款时间</span><span>{{ fmt(cur.paymentTime) }}</span></div>
        </div>

        <h4 style="font-size:13px;color:var(--ink-3);margin-bottom:10px">收货信息</h4>
        <div style="font-size:13.5px;line-height:1.8;margin-bottom:18px">
          {{ cur.receiverName }}　{{ cur.receiverPhone }}<br>
          <span style="color:var(--ink-2)">{{ cur.receiverAddress }}</span>
        </div>

        <h4 style="font-size:13px;color:var(--ink-3);margin-bottom:10px">商品清单</h4>
        <div v-for="(g,i) in cur.items" :key="i"
             style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line-2)">
          <div class="thumb" style="width:48px;border-radius:6px;--fs:22px" :style="{'--h':hueOf(g.productId)}">
            <ui-icon name="box"></ui-icon>
            <img v-if="g.productImage" :src="g.productImage" alt="" class="gone"
                 @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
          </div>
          <div style="flex:1;font-size:13.5px">{{ g.productName }}
            <div style="font-size:12px;color:var(--ink-3)">¥{{ money(g.unitPrice) }} × {{ g.quantity }}</div></div>
          <b style="color:var(--brand)">¥{{ money(g.totalPrice) }}</b>
        </div>
        <div v-if="cur.remark" style="margin-top:14px;font-size:13px;color:var(--ink-3)">备注：{{ cur.remark }}</div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;padding-top:14px;border-top:1px dashed var(--line)">
          <span style="font-weight:600">实付金额</span>
          <span style="font-size:24px;font-weight:800;color:var(--brand);letter-spacing:-.6px">¥{{ money(cur.totalPrice) }}</span>
        </div>
      </div>
      <div class="modal-ft"><button class="btn btn-primary" @click="cur=null">关闭</button></div>
    </div>
  </div>
</div>`,

  data: function () { return { tab: 'all', page: 1, size: 5, cur: null, loading: false, err: '' }; },
  computed: {
    tabs: function () {
      return [
        { k: 'all', t: '全部', ic: 'grid' },
        { k: '0', t: '待付款', ic: 'wallet' },
        { k: '1', t: '待发货', ic: 'box' },
        { k: '2', t: '待收货', ic: 'truck' },
        { k: '3', t: '已完成', ic: 'check' },
        { k: '4', t: '已取消', ic: 'close' }
      ];
    },
    filtered: function () {
      if (this.tab === 'all') return this.store.orders;
      var t = Number(this.tab);
      return this.store.orders.filter(function (o) { return Number(o.status) === t; });
    },
    list: function () {
      return this.filtered.slice((this.page - 1) * this.size, this.page * this.size);
    },
    pages: function () { return Math.max(1, Math.ceil(this.filtered.length / this.size)); }
  },
  mounted: function () { this.load(); },
  watch: {
    tab: function () { this.page = 1; },
    pages: function (v) { if (this.page > v) this.page = v; }
  },
  methods: {
    load: function () {
      var self = this;
      if (!this.store.user) return;
      this.loading = true;
      this.err = '';
      SVC.loadOrders().then(function () {
        self.loading = false;
      }, function (e) {
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
    },
    cntOf: function (k) {
      if (k === 'all') return 0;
      var t = Number(k);
      return this.store.orders.filter(function (o) { return Number(o.status) === t; }).length;
    },
    detail: function (o) { this.cur = o; },
    /* 0→1 付款（后端已有接口） */
    payNow: function (o) {
      var self = this;
      SVC.payOrder(o).then(function () { self.cur = null; });
    },
    /* 0→4 取消（后端已有接口） */
    cancel: function (o) {
      var self = this;
      SVC.cancelOrder(o).then(function () { self.cur = null; });
    },
    /* 2→3 确认收货：契约接口，后端未实现时降级提示 */
    receive: function (o) {
      var self = this;
      SVC.confirmOrder(o).then(function () { self.cur = null; });
    },
    /* 再次购买：逐项加回购物车后跳购物车 */
    rebuy: function (o) {
      var self = this;
      SVC.rebuyOrder(o).then(function (ok) { if (ok) self.go('/cart'); });
    }
  }
};

})(window.DH);
