/* ==========================================================================
   chart.js — 纯手写 SVG 图表引擎（无图表库）
   命名空间：DH.chart
   约定：
     · 折线 2px 圆角连接，数据点标记 ≥8px（r≥4）并带 2px 表面色描边
     · 网格线/坐标轴一律发丝实线，不用虚线
     · Y 轴刻度只落在"整齐"的数值上（0 / 2.5万 / 50万 …）
     · 只有一个系列时不画图例；数值不止于 tooltip —— 图下有等价数据表
   ========================================================================== */
window.DH = window.DH || {};

(function (DH) {
'use strict';

/* viewBox 坐标系；模板里的 <svg viewBox="0 0 920 280"> 与本处保持一致 */
var GEOM = { left: 64, top: 20, w: 832, h: 222, vw: 920, vh: 280 };

/* Y 轴刻度只从这些"整齐"的步长里取，避免出现 3.7万 这类读数 */
var TICK_LADDER = [1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000,
  10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000, 2000000, 2500000,
  5000000, 10000000, 20000000, 25000000, 50000000, 100000000];

function niceStep(max, n) {
  if (!(max > 0)) return 1;
  var raw = max / (n || 4);
  for (var i = 0; i < TICK_LADDER.length; i++) if (TICK_LADDER[i] >= raw) return TICK_LADDER[i];
  return TICK_LADDER[TICK_LADDER.length - 1];
}

function fmtTick(v) {
  if (v >= 1e8) return (v / 1e8) + '亿';
  if (v >= 1e4) return (v / 1e4) + '万';
  return String(v);
}

/**
 * 由 [{label, v}] 生成折线/面积路径与两轴刻度。
 * 空数组安全（后端还没给数据时不会崩）。
 */
function buildTrend(points) {
  var pts = points || [];
  var P = GEOM;
  var empty = { pts: [], line: '', area: '', yTicks: [], xTicks: [], lastX: 0, lastY: 0, last: null, hitW: P.w };
  if (!pts.length) return empty;

  var max = 0, i;
  for (i = 0; i < pts.length; i++) if (Number(pts[i].v) > max) max = Number(pts[i].v);
  var step = niceStep(max, 4);
  var top = Math.ceil(max / step) * step;
  if (!(top > 0)) top = step;

  var n = pts.length;
  var out = [];
  for (i = 0; i < n; i++) {
    var x = n > 1 ? P.left + (P.w * i / (n - 1)) : P.left + P.w / 2;
    var y = P.top + P.h - (P.h * (Number(pts[i].v) || 0) / top);
    out.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      v: Number(pts[i].v) || 0,
      label: pts[i].label,
      mom: pts[i].mom
    });
  }

  var line = 'M' + out.map(function (p) { return p.x + ' ' + p.y; }).join(' L ');
  var area = line + ' L' + out[n - 1].x + ' ' + (P.top + P.h) + ' L' + out[0].x + ' ' + (P.top + P.h) + ' Z';

  var yTicks = [];
  for (var k = 0; k * step <= top + 1e-9; k++) {
    var val = k * step;
    yTicks.push({
      v: val,
      y: Math.round((P.top + P.h - (P.h * val / top)) * 10) / 10,
      label: fmtTick(val)
    });
  }

  var want = Math.min(6, n), xTicks = [];
  for (var j = 0; j < want; j++) {
    var idx = want > 1 ? Math.round(j * (n - 1) / (want - 1)) : 0;
    xTicks.push({
      i: idx,
      x: out[idx].x,
      label: pts[idx].label,
      anchor: j === 0 ? 'start' : (j === want - 1 ? 'end' : 'middle')
    });
  }

  return {
    pts: out, line: line, area: area, yTicks: yTicks, xTicks: xTicks,
    lastX: out[n - 1].x, lastY: out[n - 1].y, last: out[n - 1],
    hitW: Math.max(24, P.w / Math.max(1, n - 1))
  };
}

/* KPI 卡片里的迷你折线：返回 polyline 的 points 串与末点坐标 */
function sparkPath(vals) {
  var a = (vals || []).map(Number).filter(function (v) { return isFinite(v); });
  if (a.length < 2) return { line: '', lastX: 0, lastY: 0 };
  var max = Math.max.apply(null, a), min = Math.min.apply(null, a);
  var rng = (max - min) || 1, W = 160, H = 36, pad = 4;
  var pts = a.map(function (v, i) {
    var x = pad + (W - pad * 2) * i / (a.length - 1);
    var y = pad + (H - pad * 2) * (1 - (v - min) / rng);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  });
  return {
    line: pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' '),
    lastX: pts[pts.length - 1][0],
    lastY: pts[pts.length - 1][1]
  };
}

DH.chart = {
  GEOM: GEOM, TICK_LADDER: TICK_LADDER,
  niceStep: niceStep, fmtTick: fmtTick, buildTrend: buildTrend, sparkPath: sparkPath
};

})(window.DH);
