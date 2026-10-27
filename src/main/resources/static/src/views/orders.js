/* ==========================================================================
   views/orders.js — 我的订单：七态筛选 + 服务端分页 + 按状态给出可执行动作
   详情统一跳 #/order/{orderNo}，列表页不再承载详情弹窗。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;
var noop = function () {};

DH.views['orders-view'] = {
  template: `
<div>
  <div class="sec-hd" style="margin-top:22px">
    <div><div class="sec-title">我的订单</div><div class="sec-sub">共 {{ total }} 笔订单</div></div>
  </div>

  <div v-if="!store.user" class="state card">
    <div class="ico"><ui-icon name="lock" :size="34"></ui-icon></div><div class="t">请先登录</div>
    <div class="d">登录后可查看你的订单记录。</div>
    <div class="acts"><button class="btn btn-primary" @click="go('/user','tab=login')">去登录</button></div>
  </div>

  <template v-else>
    <div class="bar">
      <button v-for="t in tabs" :key="t.k" class="pill" :class="{on:tab===t.k}" @click="switchTab(t.k)">
        <ui-icon :name="t.ic" :size="16"></ui-icon>{{ t.t }}
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
          <span class="st" :style="{color:status(o.status).color}">
            <ui-icon :name="status(o.status).ic" :size="14"></ui-icon> {{ o.statusText || status(o.status).text }}</span>
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
          <div class="order-sum">
            <div class="order-qty">共 {{ itemCount(o) }} 件商品</div>
            <div class="order-pay">实付</div>
            <div class="order-amt">¥{{ money(o.payAmount || o.totalPrice) }}</div>
            <div class="order-fee" v-if="o.freight>0 || o.discount>0">
              <template v-if="o.freight>0">含运费 ¥{{ money(o.freight) }}</template>
              <template v-if="o.freight>0 && o.discount>0"> · </template>
              <template v-if="o.discount>0">优惠 −¥{{ money(o.discount) }}</template>
            </div>
          </div>
        </div>
        <div class="order-ft">
          <span class="amt">{{ payText(o.payment) }}</span>
          <button class="btn btn-sm" @click="go('/order/' + o.orderNo)">订单详情</button>
          <button class="btn btn-sm" v-if="o.status===0" :disabled="busy" @click="openCancel(o)">取消订单</button>
          <button class="btn btn-sm" v-if="canRefund(o)" :disabled="busy" @click="go('/order/' + o.orderNo)">申请售后</button>
          <button class="btn btn-sm btn-primary" v-if="o.status===0" :disabled="busy"
                  @click="go('/pay/' + o.orderNo)">去支付</button>
          <button class="btn btn-sm btn-primary" v-if="o.status===2" :disabled="busy" @click="receive(o)">确认收货</button>
          <button class="btn btn-sm btn-ghost" v-if="canRebuy(o)" :disabled="busy" @click="rebuy(o)">再次购买</button>
        </div>
      </div>
      <div class="pager" v-if="pages>1">
        <button :disabled="page<=1" @click="goto(page-1)">‹</button>
        <button v-for="n in pages" :key="n" :class="{on:page===n}" @click="goto(n)">{{ n }}</button>
        <button :disabled="page>=pages" @click="goto(page+1)">›</button>
      </div>
    </template>

    <div v-else class="empty card">
      <div class="ico"><ui-icon name="box" :size="34"></ui-icon></div><div>暂无相关订单</div>
      <button class="btn btn-primary" @click="go('/list')">去逛逛</button>
    </div>
  </template>

  <!-- 取消订单：选原因 -->
  <div class="mask" v-if="cancelTarget" @click.self="cancelTarget=null">
    <div class="modal" style="max-width:400px">
      <div class="modal-hd"><h3>取消订单</h3><button class="close" @click="cancelTarget=null">✕</button></div>
      <div class="modal-bd">
        <p class="rf-tip">取消后库存与已使用的优惠券会自动退回。</p>
        <label class="lbl">取消原因</label>
        <div class="rs-list">
          <label class="rs" v-for="r in reasons" :key="r">
            <input type="radio" class="check" :value="r" v-model="cancelReason">{{ r }}
          </label>
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="cancelTarget=null">再想想</button>
        <button class="btn btn-primary" :disabled="busy" @click="doCancel">确认取消</button>
      </div>
    </div>
  </div>
</div>`,

  data: function () {
    return {
      tab: 'all', page: 1, size: 5,
      loading: false, err: '', busy: false,
      list: [], total: 0, pages: 1,
      cancelTarget: null, cancelReason: '不想要了',
      reasons: ['不想要了', '信息填写错误', '未及时付款', '重复下单', '其他']
    };
  },
  computed: {
    tabs: function () {
      return [
        { k: 'all', t: '全部', ic: 'grid', s: null },
        { k: '0', t: '待付款', ic: 'wallet', s: '0' },
        { k: '1', t: '待发货', ic: 'box', s: '1' },
        { k: '2', t: '待收货', ic: 'truck', s: '2' },
        { k: '3', t: '已完成', ic: 'check', s: '3' },
        { k: 'refund', t: '退款/售后', ic: 'rotate', s: '6,7' },
        { k: 'closed', t: '已取消', ic: 'close', s: '4,5' }
      ];
    }
  },
  mounted: function () { this.load(); },
  methods: {
    statusOf: function (k) {
      var t = this.tabs.filter(function (x) { return x.k === k; })[0];
      return t ? t.s : null;
    },
    load: function () {
      var self = this;
      if (!this.store.user) return;
      this.loading = true;
      this.err = '';
      SVC.pageOrders(this.statusOf(this.tab), this.page, this.size).then(function (d) {
        self.list = d.list || [];
        self.total = Number(d.total) || 0;
        self.pages = Math.max(1, Number(d.totalPages) || 1);
        self.loading = false;
      }, function (e) {
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
    },
    switchTab: function (k) {
      this.tab = k;
      this.page = 1;
      this.load();
    },
    goto: function (n) {
      if (n < 1 || n > this.pages) return;
      this.page = n;
      this.load();
    },
    itemCount: function (o) {
      return (o.items || []).reduce(function (s, g) { return s + (Number(g.quantity) || 0); }, 0);
    },
    canRefund: function (o) {
      return o.status === 1 || o.status === 2 || o.status === 3;
    },
    canRebuy: function (o) {
      return o.status === 3 || o.status === 4 || o.status === 5 || o.status === 7;
    },
    openCancel: function (o) {
      this.cancelTarget = o;
      this.cancelReason = '不想要了';
    },
    doCancel: function () {
      var self = this;
      var o = this.cancelTarget;
      if (!o) return;
      this.busy = true;
      SVC.cancelOrder(o, this.cancelReason).then(function () {
        self.busy = false;
        self.cancelTarget = null;
        self.load();
      }, function () { self.busy = false; });
    },
    receive: function (o) {
      var self = this;
      this.busy = true;
      DH.api.request('POST', '/orders/' + o.orderNo + '/confirm').then(function () {
        self.busy = false;
        self.toast('已确认收货', '✅');
        self.load();
        SVC.loadOrders().catch(noop);
      }, function (e) {
        self.busy = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    rebuy: function (o) {
      SVC.rebuyOrder(o).then(function (ok) { if (ok) DH.router.go('/cart'); });
    }
  }
};

})(window.DH);
