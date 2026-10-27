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
        <div class="lv"><ui-icon name="diamond" :size="12"></ui-icon> {{ store.user.role===1 ? '超级管理员' : 'V2 黄金会员' }}</div>
        <div class="uc-stats">
          <a href="#" @click.prevent="goTab('following')"><b>{{ store.followStats.following }}</b><small>关注</small></a>
          <a href="#" @click.prevent="goTab('followers')"><b>{{ store.followStats.followers }}</b><small>粉丝</small></a>
          <a href="#" @click.prevent="goTab('msg')">
            <b :class="{ hot: store.unread>0 }">{{ store.unread }}</b><small>消息</small></a>
        </div>
      </div>
      <nav class="card uc-nav">
        <a v-for="m in menus" :key="m.k" href="#" @click.prevent="goTab(m.k)" :class="{ on: tab===m.k }">
          <ui-icon :name="m.ic" :size="16"></ui-icon>{{ m.t }}
        </a>
        <a href="#" class="out" @click.prevent="logout"><ui-icon name="logout" :size="16"></ui-icon>退出登录</a>
      </nav>
    </aside>

    <div>
      <!-- 个人资料 -->
      <div class="card uc-panel" v-if="tab==='info'">
        <header class="uc-hd">
          <h3>个人资料</h3>
          <p>维护头像与联系方式，让订单通知更准确</p>
        </header>

        <!-- 头像：选图即本地预览，点「保存修改」才上传并与账号绑定 -->
        <section class="uc-ident">
          <div class="uc-av" :class="{ img: !!avSrc }"
               role="button" tabindex="0" aria-label="更换头像"
               @click="!saving && $refs.avatarFile.click()"
               @keyup.enter="!saving && $refs.avatarFile.click()">
            <img v-if="avSrc" :src="avSrc" alt="头像预览">
            <span v-else>{{ (store.user.nickname || store.user.username).charAt(0) }}</span>
            <span class="uc-av-mask"><ui-icon name="image" :size="20"></ui-icon></span>
          </div>
          <div class="uc-ident-tx">
            <div class="uc-ident-nm">
              {{ store.user.nickname || store.user.username }}
              <span class="tag tag-brand">{{ store.user.role===1 ? '超级管理员' : 'V2 黄金会员' }}</span>
            </div>
            <div class="uc-ident-un">@{{ store.user.username }}</div>
            <div class="uc-ident-acts">
              <button class="btn btn-sm" :disabled="saving" @click="$refs.avatarFile.click()">
                {{ avSrc ? '更换图片' : '上传头像' }}</button>
              <button class="btn btn-sm btn-danger" v-if="avSrc"
                      :disabled="saving" @click="clearAvatar">移除</button>
            </div>
          </div>
          <input type="file" ref="avatarFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
                 @change="onPickAvatar">
        </section>

        <section class="uc-sec">
          <div class="uc-sec-hd"><h4>基本信息</h4><span>用户名注册后不可修改</span></div>
          <div class="frow">
            <div>
              <label class="lbl">用户名</label>
              <div class="uc-ro"><ui-icon name="lock" :size="13"></ui-icon>{{ store.user.username }}</div>
            </div>
            <div><label class="lbl">昵称</label><input class="field" v-model.trim="pf.nickname" placeholder="设置一个昵称"></div>
          </div>
        </section>

        <section class="uc-sec">
          <div class="uc-sec-hd"><h4>联系方式</h4><span>用于接收订单与审核通知</span></div>
          <div class="frow">
            <div><label class="lbl">手机号</label><input class="field" v-model.trim="pf.phone" placeholder="未绑定"></div>
            <div><label class="lbl">邮箱</label><input class="field" v-model.trim="pf.email" placeholder="未绑定"></div>
          </div>
        </section>

        <div class="notice" v-if="profileUnsupported">
          <span class="g"><ui-icon name="alert" :size="20"></ui-icon></span>
          <div>
            <b>资料修改服务暂不可用</b>
            <p>请稍后重试，或联系站点管理员处理。</p>
          </div>
        </div>

        <footer class="uc-foot">
          <button class="btn btn-primary" :disabled="saving" @click="saveInfo">
            {{ saving ? '保存中…' : '保存修改' }}</button>
        </footer>
      </div>

      <!-- 消息：左侧会话列表 + 右侧聊天窗口 -->
      <div class="card uc-chat" v-else-if="tab==='msg'">
        <aside class="chat-side">
          <div class="chat-side-hd">
            <h3>消息</h3>
            <span v-if="store.unread>0">{{ store.unread }} 条未读</span>
          </div>
          <div class="chat-convs">
            <div class="conv" v-for="c in conversations" :key="c.id"
                 :class="{ on: activeConv && activeConv.id===c.id }" @click="openConversation(c)">
              <div class="conv-av" :class="{ img: !!c.peerAvatar }">
                <img v-if="c.peerAvatar" :src="c.peerAvatar" :alt="c.peerName">
                <span v-else>{{ (c.peerName || '?').charAt(0) }}</span>
              </div>
              <div class="conv-tx">
                <div class="conv-nm">
                  <span class="conv-name">{{ c.peerName }}</span>
                  <span class="conv-time">{{ shortTime(c.lastTime) }}</span>
                </div>
                <div class="conv-last" :class="{ unread: c.unread>0 }">{{ c.lastContent || '开始聊天吧' }}</div>
              </div>
              <span class="conv-badge" v-if="c.unread>0">{{ c.unread > 99 ? '99+' : c.unread }}</span>
            </div>
            <div v-if="!conversations.length" class="chat-tip">
              <ui-icon name="chat" :size="26"></ui-icon>
              <p>还没有会话</p>
              <span>在商品详情页点「发消息」即可开始</span>
            </div>
          </div>
        </aside>

        <section class="chat-main" v-if="activeConv">
          <header class="chat-hd">
            <b>{{ activeConv.peerName }}</b>
            <span class="chat-state" :class="{ on: wsOn }">{{ wsOn ? '实时在线' : '连接中…' }}</span>
          </header>

          <div class="chat-msgs" ref="msgBox">
            <div class="chat-more" v-if="hasMore" @click="loadOlder">
              {{ loadingMore ? '加载中…' : '查看更早的消息' }}
            </div>
            <div class="msg-flow">
              <div class="msg" v-for="m in messages" :key="m.id" :class="{ mine: m.mine }">
                <div class="bubble" :class="{ 'bubble-img': m.type===2 }">
                  <img v-if="m.type===2" :src="m.content" alt=""
                       @load="scrollBottom" @error="imgBroken($event)">
                  <template v-else>{{ m.content }}</template>
                </div>
                <div class="msg-time">{{ shortTime(m.createTime) }}</div>
              </div>
            </div>
            <div v-if="!messages.length" class="chat-tip">
              <ui-icon name="chat" :size="26"></ui-icon>
              <p>还没有消息</p><span>发条消息打个招呼吧</span>
            </div>
          </div>

          <footer class="chat-input">
            <button class="ci-btn" title="表情" @click="emojiOpen=!emojiOpen">
              <ui-icon name="smile" :size="18"></ui-icon>
            </button>
            <button class="ci-btn" title="发送图片" @click="$refs.chatFile.click()">
              <ui-icon name="image" :size="18"></ui-icon>
            </button>
            <textarea class="ci-text" rows="1" v-model="chatText" :disabled="sending"
                      placeholder="输入消息，Enter 发送" @keydown.enter.exact.prevent="sendText"></textarea>
            <button class="ci-send" :disabled="sending || !chatText.trim()" @click="sendText">
              <ui-icon name="send" :size="17"></ui-icon>
            </button>
            <div class="emoji-pop" v-if="emojiOpen">
              <span v-for="e in EMOJIS" :key="e" @click="insertEmoji(e)">{{ e }}</span>
            </div>
            <input type="file" ref="chatFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
                   @change="onPickChatImage">
          </footer>
        </section>

        <section class="chat-main chat-blank" v-else>
          <div class="chat-tip">
            <ui-icon name="chat" :size="32"></ui-icon>
            <p>选择一个会话开始聊天</p>
            <span>消息会实时推送到这里</span>
          </div>
        </section>
      </div>

      <!-- 我的关注 -->
      <div class="card pad" v-else-if="tab==='following'">
        <div class="uc-list-hd">
          <h3>我的关注</h3><span>{{ followingTotal }} 人</span>
        </div>
        <div v-if="followLoading" class="state"><div class="spin"></div><div class="d">正在加载…</div></div>
        <div v-else-if="followingList.length" class="user-list">
          <div class="user-row" v-for="u in followingList" :key="u.id">
            <div class="user-av" :class="{ img: !!u.avatar }">
              <img v-if="u.avatar" :src="u.avatar" :alt="u.nickname">
              <span v-else>{{ (u.nickname || u.username || '?').charAt(0) }}</span>
            </div>
            <div class="user-tx">
              <div class="user-nm">
                {{ u.nickname || u.username }}
                <span class="tag tag-brand" v-if="u.role===1">管理员</span>
                <span class="tag" v-if="u.mutual">互相关注</span>
              </div>
              <div class="user-sub">{{ u.followerCount }} 位粉丝 · {{ fmt(u.followTime) }} 关注</div>
            </div>
            <div class="user-acts">
              <button class="btn btn-sm btn-danger" :disabled="followBusy" @click="toggleRow(u, true)">取消关注</button>
              <button class="btn btn-sm" @click="openChatWith(u.id)"><ui-icon name="chat" :size="14"></ui-icon> 发消息</button>
            </div>
          </div>
        </div>
        <div v-else class="empty">
          <div class="ico"><ui-icon name="heart" :size="34"></ui-icon></div><div>还没有关注任何人</div>
          <button class="btn btn-primary" @click="go('/list')">去逛逛</button>
        </div>
      </div>

      <!-- 我的粉丝 -->
      <div class="card pad" v-else-if="tab==='followers'">
        <div class="uc-list-hd">
          <h3>我的粉丝</h3><span>{{ followerTotal }} 人</span>
        </div>
        <div v-if="followLoading" class="state"><div class="spin"></div><div class="d">正在加载…</div></div>
        <div v-else-if="followerList.length" class="user-list">
          <div class="user-row" v-for="u in followerList" :key="u.id">
            <div class="user-av" :class="{ img: !!u.avatar }">
              <img v-if="u.avatar" :src="u.avatar" :alt="u.nickname">
              <span v-else>{{ (u.nickname || u.username || '?').charAt(0) }}</span>
            </div>
            <div class="user-tx">
              <div class="user-nm">
                {{ u.nickname || u.username }}
                <span class="tag tag-brand" v-if="u.role===1">管理员</span>
                <span class="tag" v-if="u.mutual">互相关注</span>
              </div>
              <div class="user-sub">{{ u.followerCount }} 位粉丝 · {{ fmt(u.followTime) }} 关注了你</div>
            </div>
            <div class="user-acts">
              <button class="btn btn-sm" :class="{ 'btn-primary': !u.following }"
                      :disabled="followBusy" @click="toggleRow(u, false)">
                {{ u.following ? '已回关' : '回关' }}
              </button>
              <button class="btn btn-sm" @click="openChatWith(u.id)"><ui-icon name="chat" :size="14"></ui-icon> 发消息</button>
            </div>
          </div>
        </div>
        <div v-else class="empty">
          <div class="ico"><ui-icon name="users" :size="34"></ui-icon></div><div>还没有粉丝</div>
        </div>
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
        <div v-else class="empty"><div class="ico"><ui-icon name="pin" :size="34"></ui-icon></div><div>还没有收货地址</div></div>
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
        <div v-else class="empty"><div class="ico"><ui-icon name="box" :size="34"></ui-icon></div><div>还没有订单</div>
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
        <div v-else class="empty"><div class="ico"><ui-icon name="file" :size="34"></ui-icon></div><div>还没有提交过商品申请</div></div>
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
        { k: 'info', ic: 'user', t: '个人资料' },
        { k: 'msg', ic: 'chat', t: '消息' },
        { k: 'following', ic: 'heart', t: '我的关注' },
        { k: 'followers', ic: 'users', t: '我的粉丝' },
        { k: 'addr', ic: 'pin', t: '收货地址' },
        { k: 'order', ic: 'box', t: '我的订单' },
        { k: 'publish', ic: 'bag', t: '申请发布商品' },
        { k: 'myapply', ic: 'file', t: '我的商品申请' }
      ],
      /* 关注 / 粉丝列表（P1） */
      followLoading: false, followBusy: false,
      followingList: [], followingTotal: 0,
      followerList: [], followerTotal: 0,
      /* 私信：会话列表 + 当前会话 + 消息流 */
      conversations: [], activeConv: null, messages: [],
      hasMore: false, loadingMore: false,
      chatText: '', sending: false, emojiOpen: false, wsOn: false,
      EMOJIS: ['😀', '😄', '😊', '😉', '😍', '🤔', '😅', '😭', '😡', '👍', '👏', '🙏',
               '🎉', '❤️', '🔥', '✨', '💰', '📦', '🚚', '✅', '❓', '🌹', '☕', '🐟'],
      _chatBound: null
    };
  },
  /* 头像展示源：本地预览优先；本次点了移除则回退为首字，保存后由服务端值接管。
     只影响渲染，提交逻辑仍由 avFile / avRemoved 决定。 */
  computed: {
    avSrc: function () {
      if (this.avPreview) return this.avPreview;
      if (this.avRemoved) return '';
      return (this.store.user && this.store.user.avatar) || '';
    }
  },
  mounted: function () {
    this.sync();
    this.wsOn = !!(DH.chat && DH.chat.connected());
    /* 私信推送：新消息、未读变化、重连成功都要反映到列表 */
    var self = this;
    this._chatBound = function (evt) { self.onChatEvent(evt); };
    if (DH.chat) DH.chat.on(this._chatBound);
  },
  unmounted: function () {
    if (DH.chat && this._chatBound) DH.chat.off(this._chatBound);
    this._chatBound = null;
  },
  watch: {
    /* #/user?tab=login|reg|info|addr|order 直接决定打开哪个面板 */
    'route.query.tab': { immediate: true, handler: function (v) { this.applyTab(v); } },
    'store.user': { deep: true, handler: function () { this.sync(); } }
  },
  methods: {
    applyTab: function (v) {
      if (v === 'reg') this.mode = 'reg';
      else if (v === 'login') this.mode = 'login';
      if (v === 'addr' || v === 'order' || v === 'info' || v === 'publish' || v === 'myapply'
          || v === 'following' || v === 'followers' || v === 'msg') this.tab = v;
      if (v === 'publish') SVC.loadCats().catch(function () {});
      if (v === 'myapply') this.loadMyApplies();
      if (v === 'following') this.loadFollowing();
      if (v === 'followers') this.loadFollowers();
      if (v === 'msg') this.enterMessages();
    },
    /* 进入消息页：拉会话列表，带了 to 参数则直接打开与该用户的会话 */
    enterMessages: function () {
      var self = this;
      var to = this.route.query ? this.route.query.to : null;
      this.loadConversations().then(function () {
        if (to) self.openConversationWith(to);
      });
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
    /* ---------- 关注 / 粉丝 ---------- */
    loadFollowing: function () {
      var self = this;
      this.followLoading = true;
      SVC.loadFollowing().then(function (list) {
        /* 关注列表里的每一行，我必然已关注该用户 */
        self.followingList = list.map(function (u) { u.following = true; return u; });
        self.followingTotal = self.followingList.length;
        self.followLoading = false;
      }, function (e) {
        self.followLoading = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    loadFollowers: function () {
      var self = this;
      this.followLoading = true;
      SVC.loadFollowers().then(function (list) {
        /* 粉丝列表的 mutual 等于「我是否已回关」 */
        self.followerList = list.map(function (u) { u.following = !!u.mutual; return u; });
        self.followerTotal = self.followerList.length;
        self.followLoading = false;
      }, function (e) {
        self.followLoading = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    /* inFollowingTab：在「我的关注」里取消关注后要把该行移出列表 */
    toggleRow: function (u, inFollowingTab) {
      var self = this;
      this.followBusy = true;
      SVC.toggleFollow(u).then(function (now) {
        self.followBusy = false;
        if (inFollowingTab) {
          if (!now) {
            self.followingList = self.followingList.filter(function (x) { return x.id !== u.id; });
            self.followingTotal = Math.max(0, self.followingTotal - 1);
          }
        } else {
          u.mutual = now;
        }
        SVC.loadFollowStats().catch(function () {});
      });
    },
    /* 切页签的统一入口：侧栏菜单与身份卡三格都走这里，避免只改 tab 不加载数据 */
    goTab: function (k) {
      this.tab = k;
      if (k === 'following') this.loadFollowing();
      if (k === 'followers') this.loadFollowers();
      if (k === 'msg') this.enterMessages();
      if (k === 'myapply') this.loadMyApplies();
      if (k === 'publish') SVC.loadCats().catch(function () {});
    },
    /* ---------- 私信 ---------- */
    loadConversations: function () {
      var self = this;
      return SVC.loadConversations().then(function (list) {
        self.conversations = list;
        return list;
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
        return [];
      });
    },
    /* 与某人开会话（幂等）：已存在则直接复用列表里的对象，保持选中态一致 */
    openConversationWith: function (userId) {
      var self = this;
      if (!userId) return;
      SVC.startConversation(userId).then(function (c) {
        var exists = self.conversations.filter(function (x) { return x.id === c.id; })[0];
        if (!exists) self.conversations.unshift(c);
        self.openConversation(exists || c);
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    openConversation: function (c) {
      var self = this;
      this.activeConv = c;
      this.messages = [];
      this.hasMore = false;
      this.emojiOpen = false;
      this.loadMessages(c.id).then(function (list) {
        self.hasMore = list.length >= 30;
        return SVC.markConversationRead(c.id).then(function () {
          c.unread = 0;
          self.$nextTick(self.scrollBottom);
        });
      }).catch(function () { /* 401 已统一处理 */ });
    },
    loadMessages: function (convId, beforeId) {
      var self = this;
      this.loadingMore = !!beforeId;
      return SVC.loadMessages(convId, beforeId).then(function (list) {
        if (beforeId) {
          self.messages = list.concat(self.messages);
        } else {
          self.messages = list;
          self.$nextTick(self.scrollBottom);
        }
        self.loadingMore = false;
        return list;
      }, function (e) {
        self.loadingMore = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
        return [];
      });
    },
    loadOlder: function () {
      if (!this.activeConv || !this.messages.length || this.loadingMore) return;
      var self = this;
      this.loadMessages(this.activeConv.id, this.messages[0].id).then(function (list) {
        self.hasMore = list.length >= 30;
      });
    },
    sendText: function () {
      var text = (this.chatText || '').trim();
      if (!text || !this.activeConv || this.sending) return;
      var self = this;
      this.sending = true;
      SVC.sendMessage(this.activeConv.id, { type: 1, content: text }).then(function (m) {
        self.chatText = '';
        self.sending = false;
        self.appendMessage(m);
        self.bumpConv(m);
      }, function (e) {
        self.sending = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    /* 图片消息：先走通用上传拿 URL，再作为 type=2 发送 */
    onPickChatImage: function (e) {
      var self = this;
      var file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file || !this.activeConv) return;
      var err = SVC.checkImage(file);
      if (err) return this.toast(err, '⚠️');
      this.sending = true;
      SVC.uploadImage(file).then(function (url) {
        return SVC.sendMessage(self.activeConv.id, { type: 2, content: url });
      }).then(function (m) {
        self.sending = false;
        self.appendMessage(m);
        self.bumpConv(m);
      }, function (e2) {
        self.sending = false;
        if (e2 !== U.HANDLED) self.toast(U.errMsg(e2), '⚠️');
      });
    },
    /* 图片消息加载失败：换成透明占位图，避免浏览器显示裂图图标 */
    imgBroken: function (e) {
      var img = e.target;
      img.classList.add('broken');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    },
    insertEmoji: function (e) {
      this.chatText = (this.chatText || '') + e;
    },
    /* 按 id 去重：WebSocket 推送与本地发送可能同时到达同一条消息 */
    appendMessage: function (m) {
      if (!m || !m.id) return;
      for (var i = 0; i < this.messages.length; i++) {
        if (this.messages[i].id === m.id) return;
      }
      this.messages.push(m);
      var self = this;
      this.$nextTick(function () { self.scrollBottom(); });
    },
    /* 当前会话有新消息：同步摘要并把会话提到列表顶部 */
    bumpConv: function (m) {
      var c = this.activeConv;
      if (!c || !m) return;
      c.lastContent = m.type === 2 ? '[图片]' : m.content;
      c.lastType = m.type;
      c.lastTime = m.createTime;
      c.lastSenderId = m.senderId;
      var list = this.conversations.filter(function (x) { return x.id !== c.id; });
      list.unshift(c);
      this.conversations = list;
    },
    scrollBottom: function () {
      var box = this.$refs.msgBox;
      if (box) box.scrollTop = box.scrollHeight;
    },
    /* 今天只显示时分，跨天补上日期 */
    shortTime: function (t) {
      if (!t) return '';
      var d = new Date(String(t).replace(/\//g, '-').replace(' ', 'T'));
      if (isNaN(d.getTime())) return '';
      var now = new Date();
      var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
      var sameDay = d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      return sameDay
        ? pad(d.getHours()) + ':' + pad(d.getMinutes())
        : pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    /* WebSocket 事件入口 */
    onChatEvent: function (evt) {
      if (!evt) return;
      if (evt.event === 'open') {
        this.wsOn = true;
        if (this.tab === 'msg') this.loadConversations();
        return;
      }
      if (evt.event === 'close') { this.wsOn = false; return; }
      if (evt.event === 'unread') {
        if (typeof evt.unread === 'number') this.store.unread = evt.unread;
        return;
      }
      if (evt.event !== 'message' || !evt.data) return;
      var m = evt.data;
      if (!m.mine && typeof evt.unread === 'number') this.store.unread = evt.unread;
      if (this.activeConv && m.conversationId === this.activeConv.id) {
        this.appendMessage(m);
        if (!m.mine) SVC.markConversationRead(this.activeConv.id).catch(function () {});
      }
      if (this.tab === 'msg') {
        var self = this;
        this.loadConversations().then(function () {
          if (self.activeConv) {
            var cur = self.conversations.filter(function (x) { return x.id === self.activeConv.id; })[0];
            if (cur) self.activeConv = cur;
          }
        });
      }
    },
    /* 从列表进入会话：交给消息页按 to 参数打开 */
    openChatWith: function (id) {
      if (!id) return;
      if (this.tab === 'msg') return this.openConversationWith(id);
      this.go('/user?tab=msg&to=' + id);
    },
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
