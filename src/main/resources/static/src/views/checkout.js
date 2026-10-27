/* ==========================================================================
   views/checkout.js — 结算页：地址 / 优惠券 / 配送与支付 / 价格明细 / 提交
   金额一律来自 GET /api/orders/preview，与下单走同一套计算，前端不做任何推算。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;
var noop = function () {};

DH.views['checkout-view'] = {
  template: `
<div>
  <div class="steps">
    <div class="s"><i>1</i>{{ buy ? '确认商品' : '我的购物车' }}</div><div class="ln"></div>
    <div class="s on"><i>2</i>填写订单信息</div><div class="ln"></div>
    <div class="s"><i>3</i>提交订单</div>
  </div>

  <div v-if="loading" class="state card"><div class="spin"></div><div class="d">正在加载订单信息…</div></div>

  <div v-else-if="!store.user" class="state card">
    <div class="ico"><ui-icon name="lock" :size="34"></ui-icon></div><div class="t">请先登录</div>
    <div class="d">下单需要登录后才能进行。</div>
    <div class="acts"><button class="btn btn-primary" @click="go('/user','tab=login')">去登录</button></div>
  </div>

  <div v-else-if="!pv || !pv.items.length" class="state card">
    <div class="ico"><ui-icon name="receipt" :size="34"></ui-icon></div>
    <div class="t">{{ buy ? '商品信息加载失败' : '没有待结算的商品' }}</div>
    <div class="d">{{ buy ? '该商品可能已下架或库存不足，请返回详情页重新选择。' : '购物车里还没有勾选商品。先去挑几件，或在购物车里勾选要结算的商品。' }}</div>
    <div class="acts">
      <button class="btn btn-primary" @click="go(buy ? ('/detail/'+buy.productId) : '/list')">{{ buy ? '返回商品' : '去逛逛' }}</button>
      <button v-if="!buy" class="btn" @click="go('/cart')">返回购物车</button>
    </div>
  </div>

  <div class="co-lay" v-else>
    <div style="display:grid;gap:16px">
      <!-- 收货地址 -->
      <div class="card pad">
        <div class="co-hd">
          <h3>收货地址</h3>
          <button class="btn btn-sm" @click="openAddr()">＋ 新增地址</button>
        </div>
        <div v-if="store.addresses.length" class="addr-grid">
          <div class="addr" v-for="a in store.addresses" :key="a.id" :class="{on:addrId===a.id}" @click="addrId=a.id">
            <div class="who">{{ a.receiverName }}<small>{{ a.receiverPhone }}</small>
              <span class="tag tag-brand" v-if="a.isDefault===1">默认</span></div>
            <div class="txt">{{ fullAddr(a) }}</div>
          </div>
        </div>
        <div v-else class="empty" style="padding:30px 10px">
          <div class="ico"><ui-icon name="pin" :size="34"></ui-icon></div>
          <div style="font-size:13px">还没有收货地址，请先添加</div>
          <button class="btn btn-primary btn-sm" @click="openAddr()">添加收货地址</button>
        </div>
      </div>

      <!-- 商品清单 -->
      <div class="card">
        <div class="co-hd">
          <h3>商品清单<span class="tag tag-brand" v-if="buy" style="margin-left:8px">立即购买</span></h3>
          <span>{{ totalQty }} 件</span>
        </div>
        <div class="co-goods">
          <div class="og" v-for="it in pv.items" :key="it.cartItemId || ('p'+it.productId)">
            <div class="thumb" :style="{'--h':160}">
              <ui-icon name="box"></ui-icon>
              <img v-if="it.productImage" :src="it.productImage" alt="" class="gone"
                   @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
            </div>
            <div class="nm">
              {{ it.productName }}
              <span class="tag tag-warn" v-if="!it.available">不可购买</span>
            </div>
            <div class="pr">¥{{ money(it.price) }} × {{ it.quantity }}</div>
            <b class="sub">¥{{ money(it.subtotal) }}</b>
          </div>
        </div>
      </div>

      <!-- 优惠券 -->
      <div class="card pad">
        <div class="co-hd"><h3>优惠券</h3></div>
        <div class="coup-pick" @click="couponOpen=!couponOpen">
          <span class="coup-cur">
            <template v-if="usedCoupon">-¥{{ money(pv.price.discount) }} · {{ usedCoupon.name }}</template>
            <template v-else-if="usableCoupons.length">共 {{ usableCoupons.length }} 张可用，已自动为您匹配最优</template>
            <template v-else>暂无可用优惠券</template>
          </span>
          <span class="coup-go">{{ couponOpen ? '收起' : '选择' }}<ui-icon name="arrowRight" :size="13"></ui-icon></span>
        </div>
        <div class="coup-list" v-if="couponOpen">
          <div class="coup" :class="{ off: !usableCoupons.length && !unusableCoupons.length }"
               @click="pickCoupon(null)">
            <div class="coup-tx"><b>不使用优惠券</b></div>
            <span class="rd" :class="{ on: !couponId }"></span>
          </div>
          <div class="coup" v-for="c in pv.coupons" :key="c.id"
               :class="{ dis: !c.usable, on: String(couponId)===String(c.id) }"
               @click="c.usable && pickCoupon(c.id)">
            <div class="coup-amt"><span>¥</span>{{ money(c.amount) }}</div>
            <div class="coup-tx">
              <b>{{ c.name }}</b>
              <small>{{ c.usable ? ('满 ' + money(c.threshold) + ' 可用') : c.reason }}</small>
            </div>
            <span class="rd" :class="{ on: String(couponId)===String(c.id) }"></span>
          </div>
        </div>
      </div>

      <!-- 配送与支付 -->
      <div class="card pad">
        <div class="co-hd"><h3>配送与支付</h3></div>
        <div class="opt-row" style="border-top:none;padding-top:0">
          <div class="k">配送方式</div>
          <div class="opt">
            <span class="tag"><ui-icon name="truck" :size="14"></ui-icon> 标准配送（48 小时内发出）</span>
            <span class="tag" v-if="pv.price.freeShipping">已满 ¥{{ money(pv.freeThreshold) }} 免运费</span>
          </div>
        </div>
        <div class="pay-grid">
          <div class="pay-opt" v-for="pm in pays" :key="pm.k" :class="{on:payment===pm.k}" @click="payment=pm.k">
            <span class="g"><ui-icon :name="pm.ic" :size="20"></ui-icon></span>
            <div><b>{{ pm.t }}</b><div class="pay-d">{{ pm.d }}</div></div>
            <span class="rd" :class="{ on: payment===pm.k }"></span>
          </div>
        </div>
        <div style="margin-top:16px">
          <label class="lbl">订单备注</label>
          <textarea class="field" rows="2" v-model="remark" maxlength="200"
                    placeholder="选填，如：工作日送达、放前台代收"></textarea>
        </div>
      </div>
    </div>

    <!-- 金额明细 -->
    <div class="card pad co-side">
      <h3 class="co-side-t">订单结算</h3>
      <div class="sum-line"><span>商品金额</span><span>¥{{ money(pv.price.goodsAmount) }}</span></div>
      <div class="sum-line">
        <span>运费</span>
        <span v-if="pv.price.freight>0">＋¥{{ money(pv.price.freight) }}</span>
        <span v-else class="free">免运费</span>
      </div>
      <div class="sum-line" v-if="pv.price.discount>0">
        <span>优惠券</span><span class="cut">−¥{{ money(pv.price.discount) }}</span>
      </div>
      <div class="sum-line total"><span>应付</span><span class="v">¥{{ money(pv.price.payAmount) }}</span></div>
      <p class="co-tip" v-if="pv.price.freight>0">
        再选购 ¥{{ money(pv.freeThreshold - pv.price.goodsAmount) }} 商品即可免运费
      </p>

      <div class="co-addr-mini">
        <span><ui-icon name="pin" :size="13"></ui-icon>{{ addr ? fullAddr(addr) : '请选择收货地址' }}</span>
        <span><ui-icon name="user" :size="13"></ui-icon>{{ addr ? addr.receiverName + ' ' + addr.receiverPhone : '—' }}</span>
      </div>

      <div class="co-note" v-if="pv && pv.notice">{{ pv.notice }}</div>
      <div class="co-err" v-if="pv && pv.purchasable===false">{{ pv.errorTip }}</div>

      <button class="btn btn-lg btn-primary btn-block" style="margin-top:16px"
              :disabled="!addr || submitting || (pv && pv.purchasable===false)" @click="submit">
        {{ submitting ? '提交中…' : '提交订单' }}</button>
      <button class="btn btn-block" style="margin-top:10px"
              @click="go(buy ? ('/detail/'+buy.productId) : '/cart')">{{ buy ? '返回商品' : '返回购物车' }}</button>
      <p class="co-tip" style="text-align:center">
        提交订单即表示同意《东华购物用户协议》
      </p>
    </div>
  </div>

  <!-- 新增地址弹窗 -->
  <div class="mask" v-if="showAddr" @click.self="showAddr=false">
    <div class="modal" style="max-width:460px">
      <div class="modal-hd"><h3>新增收货地址</h3>
        <button class="close" @click="showAddr=false">✕</button></div>
      <div class="modal-bd">
        <div class="frow">
          <div><label class="lbl">收货人姓名<span class="req">*</span></label>
            <input class="field" v-model.trim="af.receiverName" placeholder="请输入收货人姓名"></div>
          <div><label class="lbl">手机号码<span class="req">*</span></label>
            <input class="field" v-model.trim="af.receiverPhone" placeholder="请输入 11 位手机号码"></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">省份</label><input class="field" v-model.trim="af.province" placeholder="例如：北京市"></div>
          <div><label class="lbl">城市</label><input class="field" v-model.trim="af.city" placeholder="例如：上海市"></div>
        </div>
        <div style="margin-top:14px"><label class="lbl">区县</label>
          <input class="field" v-model.trim="af.district" placeholder="例如：浦东新区"></div>
        <div style="margin-top:14px"><label class="lbl">详细地址（街道、门牌号等）<span class="req">*</span></label>
          <input class="field" v-model.trim="af.detail" placeholder="例如：XX 路 88 号 2 栋 303 室"></div>
        <label class="co-check">
          <input type="checkbox" class="check" v-model="af.isDefault"> 设为默认收货地址</label>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="showAddr=false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="saveAddr">
          {{ saving ? '保存中…' : '保存地址' }}</button>
      </div>
    </div>
  </div>
</div>`,

  data: function () {
    return {
      loading: false, submitting: false,
      pv: null, addrId: null, payment: 1, remark: '',
      couponId: null, couponOpen: false, submitToken: null,
      /* 非空表示立即购买：只结算该商品，与购物车勾选无关 */
      buy: null,
      showAddr: false, saving: false, af: U.blankAddr(),
      pays: [
        { k: 1, ic: 'card', t: '在线支付', d: '跳转收银台付款' },
        { k: 2, ic: 'cash', t: '货到付款', d: '收到商品再付款' }
      ]
    };
  },
  computed: {
    addr: function () {
      var id = this.addrId;
      var list = this.store.addresses || [];
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(id)) return list[i];
      }
      return null;
    },
    totalQty: function () {
      return (this.pv ? this.pv.items : []).reduce(function (s, i) { return s + (i.quantity || 0); }, 0);
    },
    usableCoupons: function () {
      return (this.pv ? this.pv.coupons : []).filter(function (c) { return c.usable; });
    },
    unusableCoupons: function () {
      return (this.pv ? this.pv.coupons : []).filter(function (c) { return !c.usable; });
    },
    usedCoupon: function () {
      var id = this.couponId;
      if (!id) return null;
      return (this.pv ? this.pv.coupons : []).filter(function (c) {
        return String(c.id) === String(id);
      })[0] || null;
    }
  },
  mounted: function () { this.initBuy(); this.load(); },
  watch: {
    'store.addresses': function () {
      if (!this.addr && this.store.addresses.length) this.pickDefault();
    }
  },
  methods: {
    /** 解析 #/checkout?buy=<productId>&qty=<n>；无 buy 参数即普通购物车结算 */
    initBuy: function () {
      var q = (this.route && this.route.query) || {};
      if (q.buy) {
        this.buy = {
          productId: Number(q.buy),
          quantity: Math.max(1, Math.floor(Number(q.qty) || 1))
        };
      }
    },
    load: function () {
      var self = this;
      if (!this.store.user) return;
      this.loading = true;
      SVC.loadCats().catch(noop);
      Promise.all([
        SVC.loadCart().catch(noop),
        SVC.loadAddresses().catch(noop)
      ]).then(function () {
        if (!self.addr) self.pickDefault();
        return self.refreshPreview();
      }).then(function () {
        self.loading = false;
      }, function () {
        self.loading = false;
      });
      /* 领取一次性提交令牌，防止连点产生重复订单 */
      SVC.newSubmitToken().then(function (t) { self.submitToken = t; }, noop);
    },
    refreshPreview: function () {
      var self = this;
      return SVC.previewOrder(this.couponId, this.buy).then(function (pv) {
        self.pv = pv;
        /* 券失效后服务端不再计入优惠，这里同步清空选中，避免界面与实际不一致 */
        if (self.couponId && !(pv.price && String(pv.price.couponId) === String(self.couponId))) {
          self.couponId = null;
        }
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    pickCoupon: function (id) {
      this.couponId = id;
      this.couponOpen = false;
      this.refreshPreview();
    },
    pickDefault: function () {
      var list = this.store.addresses;
      var d = list.filter(function (a) { return Number(a.isDefault) === 1; })[0];
      this.addrId = d ? d.id : (list[0] ? list[0].id : null);
    },
    fullAddr: function (a) {
      if (!a) return '';
      return [a.province, a.city, a.district, a.detail].filter(Boolean).join(' ');
    },
    openAddr: function () { this.af = U.blankAddr(); this.showAddr = true; },
    saveAddr: function () {
      var self = this, a = this.af;
      if (!a.receiverName) return this.toast('请填写收货人姓名', '⚠️');
      if (!/^\d{6,20}$/.test(a.receiverPhone || '')) return this.toast('请填写 11 位手机号码', '⚠️');
      if (!a.detail) return this.toast('请填写详细地址（街道及门牌号）', '⚠️');
      this.saving = true;
      SVC.saveAddress({
        receiverName: a.receiverName,
        receiverPhone: a.receiverPhone,
        province: a.province,
        city: a.city,
        district: a.district,
        detail: a.detail,
        isDefault: a.isDefault ? 1 : 0
      }, null).then(function (d) {
        self.toast('收货地址已保存', '✅');
        self.showAddr = false;
        return SVC.loadAddresses().then(function () {
          if (d && d.id) self.addrId = d.id;
        }, noop);
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      }).then(function () { self.saving = false; }, function () { self.saving = false; });
    },
    submit: function () {
      var self = this;
      if (!this.addr) return this.toast('请先选择收货地址', '⚠️');
      if (!this.pv || !this.pv.items.length) return this.toast('没有可结算的商品', '⚠️');
      if (this.pv.purchasable === false) return this.toast(this.pv.errorTip || '商品不可购买', '⚠️');
      this.submitting = true;
      var payload = {
        addressId: this.addr.id,
        payment: this.payment,
        remark: this.remark || '',
        couponId: this.couponId,
        submitToken: this.submitToken
      };
      if (this.buy) {
        payload.buyNowProductId = this.buy.productId;
        payload.buyNowQuantity = this.buy.quantity;
      }
      SVC.createOrder(payload).then(function (order) {
        self.submitting = false;
        /* 令牌已消费，立即置空避免二次提交复用 */
        self.submitToken = null;
        self.toast('订单提交成功', '🎉');
        SVC.loadCart().catch(noop);
        SVC.loadOrders().catch(noop);
        /* 货到付款无需支付，直接看订单；在线支付跳收银台 */
        if (Number(order.payment) === 2) self.go('/order/' + order.orderNo);
        else self.go('/pay/' + order.orderNo);
      }, function (e) {
        self.submitting = false;
        if (e === U.HANDLED) return;
        self.toast(U.errMsg(e), '⚠️');
        /* 商品/库存变化会导致试算失效，重新拉一次让用户看到最新状态 */
        SVC.loadCart().catch(noop);
        self.refreshPreview();
        SVC.newSubmitToken().then(function (t) { self.submitToken = t; }, noop);
      });
    }
  }
};

})(window.DH);
