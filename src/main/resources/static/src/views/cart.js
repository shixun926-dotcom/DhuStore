/* ==========================================================================
   views/cart.js — 购物车
   行数据即后端 CartItemVO；勾选状态存在服务端（checked 0/1），
   所以每次变更后重拉一次，不做本地乐观更新，避免与服务端漂移。

   可用商品与失效商品分区展示：
   失效（已删除 / 已下架 / 无库存）的行置灰且不可勾选，避免全选后被结算页整体阻断。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;

DH.views['cart-view'] = {
  template: `
<div>
  <div class="steps">
    <div class="s on"><i>1</i>我的购物车</div><div class="ln"></div>
    <div class="s"><i>2</i>填写订单信息</div><div class="ln"></div>
    <div class="s"><i>3</i>提交订单</div>
  </div>

  <!-- 未登录 -->
  <div v-if="!store.user" class="state card" style="margin-top:20px">
    <div class="ico"><ui-icon name="lock" :size="34"></ui-icon></div>
    <div class="t">请先登录</div>
    <div class="d">购物车与订单数据保存在后端，需要登录后才能查看。</div>
    <div class="acts"><button class="btn btn-primary" @click="go('/user','tab=login')">去登录</button></div>
  </div>

  <div v-else-if="loading" class="state card" style="margin-top:20px">
    <div class="spin"></div><div class="d">正在加载购物车…</div>
  </div>

  <div v-else-if="err" class="state card" style="margin-top:20px">
    <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">加载失败</div><div class="d">{{ err }}</div>
    <div class="acts"><button class="btn btn-primary" @click="load">重新加载</button></div>
  </div>

  <div v-else-if="store.cart.length">
    <!-- 可结算商品 -->
    <div class="card" v-if="validItems.length">
      <div style="display:flex;align-items:center;gap:12px;padding:15px 20px;border-bottom:1px solid var(--line);flex-wrap:wrap">
        <input type="checkbox" class="check" :checked="allChecked" @change="toggleAll($event.target.checked)">
        <span style="font-size:13px;color:var(--ink-2)">全选</span>
        <span style="margin-left:auto;font-size:13px;color:var(--ink-3)">共 {{ validItems.length }} 种商品</span>
        <button class="btn btn-sm btn-ghost" :disabled="busy || !checkedCount" @click="clearChecked">删除选中</button>
      </div>

      <div class="cart-item" v-for="it in validItems" :key="it.id">
        <input type="checkbox" class="check" :checked="it.checked===1"
               @change="toggleLine(it,$event.target.checked)">
        <div class="thumb" :style="{'--h':it.hue}" @click="go('/detail/'+it.productId)">
          <span>{{ it.emoji }}</span>
          <img v-if="it.mainImage" :src="it.mainImage" alt="" class="gone"
               @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
        </div>
        <div>
          <div class="nm" @click="go('/detail/'+it.productId)">{{ it.productName }}</div>
          <div class="sk" v-if="it.stock<=5" style="color:var(--warn,#c98a00)">仅剩 {{ it.stock }} 件</div>
        </div>
        <div class="c-price"><span class="price"><span class="cur">¥</span>{{ money(it.price) }}</span></div>
        <div class="c-sub">
          <div class="qty">
            <button :disabled="busy || it.quantity<=1" @click="setQty(it,it.quantity-1)">−</button>
            <input :value="it.quantity" @change="setQty(it,+$event.target.value)">
            <button :disabled="busy || it.quantity>=it.stock" @click="setQty(it,it.quantity+1)">＋</button>
          </div>
        </div>
        <div class="c-sub sub">¥{{ money(it.price*it.quantity) }}</div>
        <div class="c-del"><button class="btn btn-sm btn-ghost" :disabled="busy" @click="remove(it)">删除</button></div>
      </div>

      <div class="cart-bar">
        <input type="checkbox" class="check" :checked="allChecked" @change="toggleAll($event.target.checked)">
        <span style="font-size:13px;color:var(--ink-2)">全选</span>
        <span style="font-size:13px;color:var(--ink-3)">已选 <b style="color:var(--brand)">{{ checkedCount }}</b> 件</span>
        <div class="total">
          <div style="font-size:13px;color:var(--ink-3)">合计（不含运费）</div>
          <div class="n">¥{{ money(checkedTotal) }}</div>
        </div>
        <button class="btn btn-lg btn-primary" :disabled="!checkedCount" @click="toCheckout">
          去结算 ({{ checkedCount }})</button>
      </div>
    </div>

    <!-- 失效商品：置灰、不可勾选，只提供删除 -->
    <div class="card inv-block" v-if="invalidItems.length" :class="{ gap: validItems.length }">
      <div class="inv-hd">
        <span class="inv-t">失效商品 {{ invalidItems.length }} 件</span>
        <span class="inv-d">已下架或售罄，无法结算</span>
        <button class="btn btn-sm btn-ghost" :disabled="busy" @click="clearInvalid">清空失效</button>
      </div>
      <div class="cart-item off" v-for="it in invalidItems" :key="it.id">
        <input type="checkbox" class="check" disabled>
        <div class="thumb" :style="{'--h':it.hue}">
          <span>{{ it.emoji }}</span>
          <img v-if="it.mainImage" :src="it.mainImage" alt="" class="gone"
               @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
        </div>
        <div>
          <div class="nm">{{ it.productName }}</div>
          <div class="sk" style="color:var(--crit)">{{ invReason(it) }}</div>
        </div>
        <div class="c-price"><span class="price"><span class="cur">¥</span>{{ money(it.price) }}</span></div>
        <div class="c-sub"><span class="inv-qty">×{{ it.quantity }}</span></div>
        <div class="c-sub sub">¥{{ money(it.price*it.quantity) }}</div>
        <div class="c-del"><button class="btn btn-sm btn-ghost" :disabled="busy" @click="remove(it)">删除</button></div>
      </div>
    </div>

    <!-- 全部失效 -->
    <div v-if="!validItems.length" class="empty card" style="margin-top:16px">
      <div class="ico"><ui-icon name="cart" :size="34"></ui-icon></div>
      <div>购物车里的商品都已失效</div>
      <div style="font-size:13px">清理后可继续挑选商品</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:8px">
        <button class="btn" :disabled="busy" @click="clearInvalid">清空失效</button>
        <button class="btn btn-primary" @click="go('/list')">去逛逛</button>
      </div>
    </div>
  </div>

  <div v-else class="empty card" style="margin-top:20px">
    <div class="ico"><ui-icon name="cart" :size="34"></ui-icon></div>
    <div>购物车还是空的</div>
    <div style="font-size:13px">快去挑选心仪的商品吧</div>
    <button class="btn btn-primary" @click="go('/list')">去逛逛</button>
  </div>

  <section class="sec" v-if="suggest.length">
    <div class="sec-hd"><div class="sec-title">猜你喜欢</div></div>
    <div class="goods"><goods-card v-for="p in suggest" :key="p.id" :p="p"></goods-card></div>
  </section>
</div>`,

  data: function () { return { loading: false, err: '', suggest: [] }; },
  computed: {
    /* 可结算与失效分开，失效行不参与全选与合计 */
    validItems: function () {
      return this.store.cart.filter(function (i) { return i.available; });
    },
    invalidItems: function () {
      return this.store.cart.filter(function (i) { return !i.available; });
    }
  },
  mounted: function () { this.load(); },
  methods: {
    load: function () {
      var self = this;
      if (!this.store.user) return;
      this.loading = true;
      this.err = '';
      SVC.loadCats().catch(function () {});
      SVC.loadCart().then(function () {
        self.loading = false;
      }, function (e) {
        self.loading = false;
        if (e !== U.HANDLED) self.err = U.errMsg(e);
      });
      /* 「猜你喜欢」是锦上添花，失败就不显示 */
      SVC.loadProducts({ page: 1, size: 4 }).then(function (d) {
        self.suggest = U.listOf(d).map(SVC.adapt);
      }, function () { self.suggest = []; });
    },
    invReason: function (it) {
      if (it.status === null || it.status === undefined) return '商品已删除';
      if (Number(it.status) === 0) return '商品已下架';
      if (!(it.stock > 0)) return '已售罄';
      return '暂不可购买';
    },
    toggleLine: function (it, checked) { SVC.toggleCartLine(it, checked); },
    toggleAll: function (v) { SVC.setAllChecked(v); },
    clearChecked: function () { SVC.clearChecked(); },
    clearInvalid: function () { SVC.clearUnavailableCart(); },
    remove: function (it) { SVC.removeCart(it); },
    setQty: function (it, v) { SVC.setCartQty(it, v); },
    toCheckout: function () {
      if (this.checkedCount) this.go('/checkout');
      else this.toast('请先勾选要结算的商品', '⚠️');
    }
  }
};

})(window.DH);
