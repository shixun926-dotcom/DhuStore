/* ==========================================================================
   views/order.js — 订单详情：状态时间轴 / 金额明细 / 商品 / 售后申请
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;
var noop = function () {};

DH.views['order-view'] = {
  template: `
<div>
  <div v-if="loading" class="state card" style="margin-top:20px">
    <div class="spin"></div><div class="d">正在加载订单…</div>
  </div>

  <div v-else-if="err" class="state card" style="margin-top:20px">
    <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div>
    <div class="t">加载失败</div><div class="d">{{ err }}</div>
    <div class="acts"><button class="btn btn-primary" @click="go('/orders')">返回订单列表</button></div>
  </div>

  <template v-else-if="o">
    <div class="od-head card">
      <div class="od-head-tx">
        <div class="od-st" :style="{color:status(o.status).color}">
          <ui-icon :name="status(o.status).ic" :size="20"></ui-icon>{{ o.statusText || status(o.status).text }}
        </div>
        <div class="od-tip">{{ headTip }}</div>
      </div>
      <div class="od-head-acts">
        <button class="btn btn-sm" v-if="o.status===0" @click="go('/pay/' + o.orderNo)">去支付</button>
        <button class="btn btn-sm" v-if="canRefund" @click="openRefund()">申请售后</button>
        <button class="btn btn-sm btn-primary" v-if="o.status===2" :disabled="busy" @click="confirm">确认收货</button>
        <button class="btn btn-sm" v-if="o.status===3||o.status===4||o.status===5||o.status===7"
                :disabled="busy" @click="rebuy">再次购买</button>
      </div>
    </div>

    <!-- 状态时间轴 -->
    <div class="card pad" style="margin-top:16px">
      <h3 class="od-h3">订单进度</h3>
      <div class="timeline">
        <div class="tl-step" v-for="(s,i) in timeline" :key="i" :class="{ done: s.done, now: s.now }">
          <span class="tl-dot"></span>
          <div class="tl-tx"><b>{{ s.t }}</b><small>{{ s.time ? fmt(s.time) : s.hint }}</small></div>
        </div>
      </div>
      <div class="od-cancel" v-if="o.cancelReason">关闭原因：{{ o.cancelReason }}</div>
    </div>

    <div class="od-lay">
      <!-- 商品 -->
      <div class="card" style="margin-top:16px">
        <div class="co-hd"><h3>商品清单</h3><span>{{ itemCount }} 件</span></div>
        <div class="co-goods">
          <div class="og" v-for="(g,i) in o.items" :key="i">
            <div class="thumb" :style="{'--h':160}">
              <ui-icon name="box"></ui-icon>
              <img v-if="g.productImage" :src="g.productImage" alt="" class="gone"
                   @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
            </div>
            <div class="nm">{{ g.productName }}</div>
            <div class="pr">¥{{ money(g.unitPrice) }} × {{ g.quantity }}</div>
            <b class="sub">¥{{ money(g.totalPrice) }}</b>
          </div>
        </div>
      </div>

      <!-- 金额与信息 -->
      <div style="display:grid;gap:16px;margin-top:16px">
        <div class="card pad">
          <h3 class="od-h3">金额明细</h3>
          <div class="sum-line"><span>商品金额</span><span>¥{{ money(o.goodsAmount) }}</span></div>
          <div class="sum-line"><span>运费</span>
            <span v-if="o.freight>0">＋¥{{ money(o.freight) }}</span><span v-else class="free">免运费</span></div>
          <div class="sum-line" v-if="o.discount>0"><span>优惠</span><span class="cut">−¥{{ money(o.discount) }}</span></div>
          <div class="sum-line total"><span>实付</span><span class="v">¥{{ money(o.payAmount || o.totalPrice) }}</span></div>
        </div>

        <div class="card pad">
          <h3 class="od-h3">收货与订单信息</h3>
          <dl class="od-dl">
            <dt>收货人</dt><dd>{{ o.receiverName }} {{ o.receiverPhone }}</dd>
            <dt>地址</dt><dd>{{ o.receiverAddress }}</dd>
            <dt>订单号</dt><dd class="num">{{ o.orderNo }}</dd>
            <dt>支付方式</dt><dd>{{ payText(o.payment) }}</dd>
            <dt>下单时间</dt><dd>{{ fmt(o.createTime) }}</dd>
            <dt>备注</dt><dd>{{ o.remark || '—' }}</dd>
          </dl>
        </div>
      </div>
    </div>
  </template>

  <!-- 售后弹窗 -->
  <div class="mask" v-if="showRefund" @click.self="showRefund=false">
    <div class="modal" style="max-width:480px">
      <div class="modal-hd"><h3>申请售后</h3><button class="close" @click="showRefund=false">✕</button></div>
      <div class="modal-bd">
        <label class="lbl">售后类型</label>
        <div class="pay-grid" style="margin-bottom:14px">
          <div class="pay-opt" :class="{on:rf.type===1}" @click="rf.type=1">
            <span class="g"><ui-icon name="rotate" :size="18"></ui-icon></span>
            <div><b>仅退款</b><div class="pay-d">未收到货或无需退货</div></div>
            <span class="rd" :class="{on:rf.type===1}"></span>
          </div>
          <div class="pay-opt" :class="{on:rf.type===2}" @click="rf.type=2">
            <span class="g"><ui-icon name="box" :size="18"></ui-icon></span>
            <div><b>退货退款</b><div class="pay-d">需要寄回商品</div></div>
            <span class="rd" :class="{on:rf.type===2}"></span>
          </div>
        </div>
        <label class="lbl">退款金额（最多 ¥{{ money(o ? (o.payAmount || o.totalPrice) : 0) }}）</label>
        <input class="field" type="number" min="0.01" step="0.01" v-model.number="rf.amount">
        <label class="lbl" style="margin-top:14px">退款原因</label>
        <select class="field" v-model="rf.reason">
          <option value="不想要了">不想要了</option>
          <option value="商品与描述不符">商品与描述不符</option>
          <option value="商品质量问题">商品质量问题</option>
          <option value="少件/漏发">少件/漏发</option>
          <option value="物流一直未送达">物流一直未送达</option>
          <option value="其他">其他</option>
        </select>
        <label class="lbl" style="margin-top:14px">凭证图片（选填，最多 3 张）</label>
        <div class="rf-imgs">
          <div class="rf-img" v-for="(u,i) in rf.images" :key="u">
            <img :src="u" alt="">
            <button type="button" @click="rf.images.splice(i,1)">✕</button>
          </div>
          <div class="rf-add" v-if="rf.images.length<3" @click="$refs.rfFile.click()">＋</div>
          <input type="file" ref="rfFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
                 @change="pickRefundImage">
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="showRefund=false">取消</button>
        <button class="btn btn-primary" :disabled="busy" @click="submitRefund">
          {{ busy ? '提交中…' : '提交申请' }}</button>
      </div>
    </div>
  </div>
</div>`,

  props: { no: { type: String, default: '' } },
  data: function () {
    return {
      loading: false, err: '', o: null, busy: false,
      showRefund: false,
      rf: { type: 1, amount: 0, reason: '不想要了', images: [] }
    };
  },
  computed: {
    itemCount: function () {
      return ((this.o && this.o.items) || []).reduce(function (s, g) { return s + (g.quantity || 0); }, 0);
    },
    canRefund: function () {
      var st = this.o ? this.o.status : -1;
      return st === 1 || st === 2 || st === 3;
    },
    headTip: function () {
      if (!this.o) return '';
      switch (this.o.status) {
        case 0: return '订单待付款，超时将自动关闭';
        case 1: return '商家正在备货，请耐心等待发货';
        case 2: return '商品已发出，收到后请确认收货';
        case 3: return '交易已完成，感谢你的购买';
        case 4: return '订单已取消，库存与优惠券已退回';
        case 5: return '超时未支付，订单已自动关闭';
        case 6: return '售后处理中，请等待商家审核';
        case 7: return '退款已完成，款项将按原路退回';
        default: return '';
      }
    },
    timeline: function () {
      var o = this.o;
      if (!o) return [];
      var steps = [
        { t: '提交订单', time: o.createTime, hint: '—' },
        { t: '完成付款', time: o.paymentTime, hint: '待付款' },
        { t: '商家发货', time: o.shipTime, hint: '待发货' },
        { t: '交易完成', time: o.finishTime, hint: '待收货' }
      ];
      var lastDone = -1;
      steps.forEach(function (s, i) { if (s.time) lastDone = i; });
      steps.forEach(function (s, i) {
        s.done = !!s.time;
        s.now = i === lastDone + 1 && o.status !== 4 && o.status !== 5 && o.status !== 7;
      });
      return steps;
    }
  },
  mounted: function () { this.load(); },
  watch: { no: function () { this.load(); } },
  methods: {
    load: function () {
      var self = this;
      if (!this.store.user) { this.go('/user', 'tab=login'); return; }
      this.loading = true;
      this.err = '';
      DH.api.request('GET', '/orders/' + this.no).then(function (o) {
        self.o = o;
        self.loading = false;
      }, function (e) {
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
    },
    confirm: function () {
      var self = this;
      this.busy = true;
      DH.api.request('POST', '/orders/' + this.o.orderNo + '/confirm').then(function () {
        self.busy = false;
        self.toast('已确认收货', '✅');
        self.load();
        SVC.loadOrders().catch(noop);
      }, function (e) {
        self.busy = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    rebuy: function () {
      SVC.rebuyOrder(this.o).then(function (ok) { if (ok) DH.router.go('/cart'); });
    },
    openRefund: function () {
      this.rf = { type: 1, amount: this.o.payAmount || this.o.totalPrice, reason: '不想要了', images: [] };
      this.showRefund = true;
    },
    pickRefundImage: function (e) {
      var self = this;
      var file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file) return;
      var err = SVC.checkImage(file);
      if (err) return this.toast(err, '⚠️');
      SVC.uploadImage(file).then(function (url) {
        self.rf.images = self.rf.images.concat(url).slice(0, 3);
      }, function (e2) {
        if (e2 !== U.HANDLED) self.toast(U.errMsg(e2), '⚠️');
      });
    },
    submitRefund: function () {
      var self = this;
      if (!(Number(this.rf.amount) > 0)) return this.toast('请填写退款金额', '⚠️');
      this.busy = true;
      SVC.applyRefund(this.o.orderNo, {
        type: this.rf.type,
        amount: Number(this.rf.amount),
        reason: this.rf.reason,
        images: this.rf.images
      }).then(function () {
        self.busy = false;
        self.showRefund = false;
        self.toast('售后申请已提交，等待商家审核', '🎉');
        self.load();
        SVC.loadOrders().catch(noop);
      }, function (e) {
        self.busy = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    }
  }
};

})(window.DH);
