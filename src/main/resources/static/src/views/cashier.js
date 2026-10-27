/* ==========================================================================
   views/cashier.js — 收银台：支付方式 → 创建支付单 → 模拟网关 → 回调结果
   支付成功不由前端改状态，而是调用「模拟回调」接口，服务端验单后推进订单。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;
var noop = function () {};

DH.views['cashier-view'] = {
  template: `
<div>
  <div class="steps">
    <div class="s on"><i>1</i>提交订单</div><div class="ln"></div>
    <div class="s on"><i>2</i>收银台付款</div><div class="ln"></div>
    <div class="s"><i>3</i>完成</div>
  </div>

  <div v-if="loading" class="state card"><div class="spin"></div><div class="d">正在加载支付信息…</div></div>

  <div v-else-if="err" class="state card">
    <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div>
    <div class="t">无法支付</div><div class="d">{{ err }}</div>
    <div class="acts">
      <button class="btn btn-primary" @click="go('/orders')">查看我的订单</button>
    </div>
  </div>

  <div v-else-if="order" class="cashier card">
    <div class="cash-hd">
      <div class="cash-amt"><span>¥</span>{{ money(order.payAmount || order.totalPrice) }}</div>
      <div class="cash-sub">订单号 {{ order.orderNo }}</div>
      <div class="cash-cd" :class="{ over: expired }">
        <ui-icon name="clock" :size="14"></ui-icon>
        <template v-if="expired">支付超时，订单已关闭</template>
        <template v-else>请在 <b>{{ countdown }}</b> 内完成支付，超时订单将自动关闭</template>
      </div>
    </div>

    <div class="cash-body" v-if="!expired && order.status===0">
      <div class="cash-label">选择支付方式</div>
      <div class="pay-grid">
        <div class="pay-opt" v-for="ch in channels" :key="ch.k" :class="{on:channel===ch.k}" @click="channel=ch.k">
          <span class="g"><ui-icon :name="ch.ic" :size="20"></ui-icon></span>
          <div><b>{{ ch.t }}</b><div class="pay-d">{{ ch.d }}</div></div>
          <span class="rd" :class="{ on: channel===ch.k }"></span>
        </div>
      </div>
      <button class="btn btn-lg btn-primary btn-block" style="margin-top:20px"
              :disabled="paying" @click="pay">{{ paying ? '支付中…' : ('确认支付 ¥' + money(order.payAmount)) }}</button>
      <button class="btn btn-block" style="margin-top:10px" @click="go('/order/' + order.orderNo)">
        稍后支付
      </button>
      <p class="cash-tip">
        当前为演示环境：点击「确认支付」会调用模拟支付网关并触发异步回调，
        与真实三方支付的流程一致，但不会产生任何实际扣款。
      </p>
    </div>

    <div class="cash-body" v-else>
      <div class="cash-done">
        <ui-icon :name="order.status===0 ? 'close' : 'check'" :size="30"></ui-icon>
        <p>{{ order.status===0 ? '订单已关闭，无法继续支付' : ('该订单当前状态：' + (order.statusText || '—')) }}</p>
        <button class="btn btn-primary" @click="go('/order/' + order.orderNo)">查看订单详情</button>
      </div>
    </div>
  </div>
</div>`,

  props: { no: { type: String, default: '' } },
  data: function () {
    return {
      loading: false, err: '', order: null, payment: null,
      channel: 1, paying: false, leftSeconds: 0, timer: null, expired: false,
      channels: [
        { k: 1, ic: 'card', t: '支付宝', d: '推荐使用' },
        { k: 2, ic: 'chat', t: '微信支付', d: '扫码或免密' },
        { k: 3, ic: 'wallet', t: '银行卡', d: '储蓄卡 / 信用卡' }
      ]
    };
  },
  computed: {
    countdown: function () {
      var s = this.leftSeconds;
      if (s <= 0) return '00:00';
      var m = Math.floor(s / 60);
      var sec = s % 60;
      return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
    }
  },
  mounted: function () { this.load(); },
  unmounted: function () { this.stopTimer(); },
  methods: {
    load: function () {
      var self = this;
      if (!this.store.user) { this.go('/user', 'tab=login'); return; }
      this.loading = true;
      this.err = '';
      DH.api.request('GET', '/orders/' + this.no).then(function (o) {
        self.order = o;
        self.loading = false;
        if (o.status !== 0) return;
        self.startTimer(o.expireAt);
        return SVC.createPayment(o.orderNo, self.channel).then(function (p) {
          self.payment = p;
        }, function (e) {
          if (e !== U.HANDLED) self.err = U.errMsg(e);
        });
      }, function (e) {
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
    },
    startTimer: function (expireAt) {
      var self = this;
      if (!expireAt) { this.leftSeconds = 0; return; }
      var end = new Date(String(expireAt).replace(/\//g, '-').replace(' ', 'T')).getTime();
      var tick = function () {
        var left = Math.round((end - Date.now()) / 1000);
        self.leftSeconds = left > 0 ? left : 0;
        if (left <= 0) {
          self.expired = true;
          self.stopTimer();
        }
      };
      tick();
      this.stopTimer();
      this.timer = setInterval(tick, 1000);
    },
    stopTimer: function () {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    },
    pay: function () {
      var self = this;
      if (this.paying || !this.order) return;
      this.paying = true;
      /* 每次支付前确保支付单与所选渠道一致 */
      SVC.createPayment(this.order.orderNo, this.channel).then(function (p) {
        self.payment = p;
        return SVC.mockPay(p.paymentNo);
      }).then(function (p) {
        self.paying = false;
        if (p && p.status === 1) {
          self.toast('支付成功', '✅');
          self.stopTimer();
          SVC.loadOrders().catch(noop);
          SVC.loadPending().catch(noop);
          self.go('/order/' + self.order.orderNo);
        } else {
          self.toast('支付未完成，请重试', '⚠️');
        }
      }, function (e) {
        self.paying = false;
        if (e === U.HANDLED) return;
        self.toast(U.errMsg(e), '⚠️');
        /* 订单被关单或已支付时，重新拉一次以展示真实状态 */
        if (e && (e.code === 3014 || e.code === 3016 || e.code === 3017)) self.load();
      });
    }
  }
};

})(window.DH);
