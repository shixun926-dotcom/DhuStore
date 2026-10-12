/* ==========================================================================
   views/admin.js — 后台管理：数据看板 / 商品管理 / 订单管理
   权限：后端 role===1 才进得来，非管理员看到提示面板。
   三个页签里只有「商品列表」用的是后端现有接口，其余（统计、管理端订单、
   发货、商品增删改）是契约接口 —— 未实现时显示说明面板，后端补齐后自动点亮。
   ========================================================================== */
window.DH = window.DH || {};
DH.views = DH.views || {};

(function (DH) {
'use strict';

var SVC = DH.services, U = DH.util, CH = DH.chart;

DH.views['admin-view'] = {
  template: `
<div>
  <!-- 权限校验：管理员 = role===1 -->
  <div v-if="!isAdmin" class="auth" style="margin-top:44px">
    <div style="font-size:44px;text-align:center">⚙️</div>
    <h2 style="margin-top:12px">后台管理</h2>
    <p class="tip">{{ store.user ? '当前账号没有后台管理权限' : '请先登录管理员账号' }}</p>
    <button v-if="store.user" class="btn btn-primary btn-block" @click="go('/')">返回首页</button>
    <template v-else>
      <button class="btn btn-lg btn-primary btn-block" @click="go('/user','tab=login')">去登录</button>
      <p style="text-align:center;font-size:12.5px;color:var(--ink-3);margin-top:14px">
        需使用 <code>role = 1</code> 的账号登录</p>
    </template>
  </div>

  <div class="admin" v-else>
    <aside class="a-side">
      <div class="brand"><span class="mark">东</span>东华后台</div>
      <a v-for="m in menus" :key="m.k" :class="{on:tab===m.k}" @click="tab=m.k">
        <span>{{ m.g }}</span>{{ m.t }}
        <b v-if="m.k==='orders' && store.pending>0" class="side-badge">{{ store.pending }}</b>
      </a>
      <div class="hint">当前登录：{{ store.user ? (store.user.nickname || store.user.username) : '—' }}<br>
        数据来自后端 <code>/api</code>，操作实时生效。</div>
    </aside>

    <div>
      <!-- ============ 数据看板 ============ -->
      <div v-if="tab==='dash'">
        <div class="bar">
          <span style="color:var(--ink-3);font-size:13px">统计范围</span>
          <button v-for="r in ranges" :key="r.v" class="pill" :class="{on:range===r.v}" @click="setRange(r.v)">{{ r.t }}</button>
          <button class="btn btn-sm" style="margin-left:auto" :disabled="statLoading" @click="loadStats">🔄 刷新</button>
        </div>

        <!-- 待处理订单提醒 -->
        <div class="todo-alert">
          <span style="font-size:20px">{{ store.pending ? '📦' : '✅' }}</span>
          <div style="flex:1;font-size:13.5px">
            <template v-if="store.pending">待处理订单：<b>{{ store.pending }}</b> 单待发货</template>
            <template v-else>当前没有待处理订单，全部订单已处理完毕</template>
          </div>
          <button class="btn btn-sm" @click="tab='orders'">查看订单 →</button>
        </div>

        <!-- 统计接口未就绪时的降级面板 -->
        <div v-if="statUnsupported" class="notice sec">
          <span class="g">📊</span>
          <div>
            <b>后端暂未提供统计接口</b>
            <p>前端已按契约实现，后端补上后本页自动生效，无需再改前端。<br>
              需要实现 <code>GET /api/admin/stats?range={{ range }}</code>，返回 kpis / trend / catShare /
              statusDist / topGoods 五部分，详见工作区 <code>接口约定.md</code>。</p>
          </div>
        </div>

        <div v-else-if="statErr" class="state card">
          <div class="ico">📡</div><div class="t">统计接口调用失败</div><div class="d">{{ statErr }}</div>
          <div class="acts"><button class="btn btn-primary" @click="loadStats">重新加载</button></div>
        </div>

        <div v-else-if="statLoading && !stat">
          <div class="kpis">
            <div class="kpi" v-for="n in 4" :key="n">
              <div class="skel" style="height:11px;width:56px"></div>
              <div class="skel" style="height:26px;margin:9px 0 6px"></div>
              <div class="skel" style="height:11px;width:104px"></div>
              <div class="skel" style="height:36px;margin-top:12px"></div>
            </div>
          </div>
          <div class="chart-card sec"><div class="skel" style="height:250px"></div></div>
        </div>

        <template v-else-if="stat">
          <!-- KPI 统计卡片 -->
          <div class="kpis">
            <div class="kpi" v-for="k in kpis" :key="k.k">
              <div class="l">{{ k.label }}</div>
              <div class="v">{{ k.value }}<span class="u" v-if="k.unit">{{ k.unit }}</span></div>
              <div class="d" :class="k.good ? 'up' : 'down'">
                {{ k.delta >= 0 ? '▲' : '▼' }} {{ Math.abs(k.delta).toFixed(1) }}%
                <small>较上一周期</small>
              </div>
              <svg class="viz spark" viewBox="0 0 160 36" preserveAspectRatio="none" style="height:36px">
                <polyline :points="k.spark" fill="none" stroke="#c3c2b7" stroke-width="2"
                          stroke-linejoin="round" stroke-linecap="round"></polyline>
                <circle :cx="k.lastX" :cy="k.lastY" r="4" :fill="k.accent" stroke="#fff" stroke-width="2"></circle>
              </svg>
            </div>
          </div>

          <!-- 销售趋势 -->
          <div class="chart-card sec" style="position:relative" v-if="trend.pts.length">
            <div class="chart-hd">
              <div>
                <h3>销售额趋势</h3>
                <div class="sb">{{ rangeText }}　·　单位：元　·　共 {{ trend.pts.length }} 个数据点</div>
              </div>
              <button class="btn btn-sm" @click="showTrendTable=!showTrendTable">
                {{ showTrendTable ? '看图表' : '看数据表' }}</button>
            </div>

            <div v-if="!showTrendTable" ref="trendWrap" style="position:relative">
              <svg class="viz" viewBox="0 0 920 280" @mouseleave="hover=-1">
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#e63946" stop-opacity=".18"></stop>
                    <stop offset="100%" stop-color="#e63946" stop-opacity="0"></stop>
                  </linearGradient>
                </defs>
                <!-- 网格线（实线细发丝线，永不使用虚线） -->
                <g>
                  <line v-for="t in trend.yTicks" :key="'g'+t.v" class="gl"
                        :x1="P.left" :x2="P.left+P.w" :y1="t.y" :y2="t.y"></line>
                </g>
                <!-- 面积 + 折线 -->
                <path :d="trend.area" fill="url(#areaFill)"></path>
                <path :d="trend.line" fill="none" stroke="#e63946" stroke-width="2"
                      stroke-linejoin="round" stroke-linecap="round"></path>
                <!-- 悬停十字线与标记点 -->
                <g v-if="hover>=0 && trend.pts[hover]">
                  <line class="ax" :x1="trend.pts[hover].x" :x2="trend.pts[hover].x"
                        :y1="P.top" :y2="P.top+P.h"></line>
                  <circle :cx="trend.pts[hover].x" :cy="trend.pts[hover].y" r="5"
                          fill="#e63946" stroke="#fff" stroke-width="2"></circle>
                </g>
                <!-- 端点直接标注 —— 全图唯一的数据点标注，其余交由坐标轴与悬停提示 -->
                <circle :cx="trend.lastX" :cy="trend.lastY" r="4.5"
                        fill="#e63946" stroke="#fff" stroke-width="2"></circle>
                <text class="lb" :x="trend.lastX - 4" :y="Math.max(P.top + 12, trend.lastY - 14)"
                      text-anchor="end">¥{{ money(trend.last.v) }}</text>
                <!-- 坐标轴 -->
                <line class="ax" :x1="P.left" :x2="P.left+P.w" :y1="P.top+P.h" :y2="P.top+P.h"></line>
                <!-- Y 轴刻度 -->
                <text v-for="t in trend.yTicks" :key="'y'+t.v" class="tk"
                      :x="P.left-10" :y="t.y+4" text-anchor="end">{{ t.label }}</text>
                <!-- X 轴刻度 -->
                <text v-for="t in trend.xTicks" :key="'x'+t.i" class="tk"
                      :x="t.x" :y="P.top+P.h+20" :text-anchor="t.anchor">{{ t.label }}</text>
                <!-- 悬停命中区 -->
                <rect v-for="(p,i) in trend.pts" :key="'h'+i" class="hit"
                      :x="p.x - trend.hitW/2" :y="P.top" :width="trend.hitW" :height="P.h"
                      @mouseenter="hover=i"></rect>
              </svg>
              <div class="tip" :class="{on:hover>=0}" :style="tipStyle" v-if="hover>=0 && trend.pts[hover]">
                <div class="k">{{ trend.pts[hover].label }}</div>
                <div>销售额 <b>¥{{ money(trend.pts[hover].v) }}</b></div>
              </div>
            </div>

            <!-- 表格视图（每个图表都有等价表格） -->
            <div v-else class="tablewrap" style="margin-top:14px;box-shadow:none;border:1px solid var(--line)">
              <div style="max-height:340px;overflow:auto">
                <table class="tbl">
                  <thead><tr><th>时间</th><th style="text-align:right">销售额（元）</th><th style="text-align:right">环比</th></tr></thead>
                  <tbody>
                    <tr v-for="(p,i) in trend.pts.slice().reverse()" :key="i">
                      <td>{{ p.label }}</td>
                      <td class="num" style="text-align:right">¥{{ money(p.v) }}</td>
                      <td class="num" style="text-align:right;color:var(--ink-3)">{{ i===0 ? '—' : p.mom }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="dash-grid sec">
            <!-- 分类销售占比 -->
            <div class="chart-card">
              <div class="chart-hd"><div><h3>分类销售占比</h3><div class="sb">{{ rangeText }}　·　按销售额排序</div></div></div>
              <div style="margin-top:18px" v-if="catShare.length">
                <div v-for="c in catShare" :key="c.id"
                     style="display:grid;grid-template-columns:74px 1fr 128px;gap:12px;align-items:center;margin-bottom:15px">
                  <span style="font-size:12.5px;color:var(--viz-ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ c.name }}</span>
                  <div style="height:14px;background:#e8f1fc;border-radius:0 4px 4px 0">
                    <div :style="{width:c.w+'%',height:'100%',background:'#2a78d6',borderRadius:'0 4px 4px 0'}"></div>
                  </div>
                  <span style="font-size:12.5px;text-align:right;font-variant-numeric:tabular-nums">
                    <b>¥{{ money(c.v) }}</b><span style="color:var(--viz-ink2)"> · {{ c.p }}%</span>
                  </span>
                </div>
              </div>
              <div v-else class="state" style="padding:36px 10px"><div class="d">暂无分类销售数据</div></div>
            </div>

            <!-- 订单状态分布 -->
            <div class="chart-card">
              <div class="chart-hd"><div><h3>订单状态分布</h3><div class="sb">共 {{ money(orderTotal) }} 笔订单</div></div></div>
              <template v-if="orderTotal > 0">
                <!-- 堆叠条：段间留 2px 表面色间隙分隔，不描边 -->
                <div style="display:flex;gap:2px;height:18px;margin:22px 0 20px">
                  <div v-for="(s,i) in orderStatus" :key="s.k"
                       :style="{width:s.p+'%',background:s.color,
                                borderRadius:(i===0?'4px 0 0 4px':(i===orderStatus.length-1?'0 4px 4px 0':'0'))}"
                       :title="s.text"></div>
                </div>
                <div style="display:grid;gap:12px">
                  <div v-for="s in orderStatus" :key="s.k" style="display:flex;align-items:center;gap:10px">
                    <span :style="{width:'10px',height:'10px',borderRadius:'3px',background:s.color,flex:'none'}"></span>
                    <span style="font-size:13px">{{ s.icon }} {{ s.text }}</span>
                    <span style="margin-left:auto;font-size:13px;color:var(--viz-ink2);font-variant-numeric:tabular-nums">
                      {{ money(s.n) }} 笔</span>
                    <b style="width:52px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums">{{ s.p }}%</b>
                  </div>
                </div>
              </template>
              <div v-else class="state" style="padding:36px 10px"><div class="d">暂无订单数据</div></div>
            </div>
          </div>

          <!-- 热销 Top5 -->
          <div class="chart-card sec">
            <div class="chart-hd"><div><h3>热销商品 Top 5</h3><div class="sb">{{ rangeText }}　·　按销售额排序</div></div></div>
            <div style="margin-top:18px" v-if="topGoods.length">
              <div v-for="g in topGoods" :key="g.rank"
                   style="display:grid;grid-template-columns:30px 200px 1fr 150px;gap:12px;align-items:center;margin-bottom:15px">
                <span style="width:22px;height:22px;border-radius:6px;display:grid;place-items:center;
                             background:#f1f3f6;font-size:12px;font-weight:700;color:var(--viz-ink2)">{{ g.rank }}</span>
                <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ g.name }}</span>
                <div style="height:14px;background:#e8f1fc;border-radius:0 4px 4px 0">
                  <div :style="{width:g.w+'%',height:'100%',background:'#2a78d6',borderRadius:'0 4px 4px 0'}"></div>
                </div>
                <span style="font-size:12.5px;text-align:right;font-variant-numeric:tabular-nums">
                  <b>¥{{ money(g.v) }}</b><span style="color:var(--viz-ink2)"> · {{ money(g.qty) }} 件</span>
                </span>
              </div>
            </div>
            <div v-else class="state" style="padding:36px 10px"><div class="d">暂无热销商品数据</div></div>
          </div>
        </template>
      </div>

      <!-- ============ 商品管理 ============ -->
      <div v-else-if="tab==='goods'" class="tablewrap">
        <div class="tbl-hd">
          <h3>商品管理</h3>
          <input class="field" style="width:200px" v-model.trim="pq" @keyup.enter="loadGoods" placeholder="搜索商品名称">
          <select class="field" style="width:150px" v-model="pcat" @change="loadGoods">
            <option value="">全部分类</option>
            <option v-for="c in store.cats" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <button class="btn" :disabled="goodsLoading" @click="loadGoods">查询</button>
          <button class="btn btn-primary" @click="openGoods()">＋ 新增商品</button>
        </div>

        <div v-if="goodsErr" class="state">
          <div class="ico">📡</div><div class="t">加载失败</div><div class="d">{{ goodsErr }}</div>
          <div class="acts"><button class="btn btn-primary" @click="loadGoods">重新加载</button></div>
        </div>

        <div v-else-if="goodsLoading" class="state"><div class="spin"></div><div class="d">正在加载商品…</div></div>

        <div v-else style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:56px">ID</th><th style="width:64px">图片</th><th>商品名称</th>
                <th style="width:110px">分类</th><th style="width:100px">售价</th>
                <th style="width:80px">库存</th><th style="width:90px">销量</th>
                <th style="width:80px">状态</th><th style="width:150px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in goods" :key="p.id">
                <td class="num" style="color:var(--ink-3)">{{ p.id }}</td>
                <td>
                  <div class="thumb mini-thumb" :style="{'--h':p.hue}">
                    <span>{{ p.emoji }}</span>
                    <img v-if="p.mainImage" :src="p.mainImage" alt="" class="gone"
                         @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
                  </div>
                </td>
                <td>
                  <div style="font-weight:500">{{ p.name }}</div>
                  <div style="font-size:12px;color:var(--ink-3);margin-top:2px">{{ p.sub }}</div>
                </td>
                <td><span class="tag">{{ catName(p.cat) }}</span></td>
                <td class="num" style="color:var(--brand);font-weight:700">¥{{ money(p.price) }}</td>
                <td class="num" :style="{color: p.stock<30 ? 'var(--crit)' : 'inherit'}">{{ p.stock }}</td>
                <td class="num">{{ money(p.sales) }}</td>
                <td>
                  <span class="tg" :style="{color: p.status===1 ? '#0a7a0a' : 'var(--crit)'}">
                    <span class="dot" :style="{background: p.status===1 ? '#0ca30c' : '#d03b3b'}"></span>
                    {{ p.status===1 ? '在售' : '下架' }}</span>
                </td>
                <td>
                  <button class="btn btn-sm" @click="openGoods(p)">编辑</button>
                  <button class="btn btn-sm btn-danger" style="margin-left:6px" @click="askDel(p)">删除</button>
                </td>
              </tr>
              <tr v-if="!goods.length">
                <td colspan="9" style="text-align:center;padding:40px;color:var(--ink-3)">
                  没有匹配的商品{{ goodsTotal ? '' : '，或后端商品表为空' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ 订单管理 ============ -->
      <div v-else class="tablewrap">
        <div class="tbl-hd">
          <h3>订单管理</h3>
          <select class="field" style="width:150px" v-model="ostatus" @change="loadAdminOrders">
            <option value="">全部状态</option>
            <option :value="0">待付款</option><option :value="1">已付款</option>
            <option :value="2">已发货</option><option :value="3">已完成</option>
            <option :value="4">已取消</option>
          </select>
          <button class="btn" :disabled="aordLoading" @click="loadAdminOrders">查询</button>
        </div>

        <div v-if="aordUnsupported" class="notice" style="margin:16px 18px">
          <span class="g">🧾</span>
          <div>
            <b>后端暂未提供管理端订单列表接口</b>
            <p>前端已按契约实现，需要 <code>GET /api/admin/orders?page=1&amp;size=20&amp;status=</code>，
              返回 <code>PageResult&lt;OrderVO&gt;</code>（全部用户的订单）。发货需要
              <code>POST /api/orders/{orderNo}/ship</code>（status 1→2）。详见 <code>接口约定.md</code>。</p>
          </div>
        </div>

        <div v-else-if="aordErr" class="state">
          <div class="ico">📡</div><div class="t">加载失败</div><div class="d">{{ aordErr }}</div>
          <div class="acts"><button class="btn btn-primary" @click="loadAdminOrders">重新加载</button></div>
        </div>

        <div v-else-if="aordLoading" class="state"><div class="spin"></div><div class="d">正在加载订单…</div></div>

        <div v-else style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:180px">订单号</th><th style="width:140px">收货人</th>
                <th>商品</th><th style="width:110px">金额</th>
                <th style="width:110px">状态</th><th style="width:160px">下单时间</th><th style="width:130px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in aorders" :key="o.id">
                <td class="num" style="font-weight:600">{{ o.orderNo }}</td>
                <td>
                  <div>{{ o.receiverName }}</div>
                  <div style="font-size:12px;color:var(--ink-3)">{{ o.receiverPhone }}</div>
                </td>
                <td>
                  <div style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px">
                    {{ o.items[0] ? o.items[0].productName : '—' }}{{ o.items.length>1 ? ' 等 ' + o.items.length + ' 件' : '' }}</div>
                  <div style="font-size:12px;color:var(--ink-3);margin-top:2px">共 {{ itemCount(o) }} 件</div>
                </td>
                <td class="num" style="color:var(--brand);font-weight:700">¥{{ money(o.totalPrice) }}</td>
                <td>
                  <span class="tg" :style="{color:status(o.status).color}">
                    <span class="dot" :style="{background:status(o.status).color}"></span>
                    {{ status(o.status).text }}</span>
                </td>
                <td class="num" style="font-size:12.5px;color:var(--ink-3)">{{ fmt(o.createTime) }}</td>
                <td>
                  <button class="btn btn-sm" v-if="o.status===1" :disabled="busy" @click="ship(o)">发货</button>
                  <span v-else style="font-size:12.5px;color:var(--ink-3)">—</span>
                </td>
              </tr>
              <tr v-if="!aorders.length">
                <td colspan="7" style="text-align:center;padding:40px;color:var(--ink-3)">没有匹配的订单</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- 商品编辑弹窗 -->
  <div class="mask" v-if="gf" @click.self="gf=null">
    <div class="modal" style="max-width:640px">
      <div class="modal-hd"><h3>{{ gf.id ? '编辑商品 #' + gf.id : '新增商品' }}</h3>
        <button class="close" @click="gf=null">✕</button></div>
      <div class="modal-bd">
        <div style="display:flex;gap:16px;margin-bottom:18px;align-items:center">
          <div class="thumb" style="width:76px;border-radius:var(--r-sm);--fs:34px" :style="{'--h':gf.hue}">
            <span>{{ gf.emoji }}</span>
            <img v-if="gf.mainImage" :src="gf.mainImage" alt="" class="gone"
                 @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
          </div>
          <div style="font-size:12.5px;color:var(--ink-3);line-height:1.8">
            图标与主色用于无图时的占位样式<br>主图填图片 URL，加载失败会自动回退到图标
          </div>
        </div>
        <div class="frow">
          <div><label class="lbl">商品名称<span class="req">*</span></label><input class="field" v-model.trim="gf.name"></div>
          <div><label class="lbl">副标题</label><input class="field" v-model.trim="gf.sub"></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">所属分类</label>
            <select class="field" v-model="gf.cat">
              <option v-for="c in store.cats" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select></div>
          <div><label class="lbl">状态</label>
            <select class="field" v-model.number="gf.status">
              <option :value="1">在售</option><option :value="0">下架</option>
            </select></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">售价（元）<span class="req">*</span></label>
            <input class="field" type="number" min="0" step="0.01" v-model.number="gf.price"></div>
          <div><label class="lbl">库存</label><input class="field" type="number" min="0" v-model.number="gf.stock"></div>
        </div>
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">销量</label><input class="field" type="number" min="0" v-model.number="gf.sales"></div>
          <div><label class="lbl">占位图标（emoji）</label><input class="field" v-model.trim="gf.emoji"></div>
        </div>
        <div style="margin-top:14px"><label class="lbl">主图 URL</label>
          <input class="field" v-model.trim="gf.mainImage" placeholder="留空则只显示占位图标"></div>
        <div style="margin-top:14px">
          <label class="lbl">占位主色相（0–360）</label>
          <input type="range" min="0" max="360" v-model.number="gf.hue" style="width:100%;accent-color:var(--brand)">
        </div>
        <div style="margin-top:14px"><label class="lbl">商品详情</label>
          <textarea class="field" rows="3" v-model.trim="gf.detail"></textarea></div>

        <div class="notice" style="margin-top:16px" v-if="goodsUnsupported">
          <span class="g">⚠️</span>
          <div>
            <b>后端暂未提供商品写接口</b>
            <p>契约接口：<code>POST /api/products</code>（新增）、<code>PUT /api/products/{id}</code>（修改）、
              <code>DELETE /api/products/{id}</code>（删除），请求体为 Product 字段。详见 <code>接口约定.md</code>。</p>
          </div>
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="gf=null">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="saveGoods">
          {{ saving ? '保存中…' : '保存商品' }}</button>
      </div>
    </div>
  </div>

  <!-- 删除确认 -->
  <div class="mask" v-if="delTarget" @click.self="delTarget=null">
    <div class="modal" style="max-width:400px">
      <div class="modal-hd"><h3>确认删除</h3><button class="close" @click="delTarget=null">✕</button></div>
      <div class="modal-bd">
        <p style="font-size:14px;line-height:1.8">
          确定要删除商品「<b>{{ delTarget.name }}</b>」吗？<br>
          <span style="color:var(--ink-3);font-size:13px">删除后该商品将从前台消失，此操作不可撤销。</span>
        </p>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="delTarget=null">取消</button>
        <button class="btn btn-primary" style="background:var(--crit);border-color:var(--crit)"
                :disabled="saving" @click="doDel">{{ saving ? '删除中…' : '确认删除' }}</button>
      </div>
    </div>
  </div>
</div>`,

  data: function () {
    return {
      tab: 'dash',
      menus: [
        { k: 'dash', g: '📊', t: '数据看板' },
        { k: 'goods', g: '📦', t: '商品管理' },
        { k: 'orders', g: '🧾', t: '订单管理' }
      ],
      ranges: [{ v: 30, t: '近 30 天' }, { v: 90, t: '近 90 天' }, { v: 365, t: '近 12 个月' }],
      range: 30,
      stat: null, statLoading: false, statErr: '', statUnsupported: false,
      showTrendTable: false, hover: -1,
      goods: [], goodsLoading: false, goodsErr: '', goodsTotal: 0, pq: '', pcat: '',
      gf: null, delTarget: null, saving: false, goodsUnsupported: false,
      aorders: [], aordLoading: false, aordErr: '', aordUnsupported: false, ostatus: ''
    };
  },
  computed: {
    /* 管理员 = role 1 */
    isAdmin: function () { return !!(this.store.user && Number(this.store.user.role) === 1); },
    P: function () { return CH.GEOM; },

    /* KPI 卡片；spark 是 12 点迷你折线，delta 直接来自后端不再前端推算 */
    kpis: function () {
      var st = this.stat;
      if (!st || !Array.isArray(st.kpis)) return [];
      var accents = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
      var units = { sales: '元', orders: '笔', avgOrder: '元', newUsers: '人' };
      return st.kpis.slice(0, 4).map(function (k, i) {
        var v = Number(k.value) || 0;
        var sp = CH.sparkPath(k.spark || []);
        var delta = Number(k.delta) || 0;
        return {
          k: k.key || ('kpi' + i),
          label: k.label || '指标',
          /* 销售额可能到百万级，用「万/亿」缩写，其余走千分位 */
          value: k.key === 'sales' && Math.abs(v) >= 1e4 ? U.compact(v) : U.money(v),
          unit: k.unit !== undefined && k.unit !== null ? k.unit : (units[k.key] || ''),
          delta: delta,
          good: delta >= 0,
          spark: sp.line,
          lastX: sp.lastX,
          lastY: sp.lastY,
          accent: accents[i % accents.length]
        };
      });
    },

    trend: function () {
      var st = this.stat;
      var src = (st && Array.isArray(st.trend)) ? st.trend : [];
      var pts = src.map(function (p) {
        return { label: p.label === undefined ? '' : p.label, v: Number(p.value !== undefined ? p.value : p.v) || 0 };
      });
      /* 环比在前端算：数据表里要显示，而契约只给点值 */
      for (var i = 0; i < pts.length; i++) {
        var prev = i > 0 ? pts[i - 1].v : null;
        pts[i].mom = (prev !== null && prev > 0)
          ? (((pts[i].v - prev) / prev * 100).toFixed(1) + '%') : '—';
      }
      return CH.buildTrend(pts);
    },

    /* 悬停提示跟随数据点；SVG 用 viewBox 缩放，所以按容器实际宽度换算 */
    tipStyle: function () {
      var h = this.hover;
      var p = (h >= 0 && this.trend.pts[h]) ? this.trend.pts[h] : null;
      if (!p) return {};
      var wrap = this.$refs.trendWrap;
      var k = wrap && wrap.clientWidth ? wrap.clientWidth / CH.GEOM.vw : 1;
      return { left: (p.x * k) + 'px', top: Math.max(30, p.y * k - 10) + 'px' };
    },

    rangeText: function () {
      return this.range === 30 ? '近 30 天' : this.range === 90 ? '近 90 天' : '近 12 个月';
    },

    catShare: function () {
      var st = this.stat;
      var arr = (st && Array.isArray(st.catShare)) ? st.catShare : [];
      var list = arr.map(function (c) {
        return {
          id: c.id !== undefined ? c.id : c.name,
          name: c.name || '未分类',
          v: Number(c.value !== undefined ? c.value : c.v) || 0
        };
      });
      var max = 0, tot = 0;
      list.forEach(function (c) { if (c.v > max) max = c.v; tot += c.v; });
      return list.map(function (c) {
        return {
          id: c.id, name: c.name, v: c.v,
          w: max > 0 ? Math.max(2, c.v / max * 100) : 0,
          p: tot > 0 ? (c.v / tot * 100).toFixed(1) : '0.0'
        };
      });
    },

    orderStatus: function () {
      var st = this.stat;
      var arr = (st && Array.isArray(st.statusDist)) ? st.statusDist : [];
      var tot = 0;
      arr.forEach(function (s) { tot += Number(s.count) || 0; });
      var out = [];
      arr.forEach(function (s) {
        var n = Number(s.count) || 0;
        if (!n) return;
        var m = DH.data.statusOf(s.status);
        out.push({
          k: s.status, n: n, text: m.text, icon: m.icon, color: m.color,
          p: tot > 0 ? +(n / tot * 100).toFixed(1) : 0
        });
      });
      return out;
    },

    orderTotal: function () {
      return this.orderStatus.reduce(function (s, x) { return s + x.n; }, 0);
    },

    topGoods: function () {
      var st = this.stat;
      var arr = (st && Array.isArray(st.topGoods)) ? st.topGoods : [];
      var list = arr.slice(0, 5).map(function (g) {
        return {
          name: g.name || '未命名',
          v: Number(g.value !== undefined ? g.value : g.v) || 0,
          qty: Number(g.count !== undefined ? g.count : g.qty) || 0
        };
      });
      var max = 0;
      list.forEach(function (g) { if (g.v > max) max = g.v; });
      return list.map(function (g, i) {
        return {
          rank: i + 1, name: g.name, v: g.v, qty: g.qty,
          w: max > 0 ? Math.max(2, g.v / max * 100) : 0
        };
      });
    }
  },
  watch: {
    tab: function (v) {
      if (v === 'goods' && !this.goods.length && !this.goodsLoading) this.loadGoods();
      if (v === 'orders' && !this.aorders.length && !this.aordLoading) this.loadAdminOrders();
    },
    /* 登录后（或换账号）自动拉统计与待处理订单数 */
    isAdmin: function (v) { if (v) { this.loadStats(); SVC.loadPending(); } }
  },
  mounted: function () { if (this.isAdmin) { this.loadStats(); SVC.loadPending(); } },
  methods: {
    setRange: function (v) {
      if (this.range === v) return;
      this.range = v;
      this.hover = -1;
      this.loadStats();
    },

    /* ---------- 数据看板：契约接口 GET /api/admin/stats ---------- */
    loadStats: function () {
      var self = this;
      if (!this.isAdmin) return;
      this.statLoading = true;
      this.statErr = '';
      this.statUnsupported = false;
      SVC.loadStats(this.range).then(function (d) {
        self.statLoading = false;
        var ok = d && (Array.isArray(d.kpis) || Array.isArray(d.trend));
        if (!ok) {
          self.stat = null;
          self.statUnsupported = true;
          return;
        }
        self.stat = d;
      }, function (e) {
        self.statLoading = false;
        self.stat = null;
        if (e === U.HANDLED) return;
        if (U.isUnsupported(e)) self.statUnsupported = true;
        else self.statErr = U.errMsg(e);
      });
    },

    /* ---------- 商品管理：GET /api/products 只读真实数据 ---------- */
    loadGoods: function () {
      var self = this;
      this.goodsLoading = true;
      this.goodsErr = '';
      SVC.loadCats().catch(function () {});
      SVC.loadProducts({ keyword: this.pq, categoryId: this.pcat, page: 1, size: 100 })
        .then(function (d) {
          self.goods = U.listOf(d).map(SVC.adapt);
          self.goodsTotal = U.totalOf(d);
          self.goodsLoading = false;
        }, function (e) {
          self.goodsLoading = false;
          if (e === U.HANDLED) return;
          self.goodsErr = U.errMsg(e);
        });
    },

    openGoods: function (p) {
      if (p) {
        this.gf = {
          id: p.id, name: p.name, sub: p.sub, cat: p.cat, price: p.price,
          stock: p.stock, sales: p.sales, status: p.status, mainImage: p.mainImage,
          detail: p.detail, emoji: p.emoji, hue: p.hue
        };
      } else {
        this.gf = U.blankProduct(this.store.cats[0]);
      }
    },

    /* ---------- 商品的增删改：契约接口，后端未实现时提示 ---------- */
    saveGoods: function () {
      var self = this, g = this.gf;
      if (!g) return;
      if (!g.name) return this.toast('请填写商品名称', '⚠️');
      if (!(Number(g.price) >= 0)) return this.toast('请填写正确的售价', '⚠️');
      this.saving = true;
      SVC.saveProduct(g).then(function () {
        self.toast(g.id ? '商品已更新' : '商品已创建', '✅');
        self.gf = null;
        self.loadGoods();
      }, function (e) {
        if (e === U.HANDLED) return;
        if (U.isUnsupported(e)) {
          self.goodsUnsupported = true;
          self.toast('后端暂未提供商品写接口', '⚠️');
        } else {
          self.toast(U.errMsg(e), '⚠️');
        }
      }).then(function () { self.saving = false; }, function () { self.saving = false; });
    },

    askDel: function (p) { this.delTarget = p; },

    doDel: function () {
      var self = this, p = this.delTarget;
      if (!p) return;
      this.saving = true;
      SVC.deleteProduct(p.id).then(function () {
        self.toast('已删除「' + p.name + '」', '🗑️');
        self.delTarget = null;
        self.loadGoods();
      }, function (e) {
        if (e === U.HANDLED) return;
        if (U.isUnsupported(e)) {
          self.goodsUnsupported = true;
          self.toast('后端暂未提供商品删除接口', '⚠️');
        } else {
          self.toast(U.errMsg(e), '⚠️');
        }
      }).then(function () { self.saving = false; }, function () { self.saving = false; });
    },

    /* ---------- 订单管理：契约接口 GET /api/admin/orders ---------- */
    loadAdminOrders: function () {
      var self = this;
      this.aordLoading = true;
      this.aordErr = '';
      this.aordUnsupported = false;
      SVC.loadAdminOrders(this.ostatus).then(function (d) {
        self.aorders = U.listOf(d);
        self.aordLoading = false;
      }, function (e) {
        self.aordLoading = false;
        if (e === U.HANDLED) return;
        if (U.isUnsupported(e)) self.aordUnsupported = true;
        else self.aordErr = U.errMsg(e);
      });
    },

    ship: function (o) {
      var self = this;
      SVC.shipOrder(o).then(function () { self.loadAdminOrders(); SVC.loadPending(); });
    }
  }
};

})(window.DH);
