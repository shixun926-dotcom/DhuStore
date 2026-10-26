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
    <div style="text-align:center;color:var(--ink-3)"><ui-icon name="gear" :size="44"></ui-icon></div>
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
      <div class="brand"><img class="mark" src="/assets/img/school-logo.jpg" alt="东华大学">东华后台</div>
      <a v-for="m in menus" :key="m.k" :class="{on:tab===m.k}" @click="tab=m.k">
        <ui-icon :name="m.ic" :size="16"></ui-icon>{{ m.t }}
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
          <button class="btn btn-sm" style="margin-left:auto" :disabled="statLoading" @click="loadStats"><ui-icon name="rotate" :size="15"></ui-icon> 刷新</button>
        </div>

        <!-- 待处理订单提醒 -->
        <div class="todo-alert">
          <ui-icon :name="store.pending ? 'box' : 'check'" :size="20"></ui-icon>
          <div style="flex:1;font-size:13.5px">
            <template v-if="store.pending">待处理订单：<b>{{ store.pending }}</b> 单待发货</template>
            <template v-else>当前没有待处理订单，全部订单已处理完毕</template>
          </div>
          <button class="btn btn-sm" @click="tab='orders'">查看订单 →</button>
        </div>

        <!-- 统计接口未就绪时的降级面板 -->
        <div v-if="statUnsupported" class="notice sec">
          <span class="g"><ui-icon name="chart" :size="22"></ui-icon></span>
          <div>
            <b>后端暂未提供统计接口</b>
            <p>前端已按契约实现，后端补上后本页自动生效，无需再改前端。<br>
              需要实现 <code>GET /api/admin/stats?range={{ range }}</code>，返回 kpis / trend / catShare /
              statusDist / topGoods 五部分，详见工作区 <code>接口约定.md</code>。</p>
          </div>
        </div>

        <div v-else-if="statErr" class="state card">
          <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">统计接口调用失败</div><div class="d">{{ statErr }}</div>
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
                    <span style="font-size:13px;display:inline-flex;align-items:center;gap:5px"><ui-icon :name="s.ic" :size="14"></ui-icon>{{ s.text }}</span>
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
          <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">加载失败</div><div class="d">{{ goodsErr }}</div>
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
                    <ui-icon name="box"></ui-icon>
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
      <div v-else-if="tab==='orders'" class="tablewrap">
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
          <span class="g"><ui-icon name="receipt" :size="22"></ui-icon></span>
          <div>
            <b>后端暂未提供管理端订单列表接口</b>
            <p>前端已按契约实现，需要 <code>GET /api/admin/orders?page=1&amp;size=20&amp;status=</code>，
              返回 <code>PageResult&lt;OrderVO&gt;</code>（全部用户的订单）。发货需要
              <code>POST /api/orders/{orderNo}/ship</code>（status 1→2）。详见 <code>接口约定.md</code>。</p>
          </div>
        </div>

        <div v-else-if="aordErr" class="state">
          <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">加载失败</div><div class="d">{{ aordErr }}</div>
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

      <!-- ============ 商品发布申请 ============ -->
      <div v-else-if="tab==='apply'" class="tablewrap">
        <div class="tbl-hd">
          <h3>商品发布申请</h3>
          <select class="field" style="width:150px" v-model="aStatus" @change="loadApplies">
            <option value="">全部状态</option>
            <option value="0">待审核</option>
            <option value="1">已通过</option>
            <option value="2">已拒绝</option>
          </select>
          <button class="btn" :disabled="applyLoading" @click="loadApplies">查询</button>
        </div>

        <div v-if="applyErr" class="state">
          <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">加载失败</div><div class="d">{{ applyErr }}</div>
          <div class="acts"><button class="btn btn-primary" @click="loadApplies">重新加载</button></div>
        </div>

        <div v-else-if="applyLoading" class="state"><div class="spin"></div><div class="d">正在加载申请…</div></div>

        <div v-else style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:200px">商品</th><th style="width:100px">价格</th><th style="width:80px">库存</th>
                <th style="width:110px">分类</th><th style="width:100px">状态</th><th style="width:160px">申请时间</th><th style="width:110px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in applies" :key="a.id">
                <td style="font-weight:500">{{ a.name }}</td>
                <td class="num" style="color:var(--brand);font-weight:700">¥{{ money(a.price) }}</td>
                <td class="num">{{ a.stock }}</td>
                <td><span class="tag">{{ catName(a.categoryId) }}</span></td>
                <td><span class="tg" :style="{color:applyStatus(a.status).color}">
                  <span class="dot" :style="{background:applyStatus(a.status).color}"></span>{{ applyStatus(a.status).text }}</span></td>
                <td class="num" style="font-size:12.5px;color:var(--ink-3)">{{ fmt(a.createTime) }}</td>
                <td>
                  <button class="btn btn-sm" v-if="a.status===0" @click="openAudit(a)">审核</button>
                  <span v-else style="font-size:12.5px;color:var(--ink-3)">—</span>
                </td>
              </tr>
              <tr v-if="!applies.length">
                <td colspan="7" style="text-align:center;padding:40px;color:var(--ink-3)">暂无商品发布申请</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ 分类管理 ============ -->
      <div v-else-if="tab==='cats'" class="tablewrap">
        <div class="tbl-hd">
          <h3>分类管理</h3>
          <span class="bn-tip">图标用于首页分类卡、列表侧栏与详情面包屑；删除前会校验分类下是否还有商品</span>
          <button class="btn btn-primary" style="margin-left:auto" @click="openCat()">＋ 新增分类</button>
        </div>

        <div v-if="catErr" class="state">
          <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">分类加载失败</div><div class="d">{{ catErr }}</div>
          <div class="acts"><button class="btn btn-primary" @click="loadAdminCats">重新加载</button></div>
        </div>
        <div v-else-if="catLoading" class="state"><div class="spin"></div><div class="d">正在加载分类…</div></div>

        <div v-else style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:80px">图标</th><th>分类名称</th>
                <th style="width:100px">商品数</th><th style="width:80px">排序</th>
                <th style="width:90px">状态</th><th style="width:150px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in adminCats" :key="c.id">
                <td><cat-icon :cat="c" :size="34"></cat-icon></td>
                <td style="font-weight:500">{{ c.name }}</td>
                <td class="num">{{ c.productCount || 0 }}</td>
                <td class="num">{{ c.sort }}</td>
                <td><span class="tag">{{ c.status === 0 ? '停用' : '启用' }}</span></td>
                <td>
                  <button class="btn btn-sm" @click="openCat(c)">编辑</button>
                  <button class="btn btn-sm btn-danger" style="margin-left:6px" @click="askDelCat(c)">删除</button>
                </td>
              </tr>
              <tr v-if="!adminCats.length">
                <td colspan="6" style="text-align:center;padding:40px;color:var(--ink-3)">暂无分类</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ 首页轮播 ============ -->
      <div v-else-if="tab==='banner'" class="tablewrap">
        <div class="tbl-hd">
          <h3>轮播图</h3>
          <span class="bn-tip">最多 5 张，按上传顺序轮播；建议 1200×640（约 1.9:1），单张 ≤ 5MB</span>
          <button class="btn" style="margin-left:auto" :disabled="banLoading" @click="loadBanners">
            {{ banLoading ? '加载中…' : '刷新' }}</button>
        </div>

        <div v-if="banErr" class="state">
          <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div><div class="t">轮播图加载失败</div><div class="d">{{ banErr }}</div>
          <div class="acts"><button class="btn btn-primary" @click="loadBanners">重新加载</button></div>
        </div>

        <div v-else class="bn-grid">
          <div class="bn-slot" v-for="(s,i) in bannerSlots" :key="i">
            <div class="bn-frame" :class="{ empty:!s.imageUrl }" @click="pickBanner(i)">
              <img v-if="s.imageUrl" :src="s.imageUrl" :alt="'轮播图 '+(i+1)">
              <div v-else class="bn-empty">
                <span class="plus">＋</span>
                <small>第 {{ i+1 }} 张 · 点击上传</small>
              </div>
              <span class="bn-idx">{{ i+1 }}</span>
            </div>
            <div class="bn-ops">
              <button class="btn btn-sm" :disabled="banUploading" @click="pickBanner(i)">
                {{ s.imageUrl ? '替换' : '上传' }}</button>
              <button class="btn btn-sm btn-danger" v-if="s.id" :disabled="banUploading"
                      @click="askDelBanner(s)">删除</button>
              <span class="bn-state" v-if="banUploading && banSlot===i">处理中…</span>
            </div>
          </div>
        </div>

        <div class="tbl-hd" style="border-top:1px solid var(--line);margin-top:6px;padding-top:16px">
          <h3>促销位图片</h3>
          <span class="bn-tip">「全部商品」→ 列表页，「新人礼包」→ 注册页；未配置时沿用原渐变卡片</span>
          <button class="btn btn-primary" style="margin-left:auto"
                  :disabled="!promoDirty || !!promoUploading" @click="savePromoSettings">
            {{ promoUploading === 'save' ? '保存中…' : '保存' }}</button>
        </div>

        <div class="bn-grid">
          <div class="bn-slot" v-for="p in promoSlots" :key="p.k">
            <div class="bn-frame" :class="{ empty:!p.image }" @click="pickPromo(p.k)">
              <img v-if="p.image" :src="p.image" :alt="p.title">
              <div v-else class="bn-empty">
                <span class="plus">＋</span><small>{{ p.title }} · 点击上传</small>
              </div>
              <span class="bn-idx">{{ p.title }}</span>
            </div>
            <div class="bn-ops">
              <button class="btn btn-sm" :disabled="!!promoUploading" @click="pickPromo(p.k)">
                {{ p.image ? '替换' : '上传' }}</button>
              <button class="btn btn-sm btn-danger" v-if="p.image" :disabled="!!promoUploading"
                      @click="clearPromo(p.k)">移除</button>
              <span class="bn-state">{{ p.to }}</span>
            </div>
          </div>
        </div>

        <input type="file" ref="promoFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
               @change="onPickPromo">
        <input type="file" ref="bannerFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
               @change="onPickBanner">
      </div>

      <!-- ============ 限时秒杀 ============ -->
      <div v-else-if="tab==='flash'" class="tablewrap">
        <div class="tbl-hd">
          <h3>限时秒杀位</h3>
          <span class="bn-tip">最多 8 个；首页按顺序展示前 4 个。下架商品自动从前台隐藏，但仍留在这里供你替换</span>
          <button class="btn btn-primary" style="margin-left:auto" :disabled="fsLoading"
                  @click="openFlashPicker(null)">＋ 添加商品</button>
        </div>

        <div v-if="fsErr" class="state">
          <div class="ico"><ui-icon name="cloudOff" :size="34"></ui-icon></div>
          <div class="t">秒杀位加载失败</div><div class="d">{{ fsErr }}</div>
          <div class="acts"><button class="btn btn-primary" @click="loadFlash">重新加载</button></div>
        </div>
        <div v-else-if="fsLoading" class="state"><div class="spin"></div><div class="d">正在加载秒杀位…</div></div>

        <div v-else class="bn-grid">
          <div class="bn-slot" v-for="(f,i) in flashList" :key="f.slotId">
            <div class="bn-frame fs-thumb" style="aspect-ratio:1.25/1">
              <ui-icon name="box" :size="30"></ui-icon>
              <img v-if="f.mainImage" :src="f.mainImage" alt="" class="gone"
                   @load="$event.target.classList.remove('gone')"
                   @error="$event.target.classList.add('gone')">
              <span class="bn-idx">{{ i + 1 }}</span>
            </div>
            <div class="fs-nm">{{ f.name }}</div>
            <div class="fs-meta">¥{{ money(f.price) }}　库存 {{ f.stock }}</div>
            <div class="bn-ops">
              <button class="btn btn-sm" :disabled="fsSaving" @click="openFlashPicker(f)">替换</button>
              <button class="btn btn-sm btn-danger" :disabled="fsSaving" @click="askDelFlash(f)">移除</button>
              <span class="bn-state" v-if="f.status !== 1" style="color:var(--crit)">已下架</span>
            </div>
          </div>
          <div v-if="!flashList.length" class="fs-empty">
            还没有秒杀商品，点右上角「添加商品」开始配置
          </div>
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
        <div style="margin-top:14px">
          <label class="lbl">商品图片（1–9 张，第一张为主图）</label>
          <div class="uploader">
            <div class="up-item" v-for="(u,i) in gf.images" :key="u">
              <img :src="u" alt="">
              <span class="main-tag" v-if="i===0">主图</span>
              <button type="button" class="rm" @click="removeProductImage(i)">✕</button>
            </div>
            <div class="up-add" v-if="gf.images.length < 9" @click="$refs.goodsFile.click()">
              <div><div class="plus">＋</div>上传图片</div>
            </div>
          </div>
          <input type="file" ref="goodsFile" accept=".jpg,.jpeg,.png,.webp" multiple
                 style="display:none" @change="onPickProductImages">
          <div class="up-meta">已选择 {{ gf.images.length }}/9 张 · 单张不超过 5MB</div>
        </div>
        <div style="margin-top:14px">
          <label class="lbl">占位主色相（0–360）</label>
          <input type="range" min="0" max="360" v-model.number="gf.hue" style="width:100%;accent-color:var(--brand)">
        </div>
        <div style="margin-top:14px"><label class="lbl">商品详情</label>
          <textarea class="field" rows="3" v-model.trim="gf.detail"></textarea></div>

        <div class="notice" style="margin-top:16px" v-if="goodsUnsupported">
          <span class="g"><ui-icon name="alert" :size="20"></ui-icon></span>
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

  <!-- 商品发布申请审核弹窗 -->
  <div class="mask" v-if="audit" @click.self="audit=null">
    <div class="modal" style="max-width:520px">
      <div class="modal-hd"><h3>商品审核</h3><button class="close" @click="audit=null">✕</button></div>
      <div class="modal-bd">
        <div style="background:#fafbfc;border-radius:var(--r);padding:14px 16px;margin-bottom:16px">
          <div style="font-weight:600;font-size:15px">{{ audit.name }}</div>
          <div style="margin-top:8px;font-size:13px;color:var(--ink-2);line-height:1.9">
            分类：{{ catName(audit.categoryId) }}<br>
            价格：<b style="color:var(--brand)">¥{{ money(audit.price) }}</b>　库存：{{ audit.stock }}<br>
            <template v-if="audit.description">描述：{{ audit.description }}<br></template>
          </div>
          <div v-if="audit.images && audit.images.length" class="uploader" style="margin-top:10px">
            <div class="up-item" v-for="(u,i) in audit.images" :key="u">
              <img :src="u" alt="">
              <span class="main-tag" v-if="i===0">主图</span>
            </div>
          </div>
        </div>
        <div v-if="rejecting">
          <label class="lbl">拒绝原因<span class="req">*</span></label>
          <textarea class="field" rows="3" v-model.trim="rejectReason" placeholder="请填写拒绝原因"></textarea>
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="audit=null">取消</button>
        <button class="btn btn-danger" v-if="!rejecting" :disabled="saving" @click="rejecting=true">拒绝</button>
        <button class="btn btn-primary" :disabled="saving" @click="rejecting ? doReject() : doApprove()">
          {{ saving ? '处理中…' : (rejecting ? '确认拒绝' : '通过') }}
        </button>
      </div>
    </div>
  </div>

  <!-- 轮播图删除确认 -->
  <div class="mask" v-if="banDel" @click.self="banDel=null">
    <div class="modal" style="max-width:420px">
      <div class="modal-hd"><h3>确认删除轮播图</h3>
        <button class="close" @click="banDel=null">✕</button></div>
      <div class="modal-bd">
        <p style="font-size:14px;line-height:1.8">
          删除后该张图片不再出现在首页轮播中，剩余图片依次前移，此操作不可撤销。
        </p>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="banDel=null">取消</button>
        <button class="btn btn-primary" style="background:var(--crit);border-color:var(--crit)"
                :disabled="banUploading" @click="doDelBanner">确认删除</button>
      </div>
    </div>
  </div>

  <!-- 秒杀选品弹窗 -->
  <div class="mask" v-if="fsPick" @click.self="fsPick=null">
    <div class="modal" style="max-width:620px">
      <div class="modal-hd">
        <h3>{{ fsPickTarget ? '替换秒杀商品' : '添加秒杀商品' }}</h3>
        <button class="close" @click="fsPick=null">✕</button>
      </div>
      <div class="modal-bd">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input class="field" v-model.trim="fsKw" placeholder="搜索商品名称，留空显示最新 20 件在售商品"
                 @keyup.enter="searchFlashProducts">
          <button class="btn" :disabled="fsSearching" @click="searchFlashProducts">
            {{ fsSearching ? '搜索中…' : '搜索' }}</button>
        </div>
        <div style="max-height:360px;overflow:auto">
          <div class="fs-row" v-for="p in fsProducts" :key="p.id" @click="chooseFlashProduct(p)">
            <div class="thumb" :style="{'--h':p.hue,'--fs':'22px',width:'46px','border-radius':'8px'}">
              <ui-icon name="box"></ui-icon>
              <img v-if="p.mainImage" :src="p.mainImage" alt="" class="gone"
                   @load="$event.target.classList.remove('gone')" @error="$event.target.classList.add('gone')">
            </div>
            <div style="flex:1;min-width:0">
              <div class="fs-row-nm">{{ p.name }}</div>
              <div class="fs-meta">¥{{ money(p.price) }}　库存 {{ p.stock }}</div>
            </div>
            <span class="btn btn-sm">选择</span>
          </div>
          <div v-if="!fsProducts.length && !fsSearching" class="fs-empty">没有匹配的在售商品</div>
        </div>
      </div>
      <div class="modal-ft"><button class="btn" @click="fsPick=null">取消</button></div>
    </div>
  </div>

  <!-- 秒杀移除确认 -->
  <div class="mask" v-if="fsDel" @click.self="fsDel=null">
    <div class="modal" style="max-width:420px">
      <div class="modal-hd"><h3>移除秒杀商品</h3><button class="close" @click="fsDel=null">✕</button></div>
      <div class="modal-bd">
        <p style="font-size:14px;line-height:1.8">
          确定把「<b>{{ fsDel.name }}</b>」从首页限时秒杀移除吗？<br>
          <span style="color:var(--ink-3);font-size:13px">只移除展示位，商品本身不受影响。</span>
        </p>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="fsDel=null">取消</button>
        <button class="btn btn-primary" style="background:var(--crit);border-color:var(--crit)"
                :disabled="fsSaving" @click="doDelFlash">{{ fsSaving ? '移除中…' : '确认移除' }}</button>
      </div>
    </div>
  </div>

  <!-- 分类编辑弹窗 -->
  <div class="mask" v-if="cf" @click.self="cf=null">
    <div class="modal" style="max-width:470px">
      <div class="modal-hd"><h3>{{ cf.id ? '编辑分类 #' + cf.id : '新增分类' }}</h3>
        <button class="close" @click="cf=null">✕</button></div>
      <div class="modal-bd">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">
          <cat-icon :cat="{ icon: cf.icon, name: cf.name, emoji: '🛍️', hue: 210 }" :size="64"></cat-icon>
          <div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm" :disabled="catUploading" @click="$refs.catIconFile.click()">
                {{ cf.icon ? '更换图标' : '上传图标' }}</button>
              <button class="btn btn-sm btn-danger" v-if="cf.icon" :disabled="catUploading"
                      @click="cf.icon=''">移除</button>
            </div>
            <div class="ava-tip">建议正方形、透明底的 PNG / SVG<br>用于首页卡片兜底、列表侧栏与面包屑，按比例缩放</div>
          </div>
          <input type="file" ref="catIconFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
                 @change="onPickCatIcon">
        </div>

        <label class="lbl">品类横幅（首页分类卡）</label>
        <div class="cv-row">
          <div class="cv-prev">
            <img v-if="cf.cover" :src="cf.cover" alt="">
            <span v-else class="cv-empty">未设置封面<br>前台用分类色渐变兜底</span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;gap:8px">
              <button class="btn btn-sm" :disabled="coverUploading" @click="$refs.catCoverFile.click()">
                {{ cf.cover ? '更换横幅' : '上传横幅' }}</button>
              <button class="btn btn-sm btn-danger" v-if="cf.cover" :disabled="coverUploading"
                      @click="cf.cover=''">移除</button>
            </div>
            <div class="ava-tip">建议 16:9 横图，720×405 以上<br>前台会在底部加渐变压暗，白色分类名压在上面</div>
          </div>
          <input type="file" ref="catCoverFile" accept=".jpg,.jpeg,.png,.webp" style="display:none"
                 @change="onPickCatCover">
        </div>

        <label class="lbl">分类名称<span class="req">*</span></label>
        <input class="field" v-model.trim="cf.name" placeholder="如：手机数码">
        <div class="frow" style="margin-top:14px">
          <div><label class="lbl">排序（小的在前）</label>
            <input class="field" type="number" v-model.number="cf.sort"></div>
          <div><label class="lbl">状态</label>
            <select class="field" v-model.number="cf.status">
              <option :value="1">启用</option><option :value="0">停用</option>
            </select></div>
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="cf=null">取消</button>
        <button class="btn btn-primary" :disabled="catSaving" @click="saveCat">
          {{ catSaving ? '保存中…' : '保存' }}</button>
      </div>
    </div>
  </div>

  <!-- 分类删除确认 -->
  <div class="mask" v-if="catDel" @click.self="catDel=null">
    <div class="modal" style="max-width:430px">
      <div class="modal-hd"><h3>确认删除分类</h3>
        <button class="close" @click="catDel=null">✕</button></div>
      <div class="modal-bd">
        <p style="font-size:14px;line-height:1.8">
          确定删除分类「<b>{{ catDel.name }}</b>」吗？<br>
          <span style="color:var(--ink-3);font-size:13px">
            该分类下还有 <b>{{ catDel.productCount || 0 }}</b> 件商品；只有为 0 时才能删除，此操作不可撤销。</span>
        </p>
      </div>
      <div class="modal-ft">
        <button class="btn" @click="catDel=null">取消</button>
        <button class="btn btn-primary" style="background:var(--crit);border-color:var(--crit)"
                :disabled="catSaving" @click="doDelCat">{{ catSaving ? '删除中…' : '确认删除' }}</button>
      </div>
    </div>
  </div>
</div>`,

  data: function () {
    return {
      tab: 'dash',
      menus: [
        { k: 'dash', ic: 'chart', t: '数据看板' },
        { k: 'goods', ic: 'box', t: '商品管理' },
        { k: 'cats', ic: 'folder', t: '分类管理' },
        { k: 'orders', ic: 'receipt', t: '订单管理' },
        { k: 'apply', ic: 'file', t: '发布申请' },
        { k: 'banner', ic: 'image', t: '首页图片' },
        { k: 'flash', ic: 'bolt', t: '限时秒杀' }
      ],
      ranges: [{ v: 30, t: '近 30 天' }, { v: 90, t: '近 90 天' }, { v: 365, t: '近 12 个月' }],
      range: 30,
      stat: null, statLoading: false, statErr: '', statUnsupported: false,
      showTrendTable: false, hover: -1,
      goods: [], goodsLoading: false, goodsErr: '', goodsTotal: 0, pq: '', pcat: '',
      gf: null, delTarget: null, saving: false, goodsUnsupported: false,
      /* 分类管理 */
      adminCats: [], catLoading: false, catErr: '', cf: null,
      catSaving: false, catUploading: false, coverUploading: false, catDel: null,
      /* 限时秒杀位 */
      flashList: [], fsLoading: false, fsErr: '', fsSaving: false,
      fsPick: false, fsPickTarget: null, fsKw: '', fsProducts: [], fsSearching: false, fsDel: null,
      aorders: [], aordLoading: false, aordErr: '', aordUnsupported: false, ostatus: '',
      applies: [], applyLoading: false, applyErr: '', aStatus: '',
      /* 首页轮播 */
      banners: [], banLoading: false, banErr: '', banUploading: false, banSlot: 0, banDel: null,
      /* 首页促销位：saved 为已保存值，draft 为编辑中的值，点保存才落库 */
      promoSaved: { all: '', newUser: '' }, promoDraft: { all: '', newUser: '' },
      promoUploading: '', promoSlot: '',
      audit: null, rejecting: false, rejectReason: ''
    };
  },
  computed: {
    /* 管理员 = role 1 */
    isAdmin: function () { return !!(this.store.user && Number(this.store.user.role) === 1); },

    /* 首页轮播固定 5 个槽位：已有图按顺序填充，不足补空槽，与前台占位数一致 */
    bannerSlots: function () {
      var list = this.banners.slice(0, 5);
      for (var i = list.length; i < 5; i++) {
        list.push({ id: null, imageUrl: '', placeholder: true });
      }
      return list;
    },

    /* 促销位：两个固定槽位，图片取编辑中的草稿值 */
    promoSlots: function () {
      var draft = this.promoDraft || {};
      return DH.data.promos.map(function (p) {
        return { k: p.k, title: p.title, to: p.to, image: draft[p.k] || '' };
      });
    },
    promoDirty: function () {
      return this.promoDraft.all !== this.promoSaved.all
        || this.promoDraft.newUser !== this.promoSaved.newUser;
    },
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
      if (v === 'apply' && !this.applies.length && !this.applyLoading) this.loadApplies();
    },
    /* 登录后（或换账号）自动拉统计与待处理订单数 */
    isAdmin: function (v) { if (v) { this.loadStats(); SVC.loadPending(); } }
  },
  mounted: function () { if (this.isAdmin) { this.loadStats(); SVC.loadPending(); } },
  watch: {
    /* 切到「首页图片」页签时才拉取，避免后台首次进入多发请求 */
    tab: function (v) {
      if (v === 'banner') { this.loadBanners(); this.loadPromos(); }
      if (v === 'cats') this.loadAdminCats();
      if (v === 'flash') this.loadFlash();
    }
  },
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
          images: (p.images || []).slice(),
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
      if (!g.images || !g.images.length) return this.toast('请至少上传一张商品图片', '⚠️');
      g.mainImage = g.images[0];
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

    /* 商品图片上传（与用户发布申请同一套规则） */
    onPickProductImages: function (e) {
      var self = this, g = this.gf;
      var files = Array.prototype.slice.call(e.target.files || []);
      e.target.value = '';
      if (!g || !files.length) return;
      var remain = 9 - g.images.length;
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
          g.images = g.images.concat(urls.filter(Boolean)).slice(0, 9);
          self.saving = false;
        }, function (err) {
          self.saving = false;
          if (err !== U.HANDLED) self.toast(U.errMsg(err), '⚠️');
        });
    },
    removeProductImage: function (i) { this.gf.images.splice(i, 1); },

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
    },

    /* ---------- 商品发布申请：审核 ---------- */
    loadApplies: function () {
      var self = this;
      this.applyLoading = true;
      this.applyErr = '';
      SVC.loadCats().catch(function () {});
      SVC.loadApplies(this.aStatus).then(function (list) {
        self.applies = list;
        self.applyLoading = false;
      }, function (e) {
        self.applyLoading = false;
        if (e === U.HANDLED) return;
        self.applyErr = U.errMsg(e);
      });
    },
    openAudit: function (a) {
      this.audit = a;
      this.rejecting = false;
      this.rejectReason = '';
    },
    doApprove: function () {
      var self = this;
      this.saving = true;
      SVC.approveApply(this.audit.id).then(function () {
        self.toast('已通过并上架商品', '✅');
        self.saving = false;
        self.audit = null;
        self.loadApplies();
      }, function (e) {
        self.saving = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    doReject: function () {
      var self = this;
      if (!this.rejectReason) return this.toast('请填写拒绝原因', '⚠️');
      this.saving = true;
      SVC.rejectApply(this.audit.id, this.rejectReason).then(function () {
        self.toast('已拒绝该申请', '🚫');
        self.saving = false;
        self.audit = null;
        self.loadApplies();
      }, function (e) {
        self.saving = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    applyStatus: function (s) {
      var n = Number(s);
      if (n === 0) return { text: '待审核', color: '#eda100' };
      if (n === 1) return { text: '已通过', color: '#0ca30c' };
      if (n === 2) return { text: '已拒绝', color: '#d03b3b' };
      return { text: '未知', color: '#898781' };
    },

    /* ---------- 首页轮播：GET/POST/PUT/DELETE /api/admin/banners ---------- */
    loadBanners: function () {
      var self = this;
      if (!this.isAdmin) return;
      this.banLoading = true;
      this.banErr = '';
      SVC.loadAdminBanners().then(function (list) {
        self.banners = list;
        self.banLoading = false;
      }, function (e) {
        self.banLoading = false;
        if (e !== U.HANDLED) self.banErr = U.errMsg(e);
      });
    },
    pickBanner: function (i) {
      if (this.banUploading) return;
      this.banSlot = i;
      if (this.$refs.bannerFile) this.$refs.bannerFile.click();
    },
    /* 选图 → 传图拿到 URL → 有 id 走替换、无 id 走新增 */
    onPickBanner: function (e) {
      var self = this;
      var file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file) return;
      var err = SVC.checkImage(file);
      if (err) return this.toast(err, '⚠️');
      var slot = this.bannerSlots[this.banSlot] || {};
      this.banUploading = true;
      SVC.uploadImage(file).then(function (url) {
        return SVC.saveBanner(url, slot.id);
      }).then(function () {
        self.toast(slot.id ? '轮播图已替换' : '轮播图已上传', '✅');
        self.loadBanners();
        SVC.loadBanners().catch(function () {});
      }, function (e2) {
        if (e2 !== U.HANDLED) self.toast(U.errMsg(e2), '⚠️');
      }).then(function () {
        self.banUploading = false;
      }, function () {
        self.banUploading = false;
      });
    },
    askDelBanner: function (s) {
      if (!s || !s.id) return;
      this.banDel = s;
    },
    doDelBanner: function () {
      var self = this, s = this.banDel;
      if (!s) return;
      this.banUploading = true;
      SVC.deleteBanner(s.id).then(function () {
        self.toast('轮播图已删除', '✅');
        self.banDel = null;
        self.loadBanners();
        SVC.loadBanners().catch(function () {});
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      }).then(function () {
        self.banUploading = false;
      }, function () {
        self.banUploading = false;
      });
    },

    /* ---------- 分类管理：GET/POST/PUT/DELETE /api/admin/categories ---------- */
    loadAdminCats: function () {
      var self = this;
      this.catLoading = true;
      this.catErr = '';
      SVC.loadAdminCats().then(function (list) {
        self.adminCats = list;
        self.catLoading = false;
      }, function (e) {
        self.catLoading = false;
        if (e !== U.HANDLED) self.catErr = U.errMsg(e);
      });
    },
    openCat: function (c) {
      this.cf = c
        ? { id: c.id, name: c.name, sort: c.sort, status: Number(c.status) === 0 ? 0 : 1,
            icon: c.icon || '', cover: c.cover || '' }
        : { id: null, name: '', sort: (this.adminCats.length + 1) * 10, status: 1,
            icon: '', cover: '' };
    },
    /* 图标复用通用上传通道；拿到 URL 只写入表单，点保存才落库 */
    onPickCatIcon: function (e) {
      var self = this;
      var file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file) return;
      var err = SVC.checkImage(file);
      if (err) return this.toast(err, '⚠️');
      this.catUploading = true;
      SVC.uploadImage(file).then(function (url) {
        if (self.cf) self.cf.icon = url;
      }, function (e2) {
        self.toast(SVC.uploadMsg(e2), '⚠️');
      }).then(function () {
        self.catUploading = false;
      }, function () {
        self.catUploading = false;
      });
    },
    /* 封面复用同一上传通道；同样只写表单，点保存才落库 */
    onPickCatCover: function (e) {
      var self = this;
      var file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file) return;
      var err = SVC.checkImage(file);
      if (err) return this.toast(err, '⚠️');
      this.coverUploading = true;
      SVC.uploadImage(file).then(function (url) {
        if (self.cf) self.cf.cover = url;
      }, function (e2) {
        self.toast(SVC.uploadMsg(e2), '⚠️');
      }).then(function () {
        self.coverUploading = false;
      }, function () {
        self.coverUploading = false;
      });
    },
    saveCat: function () {
      var self = this, f = this.cf;
      if (!f) return;
      if (!f.name) return this.toast('请填写分类名称', '⚠️');
      this.catSaving = true;
      SVC.saveCategory({
        name: f.name,
        sort: Number(f.sort) || 0,
        status: Number(f.status),
        icon: f.icon || '',
        cover: f.cover || ''
      }, f.id).then(function () {
        self.toast(f.id ? '分类已更新' : '分类已创建', '✅');
        self.cf = null;
        self.loadAdminCats();
        /* 前台分类缓存一并刷新，避免首页仍是旧数据 */
        SVC.loadCats(true).catch(function () {});
      }, function (e) {
        if (e === U.HANDLED) return;
        self.toast(e.code === 2013 ? '分类名称已存在，请换一个' : U.errMsg(e), '⚠️');
      }).then(function () {
        self.catSaving = false;
      }, function () {
        self.catSaving = false;
      });
    },
    askDelCat: function (c) { this.catDel = c; },
    doDelCat: function () {
      var self = this, c = this.catDel;
      if (!c) return;
      this.catSaving = true;
      SVC.deleteCategory(c.id).then(function () {
        self.toast('分类已删除', '✅');
        self.catDel = null;
        self.loadAdminCats();
        SVC.loadCats(true).catch(function () {});
      }, function (e) {
        if (e === U.HANDLED) return;
        /* 2012：分类下还有商品，后端带回具体数量，直接展示 */
        if (e && e.code === 2012) {
          self.catDel = null;
          self.toast(e.message || '该分类下还有商品，无法删除', '⚠️');
          return;
        }
        self.toast(U.errMsg(e), '⚠️');
      }).then(function () {
        self.catSaving = false;
      }, function () {
        self.catSaving = false;
      });
    },

    /* ---------- 限时秒杀位：GET/POST/PUT/DELETE /api/admin/flash-sale ---------- */
    loadFlash: function () {
      var self = this;
      this.fsLoading = true;
      this.fsErr = '';
      SVC.loadAdminFlashSale().then(function (list) {
        self.flashList = list;
        self.fsLoading = false;
      }, function (e) {
        self.fsLoading = false;
        if (e !== U.HANDLED) self.fsErr = U.errMsg(e);
      });
    },
    openFlashPicker: function (target) {
      this.fsPickTarget = target || null;
      this.fsKw = '';
      this.fsProducts = [];
      this.fsPick = true;
      this.searchFlashProducts();
    },
    /* 只在售商品可选；关键字为空时取最新 20 件 */
    searchFlashProducts: function () {
      var self = this;
      this.fsSearching = true;
      SVC.loadProducts({ keyword: this.fsKw || '', status: 1, page: 1, size: 20 }).then(function (d) {
        self.fsSearching = false;
        self.fsProducts = U.listOf(d).map(SVC.adapt);
      }, function (e) {
        self.fsSearching = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },
    chooseFlashProduct: function (p) {
      var self = this;
      var target = this.fsPickTarget;
      this.fsSaving = true;
      var req = target ? SVC.replaceFlashSale(target.slotId, p.id) : SVC.addFlashSale(p.id);
      req.then(function () {
        self.toast(target ? '已替换为「' + p.name + '」' : '已添加「' + p.name + '」', '✅');
        self.fsSaving = false;
        self.fsPick = false;
        self.loadFlash();
      }, function (e) {
        self.fsSaving = false;
        if (e === U.HANDLED) return;
        if (e && e.code === 2014) return self.toast('该商品已在秒杀列表中', '⚠️');
        if (e && e.code === 2015) return self.toast('秒杀位最多 8 个，请先移除一个', '⚠️');
        self.toast(U.errMsg(e), '⚠️');
      });
    },
    askDelFlash: function (f) { this.fsDel = f; },
    doDelFlash: function () {
      var self = this, f = this.fsDel;
      if (!f) return;
      this.fsSaving = true;
      SVC.removeFlashSale(f.slotId).then(function () {
        self.toast('已移除', '✅');
        self.fsSaving = false;
        self.fsDel = null;
        self.loadFlash();
      }, function (e) {
        self.fsSaving = false;
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      });
    },

    /* ---------- 首页促销位：GET /api/home/promos，PUT /api/admin/home/promos ---------- */
    loadPromos: function () {
      var self = this;
      SVC.loadPromos().then(function (d) {
        self.promoSaved = { all: d.all || '', newUser: d.newUser || '' };
        self.promoDraft = { all: d.all || '', newUser: d.newUser || '' };
      }, function () {
        /* 未配置或接口异常时保持空值，页面回落到「点击上传」占位 */
      });
    },
    pickPromo: function (k) {
      if (this.promoUploading) return;
      this.promoSlot = k;
      if (this.$refs.promoFile) this.$refs.promoFile.click();
    },
    /* 选图 → 校验 → 上传 → 只写入草稿，预览即时生效，点「保存」才提交 */
    onPickPromo: function (e) {
      var self = this;
      var file = (e.target.files || [])[0];
      e.target.value = '';
      if (!file) return;
      var err = SVC.checkImage(file);
      if (err) return this.toast(err, '⚠️');
      var k = this.promoSlot;
      this.promoUploading = k;
      SVC.uploadImage(file).then(function (url) {
        self.promoDraft[k] = url;
      }, function (e2) {
        self.toast(SVC.uploadMsg(e2), '⚠️');
      }).then(function () {
        self.promoUploading = '';
      }, function () {
        self.promoUploading = '';
      });
    },
    clearPromo: function (k) { this.promoDraft[k] = ''; },
    savePromoSettings: function () {
      var self = this;
      this.promoUploading = 'save';
      SVC.savePromos({ all: this.promoDraft.all, newUser: this.promoDraft.newUser }).then(function (d) {
        self.promoSaved = { all: d.all || '', newUser: d.newUser || '' };
        self.promoDraft = { all: d.all || '', newUser: d.newUser || '' };
        self.toast('促销位已保存', '✅');
      }, function (e) {
        if (e !== U.HANDLED) self.toast(U.errMsg(e), '⚠️');
      }).then(function () {
        self.promoUploading = '';
      }, function () {
        self.promoUploading = '';
      });
    }
  }
};

})(window.DH);
