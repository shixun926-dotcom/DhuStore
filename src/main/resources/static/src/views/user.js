/* ==========================================================================
   views/user.js — 用户中心：登录/注册 / 个人资料 / 收货地址 / 订单摘要
   登录成功后同步购物车、订单、地址 —— 这三样都是服务端的，换了账号必须重拉。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util;

DH.views['user-view'] = {
  template: `
<div>
  <!-- 未登录 -->
  <div class="auth" v-if="!store.user">
    <h2>{{ mode==='login' ? '欢迎回来' : '注册东华购物账号' }}</h2>
    <p class="tip">{{ mode==='login' ? '登录后可同步购物车与订单信息' : '注册成功后将自动登录' }}</p>

    <div class="fg"><label class="lbl">用户名</label>
      <input class="field" v-model.trim="f.username" placeholder="3–20 位用户名" @keyup.enter="submit"></div>
    <div class="fg" v-if="mode==='reg'"><label class="lbl">昵称</label>
      <input class="field" v-model.trim="f.nickname" placeholder="选填，默认与用户名相同"></div>
    <div class="fg"><label class="lbl">密码</label>
      <input class="field" type="password" v-model="f.password"
             :placeholder="mode==='reg' ? '6–32 位密码' : '请输入密码'" @keyup.enter="submit"></div>
    <template v-if="mode==='reg'">
      <div class="frow">
        <div class="fg"><label class="lbl">手机号</label>
          <input class="field" v-model.trim="f.phone" placeholder="选填"></div>
        <div class="fg"><label class="lbl">邮箱</label>
          <input class="field" v-model.trim="f.email" placeholder="选填"></div>
      </div>
    </template>

    <button class="btn btn-lg btn-primary btn-block" :disabled="submitting" @click="submit">
      {{ submitting ? '处理中…' : (mode==='login' ? '登 录' : '注 册') }}</button>

    <div class="switch">
      <template v-if="mode==='login'">还没有账号？<b @click="mode='reg'">立即注册</b></template>
      <template v-else>已有账号？<b @click="mode='login'">返回登录</b></template>
    </div>

    <div style="margin-top:22px;padding:14px;background:#fafbfc;border-radius:var(--r-sm);font-size:12.5px;color:var(--ink-3);line-height:1.9">
      账号由后端 <code>/api/auth</code> 提供。<br>
      若数据库尚未初始化，可先向下表插入测试账号，或调用 <code>POST /api/auth/register</code> 注册。
    </div>
  </div>

  <!-- 已登录 -->
  <div class="uc-lay" v-else>
    <aside>
      <div class="uc-card">
        <div class="av" :class="{ img: !!store.user.avatar }">
          <img v-if="store.user.avatar" :src="store.user.avatar"
               :alt="store.user.nickname || store.user.username">
          <template v-else>{{ (store.user.nickname || store.user.username).charAt(0) }}</template>
        </div>
        <div class="nm">{{ store.user.nickname || store.user.username }}</div>
        <div class="lv">💎 {{ store.user.role===1 ? '超级管理员' : 'V2 黄金会员' }}</div>
        <div class="uc-stats">
          <div><b>{{ store.orders.length }}</b><small>订单</small></div>
          <div><b>{{ store.cart.length }}</b><small>购物车</small></div>
          <div><b>{{ store.addresses.length }}</b><small>地址</small></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px;padding:6px 0">
        <a class="side-link" v-for="m in menus" :key="m.k" href="#" @click.prevent="tab=m.k"
           :style="{display:'flex',alignItems:'center',gap:'10px',padding:'11px 16px',fontSize:'13.5px',
                    color: tab===m.k ? 'var(--brand)' : 'var(--ink-2)',
                    background: tab===m.k ? 'var(--brand-l2)' : 'transparent',
                    borderLeft: '3px solid ' + (tab===m.k ? 'var(--brand)' : 'transparent'),
                    fontWeight: tab===m.k ? 600 : 400}">
          <span>{{ m.g }}</span>{{ m.t }}
        </a>
        <a href="#" @click.prevent="logout"
           style="display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:13.5px;color:var(--ink-3)">↩ 退出登录</a>
      </div>
    </aside>

    <div>
      <!-- 个人资料 -->
      <div class="card pad" v-if="tab==='info'">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:18px">个人资料</h3>

        <!-- 头像：选图即本地预览，点「保存修改」才上传并与账号绑定 -->
        <div class="ava-row">
          <div class="ava-prev" :class="{ img: !!(avPreview || store.user.avatar) }">
            <img v-if="avPreview || store.user.avatar" :src="avPreview || store.user.avatar" alt="头像预览">
            <span v-else>{{ (store.user.nickname || store.user.username).charAt(0) }}</span>
          </div>
          <div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm" :disabled="saving" @click="$refs.avatarFile.click()">
                {{ (avPreview || store.user.avatar) ? '更换图片' : '上传头像' }}</button>
              <button class="btn btn-sm btn-danger" v-if="avPreview || store.user.avatar"
                      :disabled="saving" @click="clearAvatar">移除</button>
            </div>
            <div class="ava-tip">支持 JPG / PNG / WEBP，单张不超过 5MB<br>选图后立即预览，点「保存修改」后生效</div>
          </div>
          <input type="file" ref="avatarFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
                 @change="onPickAvatar">
        </div>
        <div class="frow">
          <div><label class="lbl">用户名</label><input class="field" :value="store.user.username" disabled></div>
          <div><label class="lbl">昵称</label><input class="field" v-model.trim="pf.nickname"></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">手机号</label><input class="field" v-model.trim="pf.phone" placeholder="未绑定"></div>
          <div><label class="lbl">邮箱</label><input class="field" v-model.trim="pf.email" placeholder="未绑定"></div>
        </div>
        <div class="notice" style="margin-top:18px" v-if="profileUnsupported">
          <span class="g">⚠️</span>
          <div>
            <b>后端暂未提供资料修改接口</b>
            <p>契约接口为 <code>PUT /api/users/me</code>，接收 <code>{nickname, phone, email, avatar}</code>，
              返回 <code>{code:200, data:更新后的 UserVO}</code>。后端实现后此表单即可保存。</p>
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:18px" :disabled="saving" @click="saveInfo">
          {{ saving ? '保存中…' : '保存修改' }}</button>
      </div>

      <!-- 收货地址 -->
      <div class="card pad" v-else-if="tab==='addr'">
        <div style="display:flex;align-items:center;margin-bottom:18px">
          <h3 style="font-size:16px;font-weight:700">收货地址管理</h3>
          <button class="btn btn-sm btn-primary" style="margin-left:auto" @click="openAddr()">＋ 新增地址</button>
        </div>
        <div v-if="store.addresses.length" style="display:grid;gap:12px">
          <div class="addr-item" v-for="a in store.addresses" :key="a.id">
            <div>
              <div style="font-weight:600">
                {{ a.receiverName }}<span style="color:var(--ink-3);font-weight:400;margin-left:10px">{{ a.receiverPhone }}</span>
                <span class="df" v-if="a.isDefault===1">默认</span>
              </div>
              <div style="font-size:13px;color:var(--ink-2);margin-top:5px">{{ fullAddr(a) }}</div>
            </div>
            <div class="acts">
              <button class="btn btn-sm" v-if="a.isDefault!==1" :disabled="busy" @click="setDefault(a)">设为默认</button>
              <button class="btn btn-sm" @click="openAddr(a)">编辑</button>
              <button class="btn btn-sm btn-danger" :disabled="busy" @click="delAddr(a)">删除</button>
            </div>
          </div>
        </div>
        <div v-else class="empty"><div class="ico">📍</div><div>还没有收货地址</div></div>
      </div>

      <!-- 我的订单摘要 -->
      <div class="card pad" v-else-if="tab==='order'">
        <div style="display:flex;align-items:center;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:700">最近订单</h3>
          <button class="btn btn-sm" style="margin-left:auto" @click="go('/orders')">查看全部 →</button>
        </div>
        <div v-if="store.orders.length">
          <div v-for="o in store.orders.slice(0,4)" :key="o.id"
               style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--line-2);flex-wrap:wrap">
            <span style="font-size:12.5px;color:var(--ink-3);width:150px" class="num">{{ o.orderNo }}</span>
            <span style="flex:1;font-size:13.5px">{{ o.items[0] ? o.items[0].productName : '—' }}{{ o.items.length>1 ? ' 等 ' + o.items.length + ' 件' : '' }}</span>
            <span :style="{color:status(o.status).color,fontSize:'12.5px',fontWeight:600}">{{ status(o.status).icon }} {{ status(o.status).text }}</span>
            <b style="color:var(--brand);width:100px;text-align:right">¥{{ money(o.totalPrice) }}</b>
          </div>
        </div>
        <div v-else class="empty"><div class="ico">📦</div><div>还没有订单</div>
          <button class="btn btn-primary" @click="go('/list')">去逛逛</button></div>
      </div>

      <!-- 申请发布商品 -->
      <div class="card pad" v-else-if="tab==='publish'">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:6px">申请发布商品</h3>
        <p style="font-size:12.5px;color:var(--ink-3);margin-bottom:18px">提交后进入审核，管理员通过后才会正式上架商城。</p>
        <div class="frow">
          <div><label class="lbl">商品名称<span class="req">*</span></label>
            <input class="field" v-model.trim="af2.name" placeholder="请输入商品名称"></div>
          <div><label class="lbl">所属分类<span class="req">*</span></label>
            <select class="field" v-model="af2.categoryId">
              <option value="">请选择分类</option>
              <option v-for="c in store.cats" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">价格（元）<span class="req">*</span></label>
            <input class="field" type="number" min="0" step="0.01" v-model.number="af2.price"></div>
          <div><label class="lbl">库存<span class="req">*</span></label>
            <input class="field" type="number" min="0" v-model.number="af2.stock"></div>
        </div>
        <div style="margin-top:14px">
          <label class="lbl">商品图片<span class="req">*</span>（1–9 张，第一张为主图）</label>
          <div class="uploader">
            <div class="up-item" v-for="(u,i) in af2.images" :key="u">
              <img :src="u" alt="">
              <span class="main-tag" v-if="i===0">主图</span>
              <button type="button" class="rm" @click="removeApplyImage(i)">✕</button>
            </div>
            <div class="up-add" v-if="af2.images.length < 9" @click="$refs.applyFile.click()">
              <div><div class="plus">＋</div>上传图片</div>
            </div>
          </div>
          <input type="file" ref="applyFile" accept=".jpg,.jpeg,.png,.webp" multiple
                 style="display:none" @change="onPickApplyImages">
          <div class="up-meta">已选择 {{ af2.images.length }}/9 张 · 支持 JPG/PNG/WEBP · 单张不超过 5MB</div>
        </div>
        <div style="margin-top:14px"><label class="lbl">商品描述</label>
          <textarea class="field" rows="3" v-model.trim="af2.description" placeholder="选填"></textarea></div>
        <button class="btn btn-primary" style="margin-top:18px" :disabled="saving" @click="submitApply">
          {{ saving ? '提交中…' : '提交申请' }}</button>
      </div>

      <!-- 我的商品申请 -->
      <div class="card pad" v-else-if="tab==='myapply'">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:18px">我的商品申请</h3>
        <div v-if="applyLoading" class="state"><div class="spin"></div><div class="d">正在加载…</div></div>
        <div v-else-if="myApplies.length">
          <div v-for="a in myApplies" :key="a.id"
               style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--line-2);flex-wrap:wrap">
            <span style="flex:1;font-weight:600">{{ a.name }}</span>
            <span style="width:110px;color:var(--brand);font-weight:700">¥{{ money(a.price) }}</span>
            <span class="tg" :style="{color:applyStatus(a.status).color}">
              <span class="dot" :style="{background:applyStatus(a.status).color}"></span>{{ applyStatus(a.status).text }}</span>
            <span v-if="a.status===2 && a.rejectReason" style="font-size:12.5px;color:var(--ink-3)">原因：{{ a.rejectReason }}</span>
          </div>
        </div>
        <div v-else class="empty"><div class="ico">📝</div><div>还没有提交过商品申请</div></div>
      </div>
    </div>
  </div>

  <!-- 地址弹窗 -->
  <div class="mask" v-if="showAddr" @click.self="showAddr=false">
    <div class="modal" style="max-width:460px">
      <div class="modal-hd"><h3>{{ editing ? '编辑地址' : '新增地址' }}</h3><button class="close" @click="showAddr=false">✕</button></div>
      <div class="modal-bd">
        <div class="frow">
          <div><label class="lbl">收货人<span class="req">*</span></label><input class="field" v-model.trim="af.receiverName"></div>
          <div><label class="lbl">联系电话<span class="req">*</span></label><input class="field" v-model.trim="af.receiverPhone"></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">省</label><input class="field" v-model.trim="af.province"></div>
          <div><label class="lbl">市</label><input class="field" v-model.trim="af.city"></div>
        </div>
        <div style="margin-top:14px"><label class="lbl">区 / 县</label><input class="field" v-model.trim="af.district"></div>
        <div style="margin-top:14px"><label class="lbl">详细地址<span class="req">*</span></label><input class="field" v-model.trim="af.detail"></div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:var(--ink-2)" v-if="!editing">
          <input type="checkbox" class="check" v-model="af.isDefault"> 设为默认收货地址</label>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="showAddr=false">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="saveAddr">{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </div>
  </div>
</div>`,

  data: function () {
    return {
      mode: 'login',
      f: { username: '', password: '', nickname: '', phone: '', email: '' },
      submitting: false,
      tab: 'info',
      pf: { nickname: '', phone: '', email: '' },
      /* 头像：avFile 待上传的文件，avPreview 本地预览图，avRemoved 表示本次要清除已存头像 */
      avFile: null, avPreview: '', avRemoved: false,
      profileUnsupported: false,
      showAddr: false, editing: false, saving: false, af: U.blankAddr(), _editId: null,
      af2: { name: '', categoryId: '', price: null, stock: null, description: '', images: [] },
      myApplies: [], applyLoading: false,
      menus: [
        { k: 'info', g: '👤', t: '个人资料' },
        { k: 'addr', g: '📍', t: '收货地址' },
        { k: 'order', g: '📦', t: '我的订单' },
        { k: 'publish', g: '🛍️', t: '申请发布商品' },
        { k: 'myapply', g: '📝', t: '我的商品申请' }
      ]
    };
  },
  mounted: function () { this.sync(); },
  watch: {
    /* #/user?tab=login|reg|info|addr|order 直接决定打开哪个面板 */
    'route.query.tab': { immediate: true, handler: function (v) { this.applyTab(v); } },
    'store.user': { deep: true, handler: function () { this.sync(); } }
  },
  methods: {
    applyTab: function (v) {
      if (v === 'reg') this.mode = 'reg';
      else if (v === 'login') this.mode = 'login';
      if (v === 'addr' || v === 'order' || v === 'info' || v === 'publish' || v === 'myapply') this.tab = v;
      if (v === 'publish') SVC.loadCats().catch(function () {});
      if (v === 'myapply') this.loadMyApplies();
    },
    /* 登录态变化时把资料表单与三份服务端数据同步过来 */
    sync: function () {
      var u = this.store.user;
      if (!u) return;
      this.pf.nickname = u.nickname || '';
      this.pf.phone = u.phone || '';
      this.pf.email = u.email || '';
      /* 头像以服务端值为准：切换账号或保存成功后清掉本地待提交状态 */
      this.avFile = null;
      this.avPreview = '';
      this.avRemoved = false;
      SVC.loadCats().catch(function () {});
      SVC.loadAddresses().catch(function () {});
      SVC.loadCart().catch(function () {});
      SVC.loadOrders().catch(function () {});
    },
    submit: function () {
      var self = this;
      var u = (this.f.username || '').trim();
      var p = this.f.password || '';
      if (u.length < 3 || u.length > 20) return this.toast('用户名需 3–20 位', '⚠️');
      if (p.length < 6) return this.toast('密码至少 6 位', '⚠️');
      this.submitting = true;
      var isLogin = this.mode === 'login';
      var req = isLogin
        ? SVC.login(u, p)
        : SVC.register({
            username: u, password: p,
            nickname: this.f.nickname || u,
            phone: this.f.phone || null,
            email: this.f.email || null
          });
      req.then(function () {
        self.toast(isLogin ? '登录成功' : '注册成功，已自动登录', '🎉');
        self.f.password = '';
        self.submitting = false;
        return SVC.warmUp();
      }, function (e) {
        self.submitting = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    /* 资料修改：选过新头像则先上传拿 URL，再连同昵称/联系方式一起提交 */
    saveInfo: function () {
      var self = this;
      this.saving = true;
      this.profileUnsupported = false;
      var step = this.avFile ? SVC.uploadImage(this.avFile) : Promise.resolve(null);
      step.then(function (uploaded) {
        var body = {
          nickname: self.pf.nickname || null,
          phone: self.pf.phone || null,
          email: self.pf.email || null
        };
        /* 上传成功用新地址；本次点了移除则传空串清除；否则不传，后端保持原值 */
        if (uploaded) body.avatar = uploaded;
        else if (self.avRemoved) body.avatar = '';
        return DH.api.request('PUT', '/users/me', body);
      }).then(function (u) {
        if (u) { self.store.user = u; U.LS.set('dh_user', u); }
        self.avFile = null; self.avPreview = ''; self.avRemoved = false;
        self.toast('资料已保存', '✅');
        self.saving = false;
      }, function (e) {
        self.saving = false;
        if (e === U.HANDLED) return;
        /* 上传类错误（本地校验 -2 / 过大 2006 / 格式 2007 / 失败 2009 / 未配置 2010）单独给文案 */
        var UPLOAD_CODES = { '-2': 1, 2006: 1, 2007: 1, 2009: 1, 2010: 1 };
        if (e && UPLOAD_CODES[e.code]) {
          self.toast(SVC.uploadMsg(e), '⚠️');
        } else if (U.isUnsupported(e)) {
          self.profileUnsupported = true;
          self.toast('后端暂未提供资料修改接口', '⚠️');
        } else {
          self.toast(U.errMsg(e), '⚠️');
        }
      });
    },
    /* 选择本地头像：先按格式/大小校验，再读成 DataURL 做即时预览，不上传 */
    onPickAvatar: function (e) {
      var self = this;
      var file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file) return;
      var err = SVC.checkImage(file);
      if (err) return this.toast(err, '⚠️');
      var reader = new FileReader();
      reader.onload = function () {
        self.avFile = file;
        self.avPreview = reader.result;
        self.avRemoved = false;
      };
      reader.onerror = function () { self.toast('图片读取失败，请换一张重试', '⚠️'); };
      reader.readAsDataURL(file);
    },
    /* 移除头像：清预览并标记，保存时提交空串 */
    clearAvatar: function () {
      this.avFile = null;
      this.avPreview = '';
      this.avRemoved = true;
    },
    openAddr: function (a) {
      this.editing = !!a;
      this.af = a ? {
        receiverName: a.receiverName, receiverPhone: a.receiverPhone,
        province: a.province, city: a.city, district: a.district,
        detail: a.detail, isDefault: Number(a.isDefault) === 1
      } : U.blankAddr();
      this._editId = a ? a.id : null;
      this.showAddr = true;
    },
    saveAddr: function () {
      var self = this, a = this.af;
      if (!a.receiverName) return this.toast('请填写收货人姓名', '⚠️');
      if (!/^\d{6,20}$/.test(a.receiverPhone || '')) return this.toast('请填写正确的联系电话', '⚠️');
      if (!a.detail) return this.toast('请填写详细地址', '⚠️');
      this.saving = true;
      SVC.saveAddress({
        receiverName: a.receiverName, receiverPhone: a.receiverPhone,
        province: a.province, city: a.city, district: a.district,
        detail: a.detail, isDefault: a.isDefault ? 1 : 0
      }, this._editId).then(function () {
        self.toast('地址已保存', '✅');
        self.showAddr = false;
        return SVC.loadAddresses();
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      }).then(function () { self.saving = false; }, function () { self.saving = false; });
    },
    setDefault: function (a) { SVC.setDefaultAddress(a); },
    delAddr: function (a) { SVC.deleteAddress(a); },
    fullAddr: function (a) {
      if (!a) return '';
      return [a.province, a.city, a.district, a.detail].filter(Boolean).join(' ');
    },
    /* 提交商品发布申请 */
    submitApply: function () {
      var self = this, a = this.af2;
      if (!a.name) return this.toast('请填写商品名称', '⚠️');
      if (!a.categoryId) return this.toast('请选择分类', '⚠️');
      if (!(Number(a.price) > 0)) return this.toast('请填写正确的价格', '⚠️');
      if (!(Number(a.stock) >= 0)) return this.toast('请填写正确的库存', '⚠️');
      if (!a.images.length) return this.toast('请至少上传一张商品图片', '⚠️');
      this.saving = true;
      SVC.applyProduct({
        name: a.name, categoryId: a.categoryId,
        price: Number(a.price), stock: Number(a.stock),
        description: a.description || '', images: a.images
      }).then(function () {
        self.toast('申请已提交，等待管理员审核', '🎉');
        self.saving = false;
        self.af2 = { name: '', categoryId: '', price: null, stock: null, description: '', images: [] };
        self.tab = 'myapply';
        self.loadMyApplies();
      }, function (e) {
        self.saving = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    /* 选择本地图片 → 校验 → 上传 → 预览 */
    onPickApplyImages: function (e) {
      var self = this;
      var files = Array.prototype.slice.call(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;
      var remain = 9 - this.af2.images.length;
      if (remain <= 0) return this.toast('商品图片最多上传9张', '⚠️');
      if (files.length > remain) {
        files = files.slice(0, remain);
        this.toast('商品图片最多上传9张，已选取前 ' + remain + ' 张', '⚠️');
      }
      for (var i = 0; i < files.length; i++) {
        var err = SVC.checkImage(files[i]);
        if (err) return this.toast(err, '⚠️');
      }
      this.saving = true;
      Promise.all(files.map(function (f) { return SVC.uploadImage(f); }))
        .then(function (urls) {
          self.af2.images = self.af2.images.concat(urls.filter(Boolean)).slice(0, 9);
          self.saving = false;
        }, function (err) {
          self.saving = false;
          if (err !== U.HANDLED) self.toast(U.errMsg(err), '⚠️');
        });
    },
    removeApplyImage: function (i) { this.af2.images.splice(i, 1); },
    loadMyApplies: function () {
      var self = this;
      this.applyLoading = true;
      SVC.loadMyApplies().then(function (list) {
        self.myApplies = list;
        self.applyLoading = false;
      }, function (e) {
        self.applyLoading = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    applyStatus: function (s) {
      var n = Number(s);
      if (n === 0) return { text: '待审核', color: '#eda100' };
      if (n === 1) return { text: '已通过', color: '#0ca30c' };
      if (n === 2) return { text: '已拒绝', color: '#d03b3b' };
      return { text: '未知', color: '#898781' };
    }
  }
};

})(window.DH);
