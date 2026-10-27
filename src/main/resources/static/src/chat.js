/* ==========================================================================
   chat.js — 私信实时通道客户端
   · 连接 /ws/chat?token=<JWT>，只接收服务端推送（新消息、未读变化）
   · 上行发送一律走 REST，通道只发心跳，保证落库顺序
   · 断线按 1/2/4/8/15s 退避重连；页面用 pollMsg 做兜底增量
   命名空间：DH.chat
   ========================================================================== */
window.DH = window.DH || {};

(function (DH) {
'use strict';

var MAX_DELAY = 15000;
var HEARTBEAT_MS = 25000;

var handlers = [];
var socket = null;
var retry = 0;
var retryTimer = null;
var heartbeatTimer = null;
var manualClose = false;

function endpoint() {
  var token = DH.api.getToken();
  if (!token) return null;
  var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  return proto + location.host + '/ws/chat?token=' + encodeURIComponent(token);
}

function emit(evt) {
  for (var i = 0; i < handlers.length; i++) {
    try { handlers[i](evt); } catch (e) { /* 单个订阅者异常不影响其他订阅 */ }
  }
}

function connected() {
  return !!socket && socket.readyState === 1;
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(function () {
    if (connected()) {
      try { socket.send('{"event":"ping"}'); } catch (e) { /* 交由 onclose 处理重连 */ }
    }
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleRetry() {
  if (retryTimer || manualClose) return;
  var delay = Math.min(MAX_DELAY, Math.pow(2, retry) * 1000);
  retry++;
  retryTimer = setTimeout(function () {
    retryTimer = null;
    connect();
  }, delay);
}

function connect() {
  if (socket) return;
  var url = endpoint();
  if (!url) return;
  manualClose = false;

  try {
    socket = new WebSocket(url);
  } catch (e) {
    socket = null;
    scheduleRetry();
    return;
  }

  socket.onopen = function () {
    retry = 0;
    startHeartbeat();
    emit({ event: 'open' });
  };
  socket.onmessage = function (e) {
    var msg = null;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    if (msg && msg.event) emit(msg);
  };
  socket.onerror = function () { /* onclose 统一处理 */ };
  socket.onclose = function () {
    stopHeartbeat();
    socket = null;
    emit({ event: 'close' });
    scheduleRetry();
  };
}

function disconnect() {
  manualClose = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retry = 0;
  stopHeartbeat();
  if (socket) {
    try { socket.close(); } catch (e) { /* 忽略 */ }
    socket = null;
  }
}

/** 订阅推送事件：{event:'open'|'close'|'message'|'unread'|'pong', ...} */
function on(fn) {
  if (typeof fn === 'function') handlers.push(fn);
}

function off(fn) {
  for (var i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i] === fn) handlers.splice(i, 1);
  }
}

DH.chat = {
  connect: connect,
  disconnect: disconnect,
  on: on,
  off: off,
  connected: connected
};

})(window.DH);
