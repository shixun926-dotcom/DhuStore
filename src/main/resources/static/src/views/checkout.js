/* ==========================================================================
   views/checkout.js — 结算页：选地址 / 支付方式 / 备注 / 提交订单
   运费与优惠不在前端计算，只显示商品金额小计，实际以服务端下单后的 totalPrice 为准。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;

DH.views['checkout-view'] = {
  template: `
<div>
  <div class="steps">
    <div class="s"><i>1</i>我的购物车</div><div class="ln"></div>
    <div class="s on"><i>2</i>填写订单信息</div><div class="ln"></div>
    <div class="s"><i>3</i>提交订单</div>
  </div>

  <div v-if="loading" class="state card"><div class="spin"></div><div class="d">正在加载订单信息…</div></div>

  <div v-else-if="!store.user" class="state card">
    <div class="ico"><ui-icon name="lock" :size="34"></ui-icon></div><div class="t">请先登录</div>
    <div class="d">下单需要登录后才能进行。</div>
    <div class="acts"><button class="btn btn-primary" @click="go('/user','tab=login')">去登录</button></div>
  </div>

  <div v-else-if="!items.length" class="state card">
    <div class="ico"><ui-icon name="receipt" :size="34"></ui-icon></div><div class="t">没有待结算的商品</div>
    <div class="d">购物车里还没有勾选商品。先去挑几件，或在购物车里勾选要结算的商品。</div>
    <div class="acts">
      <button class="btn btn-primary" @click="go('/list')">去逛逛</button>
      <button class="btn" @click="go('/cart')">返回购物车</button>
    </div>
  </div>

  <div class="co-lay" v-else>
    <div style="display:grid;gap:16px">
      <!-- 收货地址 -->
      <div class="card pad">
        <div style="display:flex;align-items:center;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:700">收货地址</h3>
          <button class="btn btn-sm" style="margin-left:auto" @click="openAddr()">＋ 新增地址</button>
        </div>
        <div v-if="store.addresses.length" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
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
        <h3 style="font-size:16px;font-weight:700;padding:16px 20px;border-bottom:1px solid var(--line-2)">商品清单</h3>
        <div style="padding:8px 20px">
          <div class="og" v-for="it in items" :key="it.id" style="padding:12px 0;border-bottom:1px solid var(--line-2)">
            <div class="thumb" :style="{'--h':it.hue}">
              <span>{{ it.emoji }}</span>
              <img v-if="it.mainImage" :src="it.mainImage" alt="" class="gone"
                   @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
            </div>
            <div class="nm">{{ it.productName }}</div>
            <div class="pr">¥{{ money(it.price) }} × {{ it.quantity }}</div>
            <b style="width:90px;text-align:right;color:var(--brand)">¥{{ money(it.price*it.quantity) }}</b>
          </div>
        </div>
      </div>

      <!-- 配送与支付 -->
      <div class="card pad">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:14px">配送与支付</h3>
        <div class="opt-row" style="border-top:none;padding-top:0">
          <div class="k">配送方式</div>
          <div class="opt"><span class="tag"><ui-icon name="truck" :size="14"></ui-icon> 标准配送（48 小时内发出）</span></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
          <div class="pay-opt" v-for="pm in pays" :key="pm.k" :class="{on:payment===pm.k}" @click="payment=pm.k">
            <span class="g"><ui-icon :name="pm.ic" :size="20"></ui-icon></span>
            <div><b style="font-size:13.5px">{{ pm.t }}</b><div style="font-size:11.5px;color:var(--ink-3)">{{ pm.d }}</div></div>
            <span class="rd"></span>
          </div>
        </div>
        <div style="margin-top:16px">
          <label class="lbl">订单备注</label>
          <textarea class="field" rows="2" v-model="remark" placeholder="选填，如：工作日送达、放前台代收"></textarea>
        </div>
      </div>
    </div>

    <!-- 结算侧栏 -->
    <div class="card pad" style="position:sticky;top:calc(var(--hdr) + 16px)">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:14px">订单结算</h3>
      <div class="sum-line"><span>商品金额</span><span>¥{{ money(subtotal) }}</span></div>
      <div class="sum-line"><span>商品件数</span><span>{{ checkedCount }} 件</span></div>
      <div class="sum-line total"><span>预计应付</span><span class="v">¥{{ money(subtotal) }}</span></div>
      <p style="font-size:11.5px;color:var(--ink-3);margin-top:10px;line-height:1.7">
        运费与优惠以后端下单结果为准，此处仅显示商品金额小计。
      </p>

      <div style="margin-top:14px;background:#fafbfc;border-radius:var(--r-sm);padding:12px;font-size:12px;color:var(--ink-3);line-height:1.7">
        <span style="display:inline-flex;align-items:center;gap:5px"><ui-icon name="pin" :size="13"></ui-icon>{{ addr ? fullAddr(addr) : '请选择收货地址' }}</span><br>
        <span style="display:inline-flex;align-items:center;gap:5px"><ui-icon name="user" :size="13"></ui-icon>{{ addr ? addr.receiverName + ' ' + addr.receiverPhone : '—' }}</span>
      </div>

      <button class="btn btn-lg btn-primary btn-block" style="margin-top:16px"
              :disabled="!addr || submitting" @click="submit">
        {{ submitting ? '提交中…' : '提交订单' }}</button>
      <button class="btn btn-block" style="margin-top:10px" @click="go('/cart')">返回购物车</button>
      <p style="font-size:11.5px;color:var(--ink-3);margin-top:12px;text-align:center;line-height:1.6">
        提交订单即表示同意《东华购物用户协议》
      </p>
    </div>
  </div>

  <!-- 新增 / 编辑地址弹窗 -->
  <div class="mask" v-if="showAddr" @click.self="showAddr=false">
    <div class="modal" style="max-width:460px">
      <div class="modal-hd"><h3>{{ af.id ? '编辑收货地址' : '新增收货地址' }}</h3>
        <button class="close" @click="showAddr=false">✕</button></div>
      <div class="modal-bd">
        <div class="frow">
          <div><label class="lbl">收货人<span class="req">*</span></label>
            <input class="field" v-model.trim="af.receiverName" placeholder="请输入姓名"></div>
          <div><label class="lbl">联系电话<span class="req">*</span></label>
            <input class="field" v-model.trim="af.receiverPhone" placeholder="11 位手机号"></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">省</label><input class="field" v-model.trim="af.province" placeholder="如：北京市"></div>
          <div><label class="lbl">市</label><input class="field" v-model.trim="af.city" placeholder="如：北京市"></div>
        </div>
        <div style="margin-top:14px"><label class="lbl">区 / 县</label>
          <input class="field" v-model.trim="af.district" placeholder="如：朝阳区"></div>
        <div style="margin-top:14px"><label class="lbl">详细地址<span class="req">*</span></label>
          <input class="field" v-model.trim="af.detail" placeholder="如：甲 1 号院 2 号楼 303 室"></div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:var(--ink-2)"
               v-if="!af.id">
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
      loading: false, addrId: null, payment: 1, remark: '', submitting: false,
      showAddr: false, saving: false, af: U.blankAddr(),
      pays: [
        { k: 1, ic: 'card', t: '在线支付', d: '下单后立即付款' },
        { k: 2, ic: 'cash', t: '货到付款', d: '收到商品再付款' }
      ]
    };
  },
  computed: {
    items: function () { return this.checkedItems; },
    addr: function () {
      var id = this.addrId;
      for (var i = 0; i < this.store.addresses.length; i++) {
        if (String(this.store.addresses[i].id) === String(id)) return this.store.addresses[i];
      }
      return null;
    },
    /* 仅商品金额小计；运费与优惠以服务端下单结果为准 */
    subtotal: function () {
      return this.items.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
    }
  },
  mounted: function () { this.load(); },
  watch: {
    /* 地址被删掉后 addrId 可能悬空，这里兜底回落到默认地址 */
    'store.addresses': function () {
      if (!this.addr && this.store.addresses.length) this.pickDefault();
    }
  },
  methods: {
    load: function () {
      var self = this;
      if (!this.store.user) return;
      this.loading = true;
      SVC.loadCats().catch(function () {});
      Promise.all([
        SVC.loadCart().catch(function () {}),
        SVC.loadAddresses().catch(function () {})
      ]).then(function () {
        self.loading = false;
        if (!self.addr) self.pickDefault();
      });
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
      if (!/^\d{6,20}$/.test(a.receiverPhone || '')) return this.toast('请填写正确的联系电话', '⚠️');
      if (!a.detail) return this.toast('请填写详细地址', '⚠️');
      this.saving = true;
      SVC.saveAddress({
        receiverName: a.receiverName,
        receiverPhone: a.receiverPhone,
        province: a.province,
        city: a.city,
        district: a.district,
        detail: a.detail,
        isDefault: a.isDefault ? 1 : 0
      }, a.id).then(function (d) {
        self.toast('收货地址已保存', '✅');
        self.showAddr = false;
        return SVC.loadAddresses().then(function () {
          if (d && d.id) self.addrId = d.id;
        }, function () {});
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      }).then(function () { self.saving = false; }, function () { self.saving = false; });
    },
    submit: function () {
      var self = this;
      if (!this.addr) return this.toast('请先选择收货地址', '⚠️');
      if (!this.items.length) return this.toast('没有可结算的商品', '⚠️');
      this.submitting = true;
      SVC.createOrder(this.addr.id, this.payment, this.remark).then(function () {
        self.toast('订单提交成功', '🎉');
        return Promise.all([
          SVC.loadCart().catch(function () {}),
          SVC.loadOrders().catch(function () {})
        ]).then(function () { self.go('/orders'); });
      }, function (e) {
        if (e !== U.HANDLED) {
          self.toast(U.errMsg(e), '⚠️');
          /* 库存不足 / 购物车为空等，刷新购物车让最新状态可见 */
          SVC.loadCart().catch(function () {});
        }
      }).then(function () { self.submitting = false; }, function () { self.submitting = false; });
    }
  }
};

})(window.DH);
